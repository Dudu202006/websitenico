import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { InventairePage } from './pages/InventairePage';
import { CommandesPage } from './pages/CommandesPage';
import { CommandeDetailPage } from './pages/CommandeDetailPage';
import { NouvelleCommandePage } from './pages/NouvelleCommandePage';
import { MagasinsPage } from './pages/MagasinsPage';
import { GestionAdminPage } from './pages/GestionAdminPage';
import { StockProductionPage } from './pages/StockProductionPage';
import { MarchandisesPage } from './pages/MarchandisesPage';
import { RecettesPage } from './pages/RecettesPage';
import { CalendrierPage } from './pages/CalendrierPage';
import { UtilisateursPage } from './pages/UtilisateursPage';
import { GaleriePage } from './pages/GaleriePage';
import { InventairesMagasinsPage } from './pages/InventairesMagasinsPage';
import { CataloguePage } from './pages/CataloguePage';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="commandes" element={<CommandesPage />} />
                <Route path="commandes/:id" element={<CommandeDetailPage />} />

                <Route element={<ProtectedRoute roles={['MAGASIN']} />}>
                  <Route path="inventaire" element={<InventairePage />} />
                  <Route path="nouvelle-commande" element={<NouvelleCommandePage />} />
                </Route>

                <Route element={<ProtectedRoute roles={['ADMIN', 'PRODUCTION', 'MAGASIN']} />}>
                  <Route path="recettes" element={<RecettesPage />} />
                </Route>

                <Route element={<ProtectedRoute roles={['ADMIN', 'PRODUCTION', 'MAGASIN']} />}>
                  <Route path="galerie" element={<GaleriePage />} />
                </Route>

                <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                  <Route path="magasins" element={<MagasinsPage />} />
                  <Route path="utilisateurs" element={<UtilisateursPage />} />
                  <Route path="gestion" element={<GestionAdminPage />} />
                </Route>

                <Route element={<ProtectedRoute roles={['ADMIN', 'PRODUCTION']} />}>
                  <Route path="catalogue" element={<CataloguePage />} />
                  <Route path="production/stock" element={<StockProductionPage />} />
                  <Route path="production/marchandises" element={<MarchandisesPage />} />
                  <Route path="production/inventaires-magasins" element={<InventairesMagasinsPage />} />
                  <Route path="production/calendrier" element={<CalendrierPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
