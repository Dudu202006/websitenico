import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { signToken } from '../lib/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { magasin: true },
  });

  if (!user) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    nom: user.nom,
    role: user.role,
    magasinId: user.magasinId,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      role: user.role,
      magasinId: user.magasinId,
      magasin: user.magasin,
    },
  });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { magasin: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  res.json({
    id: user.id,
    email: user.email,
    nom: user.nom,
    role: user.role,
    magasinId: user.magasinId,
    magasin: user.magasin,
  });
});

export default router;
