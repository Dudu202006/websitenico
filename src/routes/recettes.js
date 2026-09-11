import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.join(__dirname, '..', 'uploads');
const recettesDir = path.join(uploadsRoot, 'recettes');

if (!fs.existsSync(recettesDir)) {
  fs.mkdirSync(recettesDir, { recursive: true });
}

const MAX_PHOTO_SIZE = 8 * 1024 * 1024;

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, recettesDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: MAX_PHOTO_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont acceptées (JPG, PNG, WebP, GIF…)'));
    }
  },
});

const router = Router();

router.use(authenticate);

const recetteInclude = {
  ingredients: { orderBy: { nom: 'asc' } },
  partages: { include: { magasin: true } },
};

function toRecetteResponse(recette) {
  return {
    ...recette,
    photoUrl: recette.photoFilename
      ? `/api/uploads/recettes/${recette.photoFilename}`
      : null,
  };
}

function deleteRecettePhotoFile(filename) {
  if (!filename) return;
  fs.unlink(path.join(recettesDir, filename), () => {});
}

function handleMulterError(err, res) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image trop volumineuse (max 8 Mo)' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  return null;
}

function optionalPhotoUpload(req, res, next) {
  if (!req.is('multipart/form-data')) {
    return next();
  }
  return photoUpload.single('photo')(req, res, (err) => {
    const handled = handleMulterError(err, res);
    if (handled) return handled;
    next();
  });
}

function parseRecetteBody(body) {
  const parseJson = (value, fallback) => {
    if (value == null || value === '') return fallback;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  return {
    nom: body.nom,
    description: body.description,
    instructions: body.instructions,
    allergenes: parseJson(body.allergenes, []),
    portionsBase: body.portionsBase,
    unitePortion: body.unitePortion,
    ingredients: parseJson(body.ingredients, []),
    magasinIds: parseJson(body.magasinIds, []),
    removePhoto: body.removePhoto === true || body.removePhoto === 'true',
  };
}

function buildSearchFilter(q, magasinOnly = false) {
  if (!q?.trim()) return undefined;
  const query = q.trim();
  if (magasinOnly) {
    return {
      OR: [
        { nom: { contains: query, mode: 'insensitive' } },
        { allergenes: { has: query } },
      ],
    };
  }
  return {
    OR: [
      { nom: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { instructions: { contains: query, mode: 'insensitive' } },
      { ingredients: { some: { nom: { contains: query, mode: 'insensitive' } } } },
    ],
  };
}

function toMagasinView(recette) {
  return {
    id: recette.id,
    nom: recette.nom,
    allergenes: recette.allergenes,
    photoUrl: recette.photoFilename
      ? `/api/uploads/recettes/${recette.photoFilename}`
      : null,
    createdAt: recette.createdAt,
    updatedAt: recette.updatedAt,
  };
}

router.get('/', async (req, res) => {
  const isMagasin = req.user.role === 'MAGASIN';
  const search = buildSearchFilter(req.query.q, isMagasin);
  const where = {};

  if (isMagasin) {
    if (!req.user.magasinId) {
      return res.status(400).json({ error: 'Magasin non associé' });
    }
    where.partages = { some: { magasinId: req.user.magasinId } };
  }

  if (search) {
    where.AND = [search];
  }

  const recettes = await prisma.recette.findMany({
    where,
    include: isMagasin ? undefined : recetteInclude,
    orderBy: { nom: 'asc' },
  });

  res.json(isMagasin ? recettes.map(toMagasinView) : recettes.map(toRecetteResponse));
});

router.get('/:id', async (req, res) => {
  const recette = await prisma.recette.findUnique({
    where: { id: req.params.id },
    include: recetteInclude,
  });

  if (!recette) {
    return res.status(404).json({ error: 'Recette introuvable' });
  }

  if (req.user.role === 'MAGASIN') {
    const shared = recette.partages.some((p) => p.magasinId === req.user.magasinId);
    if (!shared) {
      return res.status(403).json({ error: 'Recette non partagée avec votre magasin' });
    }
    return res.json(toMagasinView(recette));
  }

  res.json(toRecetteResponse(recette));
});

function formatQty(valeur) {
  return Math.abs(valeur - Math.round(valeur)) < 0.01
    ? Math.round(valeur)
    : Math.round(valeur * 100) / 100;
}

function mapIngredient(i) {
  const nom = i.nom.trim();
  const quantiteValeur =
    i.quantiteValeur != null && i.quantiteValeur !== '' ? Number(i.quantiteValeur) : null;
  const quantiteUnite = i.quantiteUnite?.trim() || null;
  const quantite =
    quantiteValeur != null && quantiteUnite
      ? `${formatQty(quantiteValeur)} ${quantiteUnite}`
      : i.quantite?.trim() || null;

  return { nom, quantite, quantiteValeur, quantiteUnite };
}

router.post('/', authorize('PRODUCTION', 'ADMIN'), optionalPhotoUpload, async (req, res) => {
  const body = req.is('multipart/form-data') ? parseRecetteBody(req.body) : req.body;
  const {
    nom,
    description,
    instructions,
    allergenes,
    ingredients,
    magasinIds,
    portionsBase,
    unitePortion,
  } = body;

  if (!nom?.trim()) {
    if (req.file) deleteRecettePhotoFile(req.file.filename);
    return res.status(400).json({ error: 'Nom de la recette requis' });
  }

  try {
    const recette = await prisma.recette.create({
      data: {
        nom: nom.trim(),
        description: description?.trim() || null,
        instructions: instructions?.trim() || null,
        allergenes: Array.isArray(allergenes) ? allergenes : [],
        portionsBase: portionsBase > 0 ? Number(portionsBase) : 1,
        unitePortion: unitePortion?.trim() || 'personnes',
        ...(req.file && {
          photoFilename: req.file.filename,
          photoMimeType: req.file.mimetype,
        }),
        ingredients: {
          create: (ingredients ?? [])
            .filter((i) => i.nom?.trim())
            .map(mapIngredient),
        },
        partages: {
          create: (magasinIds ?? []).map((magasinId) => ({ magasinId })),
        },
      },
      include: recetteInclude,
    });

    res.status(201).json(toRecetteResponse(recette));
  } catch (err) {
    if (req.file) deleteRecettePhotoFile(req.file.filename);
    throw err;
  }
});

router.patch('/:id', authorize('PRODUCTION', 'ADMIN'), optionalPhotoUpload, async (req, res) => {
  const body = req.is('multipart/form-data') ? parseRecetteBody(req.body) : req.body;
  const {
    nom,
    description,
    instructions,
    allergenes,
    ingredients,
    magasinIds,
    portionsBase,
    unitePortion,
    removePhoto,
  } = body;

  const existing = await prisma.recette.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    if (req.file) deleteRecettePhotoFile(req.file.filename);
    return res.status(404).json({ error: 'Recette introuvable' });
  }

  const oldPhoto = existing.photoFilename;
  let newPhotoFilename = oldPhoto;
  let newPhotoMimeType = existing.photoMimeType;

  if (req.file) {
    newPhotoFilename = req.file.filename;
    newPhotoMimeType = req.file.mimetype;
  } else if (removePhoto) {
    newPhotoFilename = null;
    newPhotoMimeType = null;
  }

  try {
    const recette = await prisma.$transaction(async (tx) => {
      if (ingredients !== undefined) {
        await tx.recetteIngredient.deleteMany({ where: { recetteId: existing.id } });
      }

      if (magasinIds !== undefined) {
        await tx.recetteMagasin.deleteMany({ where: { recetteId: existing.id } });
      }

      return tx.recette.update({
        where: { id: existing.id },
        data: {
          ...(nom !== undefined && { nom: nom.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(instructions !== undefined && { instructions: instructions?.trim() || null }),
          ...(allergenes !== undefined && {
            allergenes: Array.isArray(allergenes) ? allergenes : [],
          }),
          ...(portionsBase !== undefined && {
            portionsBase: portionsBase > 0 ? Number(portionsBase) : 1,
          }),
          ...(unitePortion !== undefined && {
            unitePortion: unitePortion?.trim() || 'personnes',
          }),
          ...(req.file || removePhoto
            ? {
                photoFilename: newPhotoFilename,
                photoMimeType: newPhotoMimeType,
              }
            : {}),
          ...(ingredients !== undefined && {
            ingredients: {
              create: ingredients
                .filter((i) => i.nom?.trim())
                .map(mapIngredient),
            },
          }),
          ...(magasinIds !== undefined && {
            partages: {
              create: magasinIds.map((magasinId) => ({ magasinId })),
            },
          }),
        },
        include: recetteInclude,
      });
    });

    if (req.file && oldPhoto && oldPhoto !== req.file.filename) {
      deleteRecettePhotoFile(oldPhoto);
    } else if (removePhoto && oldPhoto) {
      deleteRecettePhotoFile(oldPhoto);
    }

    res.json(toRecetteResponse(recette));
  } catch (err) {
    if (req.file && req.file.filename !== oldPhoto) {
      deleteRecettePhotoFile(req.file.filename);
    }
    throw err;
  }
});

router.delete('/:id', authorize('PRODUCTION', 'ADMIN'), async (req, res) => {
  const existing = await prisma.recette.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Recette introuvable' });
  }

  await prisma.recette.delete({ where: { id: existing.id } });
  deleteRecettePhotoFile(existing.photoFilename);
  res.json({ success: true });
});

export default router;
