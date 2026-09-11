import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  {
    title: 'Magasins',
    description: 'Inventaire local, commandes vers la production et suivi des stocks en boutique.',
  },
  {
    title: 'Production',
    description: 'Réception des commandes, gestion des stocks produits finis et matières premières.',
  },
  {
    title: 'Recettes & allergènes',
    description: 'Fiches techniques, calcul des quantités et communication des allergènes aux magasins.',
  },
  {
    title: 'Calendrier atelier',
    description: 'Planification des congés, rendez-vous, productions et livraisons.',
  },
];

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <aside className="login-brand-panel">
        <div className="login-brand-inner">
          <BrandLogo size="large" />
          <p className="login-brand-kicker">Boulangerie multi-sites · Huy</p>
          <h1>Le Temps d&apos;un Délice</h1>
          <p className="login-brand-lead">
            Plateforme centralisée pour piloter vos magasins, votre atelier de production
            et la circulation des commandes entre les points de vente.
          </p>

          <ul className="login-features">
            {FEATURES.map((feature) => (
              <li key={feature.title}>
                <span className="login-feature-marker" aria-hidden="true" />
                <span>
                  <strong>{feature.title}</strong>
                  <small>{feature.description}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <div className="login-form-head">
            <h2>Connexion</h2>
            <p>
              Identifiez-vous avec l&apos;adresse e-mail et le mot de passe fournis par
              votre administrateur.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <label>
              Adresse e-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@delice.fr"
                autoComplete="email"
                required
              />
            </label>

            <label>
              Mot de passe
              <div className="login-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </label>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
              {loading ? 'Connexion en cours…' : 'Accéder à la plateforme'}
            </button>
          </form>

          <footer className="login-footer">
            <ThemeSwitcher compact />
            <small>Le Temps d&apos;un Délice — Gestion interne</small>
          </footer>
        </div>
      </main>
    </div>
  );
}
