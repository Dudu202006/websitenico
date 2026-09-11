import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { commandesApi } from '../lib/api';
import {
  COMMANDES_COPY,
  libelleRoleCommandes,
  messageListeVide,
  resumeCommande,
  sousTitreRoleCommandes,
} from '../lib/commandesCopy';
import { PageHeader, StatusBadge } from '../components/UI';
import type { Commande } from '../types';

export function CommandesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    commandesApi
      .list()
      .then(setCommandes)
      .catch((err) => setError(err.message));
  }, []);

  const copy = COMMANDES_COPY.list;

  return (
    <>
      <PageHeader
        title={libelleRoleCommandes(user?.role)}
        subtitle={sousTitreRoleCommandes(user?.role)}
        action={
          user?.role === 'MAGASIN' ? (
            <Link to="/nouvelle-commande" className="btn btn-primary">
              Nouvelle commande
            </Link>
          ) : undefined
        }
      />

      {error && <p className="error-text">{error}</p>}

      <section className="panel">
        {commandes.length === 0 ? (
          <div className="commandes-empty">
            <p className="muted">{messageListeVide(user?.role)}</p>
            {user?.role === 'MAGASIN' && (
              <Link to="/nouvelle-commande" className="btn btn-primary">
                Nouvelle commande
              </Link>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{copy.columns.numero}</th>
                  {user?.role !== 'MAGASIN' && <th>{copy.columns.magasin}</th>}
                  <th>{copy.columns.date}</th>
                  <th>{copy.columns.articles}</th>
                  <th>{copy.columns.annotations}</th>
                  <th>{copy.columns.statut}</th>
                </tr>
              </thead>
              <tbody>
                {commandes.map((commande) => (
                  <tr
                    key={commande.id}
                    className="clickable-row"
                    onClick={() => navigate(`/commandes/${commande.id}`)}
                  >
                    <td><strong>{commande.numero}</strong></td>
                    {user?.role !== 'MAGASIN' && <td>{commande.magasin?.nom}</td>}
                    <td>{new Date(commande.createdAt).toLocaleString('fr-FR')}</td>
                    <td className="commande-resume-cell">
                      <span className="commande-resume-count">
                        {commande.lignes.length} article{commande.lignes.length > 1 ? 's' : ''}
                      </span>
                      <span className="commande-resume-detail muted">
                        {resumeCommande(commande.lignes)}
                      </span>
                    </td>
                    <td>
                      {commande.notes
                        ? `${commande.notes.slice(0, 48)}${commande.notes.length > 48 ? '…' : ''}`
                        : '—'}
                    </td>
                    <td><StatusBadge statut={commande.statut} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
