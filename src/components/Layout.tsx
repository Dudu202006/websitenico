import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './BrandLogo';
import { ThemeSwitcher } from './ThemeSwitcher';
import { roleLabels } from '../lib/api';
import type { Role } from '../types';

const navByRole: Record<Role, { to: string; label: string }[]> = {
  ADMIN: [
    { to: '/', label: 'Tableau de bord' },
    { to: '/gestion', label: 'Gestion & corrections' },
    { to: '/magasins', label: 'Magasins' },
    { to: '/utilisateurs', label: 'Utilisateurs' },
    { to: '/commandes', label: 'Commandes' },
    { to: '/catalogue', label: 'Catalogue' },
    { to: '/production/calendrier', label: 'Calendrier' },
    { to: '/production/inventaires-magasins', label: 'Inventaires magasins' },
    { to: '/production/stock', label: 'Inventaire produits finis' },
    { to: '/production/marchandises', label: 'Inventaire matières' },
    { to: '/recettes', label: 'Recettes' },
    { to: '/galerie', label: 'Galerie photos' },
  ],
  MAGASIN: [
    { to: '/', label: 'Accueil' },
    { to: '/inventaire', label: 'Inventaire' },
    { to: '/recettes', label: 'Allergènes produits' },
    { to: '/galerie', label: 'Galerie photos' },
    { to: '/commandes', label: 'Mes commandes' },
    { to: '/nouvelle-commande', label: 'Nouvelle commande' },
  ],
  PRODUCTION: [
    { to: '/', label: 'Tableau de bord' },
    { to: '/commandes', label: 'Commandes reçues' },
    { to: '/catalogue', label: 'Catalogue' },
    { to: '/recettes', label: 'Recettes' },
    { to: '/galerie', label: 'Galerie photos' },
    { to: '/production/calendrier', label: 'Calendrier' },
    { to: '/production/inventaires-magasins', label: 'Inventaires magasins' },
    { to: '/production/stock', label: 'Inventaire produits finis' },
    { to: '/production/marchandises', label: 'Inventaire matières' },
  ],
};

export function Layout() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const links = navByRole[user.role];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <BrandLogo />
          <div>
            <small>Gestion globale</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <ThemeSwitcher />
          <div className="user-card">
            <strong>{user.nom}</strong>
            <span>{roleLabels[user.role]}</span>
            {user.magasin && <small>{user.magasin.nom}</small>}
          </div>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
