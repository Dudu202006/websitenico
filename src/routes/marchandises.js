import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorize('PRODUCTION', 'ADMIN'));

router.get('/', async (_req, res) => {
  const marchandises = await prisma.marchandise.findMany({
    where: { actif: true },
    include: { stock: true },
    orderBy: [{ categorie: 'asc' }, { nom: 'asc' }],
  });
  res.json(marchandises);
});

router.post('/', async (req, res) => {
  const { nom, description, categorie, unite, quantite, seuilAlerte } = req.body;

  if (!nom || !categorie) {
    return res.status(400).json({ error: 'Nom et catégorie requis' });
  }

  const marchandise = await prisma.marchandise.create({
    data: {
      nom,
      description,
      categorie,
      unite,
      stock: {
        create: {
          quantite: quantite ?? 0,
          seuilAlerte: seuilAlerte ?? 5,
        },
      },
    },
    include: { stock: true },
  });

  res.status(201).json(marchandise);
});

router.put('/:id', async (req, res) => {
  const { nom, description, categorie, unite, actif } = req.body;

  const marchandise = await prisma.marchandise.update({
    where: { id: req.params.id },
    data: { nom, description, categorie, unite, actif },
    include: { stock: true },
  });

  res.json(marchandise);
});

export default router;
