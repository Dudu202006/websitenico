import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'PRODUCTION'));

router.get('/', async (_req, res) => {
  const [
    magasinsCount,
    commandesEnAttente,
    stockProduitsBas,
    stockMarchandisesBas,
    commandesRecentes,
    alertesInventaire,
  ] = await Promise.all([
    prisma.magasin.count({ where: { actif: true } }),
    prisma.commande.count({ where: { statut: 'EN_ATTENTE' } }),
    prisma.stockProductionProduit.findMany({
      include: { produit: true },
    }),
    prisma.stockProductionMarchandise.findMany({
      include: { marchandise: true },
    }),
    prisma.commande.findMany({
      take: 5,
      where: { statut: { not: 'LIVREE' } },
      orderBy: { createdAt: 'desc' },
      include: { magasin: true },
    }),
    prisma.inventaireMagasin.findMany({
      include: { produit: true, magasin: true },
    }),
  ]);

  const produitsStockBas = stockProduitsBas.filter((s) => s.quantite <= s.seuilAlerte);
  const marchandisesStockBas = stockMarchandisesBas.filter((s) => s.quantite <= s.seuilAlerte);
  const inventairesBas = alertesInventaire.filter((i) => i.quantite <= i.seuilAlerte);

  res.json({
    stats: {
      magasinsActifs: magasinsCount,
      commandesEnAttente,
      alertesStockProduction: produitsStockBas.length + marchandisesStockBas.length,
      alertesInventaireMagasins: inventairesBas.length,
    },
    commandesRecentes,
    alertes: {
      stockProduits: produitsStockBas,
      stockMarchandises: marchandisesStockBas,
      inventairesMagasins: inventairesBas,
    },
  });
});

export default router;
