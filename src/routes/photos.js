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
const photosDir = path.join(uploadsRoot, 'photos');

if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true });
}

const CATEGORIES = ['Produits', 'Recettes', 'Magasins', 'Atelier', 'Autre'];
const MAX_SIZE = 8 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, photosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont acceptées (JPG, PNG, WebP, GIF…)'));
    }
  },
});

const router = Router();

function toPhotoResponse(photo) {
  return {
    ...photo,
    url: `/api/uploads/photos/${photo.filename}`,
  };
}

router.get('/', authenticate, async (req, res) => {
  const { categorie } = req.query;
  const where = categorie?.trim() ? { categorie: categorie.trim() } : {};

  const photos = await prisma.photo.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  res.json(photos.map(toPhotoResponse));
});

router.get('/:id', authenticate, async (req, res) => {
  const photo = await prisma.photo.findUnique({ where: { id: req.params.id } });
  if (!photo) {
    return res.status(404).json({ error: 'Photo introuvable' });
  }
  res.json(toPhotoResponse(photo));
});

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'PRODUCTION'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Image trop volumineuse (max 8 Mo)' });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier image requis' });
    }

    const titre = req.body.titre?.trim() || req.file.originalname.replace(/\.[^.]+$/, '');
    const description = req.body.description?.trim() || null;
    const categorie = CATEGORIES.includes(req.body.categorie) ? req.body.categorie : 'Autre';

    try {
      const photo = await prisma.photo.create({
        data: {
          titre,
          description,
          categorie,
          filename: req.file.filename,
          mimeType: req.file.mimetype,
          taille: req.file.size,
        },
      });
      res.status(201).json(toPhotoResponse(photo));
    } catch (err) {
      fs.unlink(req.file.path, () => {});
      throw err;
    }
  },
);

router.patch('/:id', authenticate, authorize('ADMIN', 'PRODUCTION'), async (req, res) => {
  const existing = await prisma.photo.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Photo introuvable' });
  }

  const titre = req.body.titre?.trim();
  const description = req.body.description !== undefined ? req.body.description?.trim() || null : undefined;
  const categorie = req.body.categorie;

  if (categorie && !CATEGORIES.includes(categorie)) {
    return res.status(400).json({ error: 'Catégorie invalide' });
  }

  const photo = await prisma.photo.update({
    where: { id: existing.id },
    data: {
      ...(titre && { titre }),
      ...(description !== undefined && { description }),
      ...(categorie && { categorie }),
    },
  });

  res.json(toPhotoResponse(photo));
});

router.delete('/:id', authenticate, authorize('ADMIN', 'PRODUCTION'), async (req, res) => {
  const existing = await prisma.photo.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Photo introuvable' });
  }

  const filePath = path.join(photosDir, existing.filename);
  await prisma.photo.delete({ where: { id: existing.id } });

  fs.unlink(filePath, () => {});
  res.json({ success: true });
});

export default router;
