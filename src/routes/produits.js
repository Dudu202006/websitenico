import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', async (_req, res) => {
  const produits = await prisma.produit.findMany({
    where: { actif: true },
    orderBy: [{ categorie: 'asc' }, { nom: 'asc' }],
  });
  res.json(produits);
});

router.post('/', authorize('ADMIN', 'PRODUCTION'), async (req, res) => {
  const { nom, description, categorie, prix, unite } = req.body;

  if (!nom?.trim() || !categorie?.trim() || prix == null) {
    return res.status(400).json({ error: 'Nom, catégorie et prix requis' });
  }

  const produit = await prisma.produit.create({
    data: {
      nom: nom.trim(),
      description: description?.trim() || null,
      categorie: categorie.trim(),
      prix: Number(prix),
      unite: unite?.trim() || 'pièce',
    },
  });

  await prisma.stockProductionProduit.create({
    data: { produitId: produit.id },
  });

  res.status(201).json(produit);
});

router.patch('/:id', authorize('ADMIN', 'PRODUCTION'), async (req, res) => {
  const { nom, description, categorie, prix, unite } = req.body;

  const existing = await prisma.produit.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Produit introuvable' });
  }

  if (nom !== undefined && !nom?.trim()) {
    return res.status(400).json({ error: 'Le nom du produit est requis' });
  }
  if (categorie !== undefined && !categorie?.trim()) {
    return res.status(400).json({ error: 'La catégorie est requise' });
  }
  if (prix !== undefined && (Number.isNaN(Number(prix)) || Number(prix) < 0)) {
    return res.status(400).json({ error: 'Le prix doit être un nombre positif' });
  }

  const produit = await prisma.produit.update({
    where: { id: existing.id },
    data: {
      ...(nom !== undefined && { nom: nom.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(categorie !== undefined && { categorie: categorie.trim() }),
      ...(prix !== undefined && { prix: Number(prix) }),
      ...(unite !== undefined && { unite: unite?.trim() || 'pièce' }),
    },
  });

  res.json(produit);
});

router.delete('/:id', authorize('ADMIN', 'PRODUCTION'), async (req, res) => {
  const existing = await prisma.produit.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Produit introuvable' });
  }

  await prisma.produit.update({
    where: { id: existing.id },
    data: { actif: false },
  });

  res.json({ success: true });
});

export default router;
