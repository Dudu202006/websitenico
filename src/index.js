import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import magasinsRoutes from './routes/magasins.js';
import produitsRoutes from './routes/produits.js';
import inventaireRoutes from './routes/inventaire.js';
import commandesRoutes from './routes/commandes.js';
import stockRoutes from './routes/stock.js';
import marchandisesRoutes from './routes/marchandises.js';
import dashboardRoutes from './routes/dashboard.js';
import recettesRoutes from './routes/recettes.js';
import evenementsRoutes from './routes/evenements.js';
import usersRoutes from './routes/users.js';
import photosRoutes from './routes/photos.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');

const app = express();
const port = process.env.PORT || 3001;
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: "Le Temps d'un Délice" });
});

app.use('/api/auth', authRoutes);
app.use('/api/magasins', magasinsRoutes);
app.use('/api/produits', produitsRoutes);
app.use('/api/inventaire', inventaireRoutes);
app.use('/api/commandes', commandesRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/marchandises', marchandisesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/recettes', recettesRoutes);
app.use('/api/evenements', evenementsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/uploads', express.static(uploadsDir));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

app.listen(port, () => {
  console.log(`API Le Temps d'un Délice → http://localhost:${port}`);
});
