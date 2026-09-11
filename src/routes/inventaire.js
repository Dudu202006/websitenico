import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

function resolveMagasinId(req) {
  if (req.user.role === 'MAGASIN') {
    return req.user.magasinId;
  }
  return req.query.magasinId || req.body.magasinId;
}

router.get('/', authorize('ADMIN', 'MAGASIN', 'PRODUCTION'), async (req, res) => {
  const magasinId = resolveMagasinId(req);

  if (!magasinId) {
    return res.status(400).json({ error: 'Magasin requis' });
  }

  if (req.user.role === 'MAGASIN' && req.user.magasinId !== magasinId) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  const inventaires = await prisma.inventaireMagasin.findMany({
    where: { magasinId },
    include: { produit: true },
    orderBy: { produit: { nom: 'asc' } },
  });

  res.json(inventaires);
});

router.post('/article', authorize('ADMIN', 'MAGASIN'), async (req, res) => {
  const magasinId = resolveMagasinId(req);
  const { nom, categorie, quantite, seuilAlerte, unite, prix } = req.body;

  if (!magasinId) {
    return res.status(400).json({ error: 'Magasin requis' });
  }

  if (req.user.role === 'MAGASIN' && req.user.magasinId !== magasinId) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  if (!nom?.trim()) {
    return res.status(400).json({ error: 'Nom de l\'article requis' });
  }

  const produit = await prisma.produit.create({
    data: {
      nom: nom.trim(),
      categorie: categorie?.trim() || 'Autre',
      prix: prix ?? 0,
      unite: unite?.trim() || 'unité',
    },
  });

  const inventaire = await prisma.inventaireMagasin.create({
    data: {
      magasinId,
      produitId: produit.id,
      quantite: quantite ?? 0,
      seuilAlerte: seuilAlerte ?? 5,
    },
    include: { produit: true },
  });

  res.status(201).json(inventaire);
});

router.put('/:produitId', authorize('ADMIN', 'MAGASIN'), async (req, res) => {
  const magasinId = resolveMagasinId(req);
  const { quantite, seuilAlerte } = req.body;

  if (!magasinId) {
    return res.status(400).json({ error: 'Magasin requis' });
  }

  if (req.user.role === 'MAGASIN' && req.user.magasinId !== magasinId) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  const inventaire = await prisma.inventaireMagasin.upsert({
    where: {
      magasinId_produitId: {
        magasinId,
        produitId: req.params.produitId,
      },
    },
    update: {
      ...(quantite != null && { quantite }),
      ...(seuilAlerte != null && { seuilAlerte }),
    },
    create: {
      magasinId,
      produitId: req.params.produitId,
      quantite: quantite ?? 0,
      seuilAlerte: seuilAlerte ?? 5,
    },
    include: { produit: true },
  });

  res.json(inventaire);
});

router.delete('/:produitId', authorize('ADMIN', 'MAGASIN'), async (req, res) => {
  const magasinId = resolveMagasinId(req);

  if (!magasinId) {
    return res.status(400).json({ error: 'Magasin requis' });
  }

  if (req.user.role === 'MAGASIN' && req.user.magasinId !== magasinId) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  const existing = await prisma.inventaireMagasin.findUnique({
    where: {
      magasinId_produitId: {
        magasinId,
        produitId: req.params.produitId,
      },
    },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Article introuvable dans cet inventaire' });
  }

  await prisma.inventaireMagasin.delete({
    where: {
      magasinId_produitId: {
        magasinId,
        produitId: req.params.produitId,
      },
    },
  });

  res.json({ success: true });
});

export default router;
