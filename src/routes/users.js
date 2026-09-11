import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

const userSelect = {
  id: true,
  email: true,
  nom: true,
  role: true,
  magasinId: true,
  magasin: true,
  createdAt: true,
  updatedAt: true,
};

const ROLES = ['ADMIN', 'MAGASIN', 'PRODUCTION'];

function normalizeEmail(email) {
  return email?.trim().toLowerCase();
}

async function validatePayload(body, { isCreate = false, userId = null } = {}) {
  const email = normalizeEmail(body.email);
  const nom = body.nom?.trim();
  const role = body.role;
  const magasinId = body.magasinId || null;
  const password = body.password;

  if (!email || !nom) {
    throw new Error('Email et nom requis');
  }

  if (!ROLES.includes(role)) {
    throw new Error('Rôle invalide');
  }

  if (role === 'MAGASIN' && !magasinId) {
    throw new Error('Un magasin est requis pour le rôle Magasin');
  }

  if (role !== 'MAGASIN' && magasinId) {
    throw new Error('Seuls les comptes Magasin peuvent être rattachés à un point de vente');
  }

  if (isCreate && (!password || password.length < 6)) {
    throw new Error('Mot de passe requis (6 caractères minimum)');
  }

  if (!isCreate && password != null && password !== '' && password.length < 6) {
    throw new Error('Le mot de passe doit contenir au moins 6 caractères');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) {
    throw new Error('Cet email est déjà utilisé');
  }

  if (magasinId) {
    const magasin = await prisma.magasin.findUnique({ where: { id: magasinId } });
    if (!magasin) {
      throw new Error('Magasin introuvable');
    }
  }

  return { email, nom, role, magasinId: role === 'MAGASIN' ? magasinId : null, password };
}

router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: userSelect,
    orderBy: [{ role: 'asc' }, { nom: 'asc' }],
  });
  res.json(users);
});

router.post('/', async (req, res) => {
  try {
    const data = await validatePayload(req.body, { isCreate: true });
    const hashed = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        nom: data.nom,
        role: data.role,
        magasinId: data.magasinId,
        password: hashed,
      },
      select: userSelect,
    });

    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  try {
    const data = await validatePayload(
      { ...existing, ...req.body },
      { isCreate: false, userId: existing.id },
    );

    const updateData = {
      email: data.email,
      nom: data.nom,
      role: data.role,
      magasinId: data.magasinId,
    };

    if (req.body.password?.trim()) {
      updateData.password = await bcrypt.hash(req.body.password.trim(), 10);
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: updateData,
      select: userSelect,
    });

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }

  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  if (existing.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur' });
    }
  }

  await prisma.user.delete({ where: { id: existing.id } });
  res.json({ success: true });
});

export default router;
