import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'PRODUCTION'));

export const COULEURS_PAR_TYPE = {
  CONGE: '#4A90D9',
  RDV: '#E67E22',
  PRODUCTION: '#8B6914',
  LIVRAISON: '#9B59B6',
  AUTRE: '#7F8C8D',
};

const TYPES_VALIDES = Object.keys(COULEURS_PAR_TYPE);

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} invalide`);
  }
  return date;
}

function normalizePayload(body) {
  const { titre, description, type, couleur, dateDebut, dateFin, jourEntier } = body;

  if (!titre?.trim()) {
    throw new Error('Le titre est requis');
  }
  if (!dateDebut || !dateFin) {
    throw new Error('Les dates de début et de fin sont requises');
  }

  const debut = parseDate(dateDebut, 'dateDebut');
  const fin = parseDate(dateFin, 'dateFin');
  if (fin < debut) {
    throw new Error('La date de fin doit être après la date de début');
  }

  const eventType = type && TYPES_VALIDES.includes(type) ? type : 'AUTRE';

  return {
    titre: titre.trim(),
    description: description?.trim() || null,
    type: eventType,
    couleur: couleur?.trim() || COULEURS_PAR_TYPE[eventType],
    dateDebut: debut,
    dateFin: fin,
    jourEntier: jourEntier !== false,
  };
}

router.get('/', async (req, res) => {
  const { from, to } = req.query;
  const where = {};

  if (from || to) {
    const debut = from ? parseDate(from, 'from') : new Date('1970-01-01');
    const fin = to ? parseDate(to, 'to') : new Date('2099-12-31');
    where.AND = [{ dateDebut: { lte: fin } }, { dateFin: { gte: debut } }];
  }

  const evenements = await prisma.evenementProduction.findMany({
    where,
    orderBy: [{ dateDebut: 'asc' }, { titre: 'asc' }],
  });

  res.json(evenements);
});

router.get('/:id', async (req, res) => {
  const evenement = await prisma.evenementProduction.findUnique({
    where: { id: req.params.id },
  });

  if (!evenement) {
    return res.status(404).json({ error: 'Événement introuvable' });
  }

  res.json(evenement);
});

router.post('/', async (req, res) => {
  try {
    const data = normalizePayload(req.body);
    const evenement = await prisma.evenementProduction.create({ data });
    res.status(201).json(evenement);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  const existing = await prisma.evenementProduction.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Événement introuvable' });
  }

  try {
    const data = normalizePayload({ ...existing, ...req.body });
    const evenement = await prisma.evenementProduction.update({
      where: { id: req.params.id },
      data,
    });
    res.json(evenement);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.evenementProduction.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Événement introuvable' });
  }

  await prisma.evenementProduction.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
