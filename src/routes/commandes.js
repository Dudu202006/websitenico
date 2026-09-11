import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

async function generateNumeroCommande() {
  const count = await prisma.commande.count();
  return `CMD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

function mapLigneCreate(ligne) {
  if (ligne.produitId) {
    return { produitId: ligne.produitId, quantite: ligne.quantite };
  }
  if (ligne.nomLibre?.trim()) {
    return { nomLibre: ligne.nomLibre.trim(), quantite: ligne.quantite };
  }
  return null;
}

function validateLignes(lignes) {
  if (!lignes?.length) return 'Ajoutez au moins un article à la commande';

  for (const ligne of lignes) {
    if (!ligne.quantite || ligne.quantite <= 0) {
      return 'Chaque article doit avoir une quantité supérieure à zéro';
    }
    if (!ligne.produitId && !ligne.nomLibre?.trim()) {
      return 'Chaque article doit être choisi dans le catalogue ou saisi manuellement';
    }
  }

  return null;
}

async function applyLivraison(tx, commande) {
  for (const ligne of commande.lignes) {
    if (!ligne.produitId) continue;

    await tx.inventaireMagasin.upsert({
      where: {
        magasinId_produitId: {
          magasinId: commande.magasinId,
          produitId: ligne.produitId,
        },
      },
      update: { quantite: { increment: ligne.quantite } },
      create: {
        magasinId: commande.magasinId,
        produitId: ligne.produitId,
        quantite: ligne.quantite,
      },
    });

    await tx.stockProductionProduit.upsert({
      where: { produitId: ligne.produitId },
      update: { quantite: { decrement: ligne.quantite } },
      create: {
        produitId: ligne.produitId,
        quantite: -ligne.quantite,
      },
    });
  }
}

async function reverseLivraison(tx, commande) {
  for (const ligne of commande.lignes) {
    if (!ligne.produitId) continue;

    await tx.inventaireMagasin.updateMany({
      where: {
        magasinId: commande.magasinId,
        produitId: ligne.produitId,
      },
      data: { quantite: { decrement: ligne.quantite } },
    });

    await tx.stockProductionProduit.upsert({
      where: { produitId: ligne.produitId },
      update: { quantite: { increment: ligne.quantite } },
      create: {
        produitId: ligne.produitId,
        quantite: ligne.quantite,
      },
    });
  }
}

router.get('/', async (req, res) => {
  const where = {
    statut: { not: 'LIVREE' },
  };

  if (req.user.role === 'MAGASIN') {
    where.magasinId = req.user.magasinId;
  } else if (req.query.magasinId) {
    where.magasinId = req.query.magasinId;
  }

  if (req.query.statut) {
    where.statut = req.query.statut;
  }

  const commandes = await prisma.commande.findMany({
    where,
    include: {
      magasin: true,
      lignes: { include: { produit: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(commandes);
});

router.get('/:id', async (req, res) => {
  const commande = await prisma.commande.findUnique({
    where: { id: req.params.id },
    include: {
      magasin: true,
      lignes: { include: { produit: true } },
    },
  });

  if (!commande) {
    return res.status(404).json({ error: 'Commande introuvable' });
  }

  if (req.user.role === 'MAGASIN' && req.user.magasinId !== commande.magasinId) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  res.json(commande);
});

router.post('/', authorize('MAGASIN', 'ADMIN'), async (req, res) => {
  const magasinId = req.user.role === 'MAGASIN' ? req.user.magasinId : req.body.magasinId;
  const { lignes, notes } = req.body;

  const lignesError = validateLignes(lignes);
  if (!magasinId || lignesError) {
    return res.status(400).json({ error: lignesError || 'Magasin et articles requis' });
  }

  const numero = await generateNumeroCommande();
  const lignesData = lignes.map(mapLigneCreate).filter(Boolean);

  const commande = await prisma.commande.create({
    data: {
      numero,
      magasinId,
      notes,
      lignes: {
        create: lignesData,
      },
    },
    include: {
      magasin: true,
      lignes: { include: { produit: true } },
    },
  });

  res.status(201).json(commande);
});

router.patch('/:id', async (req, res) => {
  const { lignes, notes } = req.body;

  const existing = await prisma.commande.findUnique({
    where: { id: req.params.id },
    include: { lignes: true },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Commande introuvable' });
  }

  if (['LIVREE', 'ANNULEE'].includes(existing.statut)) {
    return res.status(400).json({ error: 'Cette commande est clôturée et ne peut plus être modifiée' });
  }

  if (req.user.role === 'MAGASIN') {
    if (req.user.magasinId !== existing.magasinId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    if (lignes !== undefined) {
      return res.status(403).json({ error: 'Seules les annotations peuvent être modifiées' });
    }

    const commande = await prisma.commande.update({
      where: { id: existing.id },
      data: { notes },
      include: {
        magasin: true,
        lignes: { include: { produit: true } },
      },
    });

    return res.json(commande);
  }

  if (!['PRODUCTION', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  if (lignes !== undefined) {
    const lignesError = validateLignes(lignes);
    if (lignesError) {
      return res.status(400).json({ error: lignesError });
    }

    const lignesData = lignes.map(mapLigneCreate).filter(Boolean);

    const commande = await prisma.$transaction(async (tx) => {
      await tx.ligneCommande.deleteMany({ where: { commandeId: existing.id } });

      return tx.commande.update({
        where: { id: existing.id },
        data: {
          ...(notes !== undefined && { notes }),
          lignes: {
            create: lignesData,
          },
        },
        include: {
          magasin: true,
          lignes: { include: { produit: true } },
        },
      });
    });

    return res.json(commande);
  }

  if (notes === undefined) {
    return res.status(400).json({ error: 'Aucune modification à enregistrer' });
  }

  const commande = await prisma.commande.update({
    where: { id: existing.id },
    data: { notes },
    include: {
      magasin: true,
      lignes: { include: { produit: true } },
    },
  });

  res.json(commande);
});

router.patch('/:id/statut', authorize('PRODUCTION', 'ADMIN'), async (req, res) => {
  const { statut } = req.body;
  const validStatuts = ['EN_ATTENTE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE', 'ANNULEE'];

  if (!validStatuts.includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  const existing = await prisma.commande.findUnique({
    where: { id: req.params.id },
    include: { lignes: { include: { produit: true } } },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Commande introuvable' });
  }

  const commande = await prisma.$transaction(async (tx) => {
    const updated = await tx.commande.update({
      where: { id: req.params.id },
      data: { statut },
      include: {
        magasin: true,
        lignes: { include: { produit: true } },
      },
    });

    if (statut === 'LIVREE' && existing.statut !== 'LIVREE') {
      await applyLivraison(tx, updated);
    }

    if (statut === 'ANNULEE' && existing.statut === 'LIVREE') {
      await reverseLivraison(tx, updated);
    }

    return updated;
  });

  res.json(commande);
});

export default router;
