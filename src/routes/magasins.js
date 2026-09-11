import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'PRODUCTION'), async (_req, res) => {
  const magasins = await prisma.magasin.findMany({
    include: {
      _count: { select: { commandes: true, inventaires: true } },
    },
    orderBy: { nom: 'asc' },
  });
  res.json(magasins);
});

router.get('/:id', authorize('ADMIN', 'PRODUCTION', 'MAGASIN'), async (req, res) => {
  const magasin = await prisma.magasin.findUnique({
    where: { id: req.params.id },
    include: {
      inventaires: { include: { produit: true } },
      commandes: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { lignes: { include: { produit: true } } },
      },
    },
  });

  if (!magasin) {
    return res.status(404).json({ error: 'Magasin introuvable' });
  }

  if (req.user.role === 'MAGASIN' && req.user.magasinId !== magasin.id) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  res.json(magasin);
});

router.post('/', authorize('ADMIN'), async (req, res) => {
  const { nom, adresse, telephone } = req.body;

  if (!nom || !adresse) {
    return res.status(400).json({ error: 'Nom et adresse requis' });
  }

  const magasin = await prisma.magasin.create({
    data: { nom, adresse, telephone },
  });

  res.status(201).json(magasin);
});

export default router;
