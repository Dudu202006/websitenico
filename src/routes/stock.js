import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorize('PRODUCTION', 'ADMIN'));

router.get('/produits', async (_req, res) => {
  const stock = await prisma.stockProductionProduit.findMany({
    include: { produit: true },
    orderBy: { produit: { nom: 'asc' } },
  });
  res.json(stock);
});

router.put('/produits/:produitId', async (req, res) => {
  const { quantite, seuilAlerte } = req.body;

  const stock = await prisma.stockProductionProduit.update({
    where: { produitId: req.params.produitId },
    data: {
      ...(quantite != null && { quantite }),
      ...(seuilAlerte != null && { seuilAlerte }),
    },
    include: { produit: true },
  });

  res.json(stock);
});

router.get('/marchandises', async (_req, res) => {
  const stock = await prisma.stockProductionMarchandise.findMany({
    include: { marchandise: true },
    orderBy: { marchandise: { nom: 'asc' } },
  });
  res.json(stock);
});

router.put('/marchandises/:marchandiseId', async (req, res) => {
  const { quantite, seuilAlerte } = req.body;

  const stock = await prisma.stockProductionMarchandise.update({
    where: { marchandiseId: req.params.marchandiseId },
    data: {
      ...(quantite != null && { quantite }),
      ...(seuilAlerte != null && { seuilAlerte }),
    },
    include: { marchandise: true },
  });

  res.json(stock);
});

export default router;
