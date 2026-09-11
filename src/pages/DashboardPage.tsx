import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { commandesApi, dashboardApi } from '../lib/api';
import { COMMANDES_COPY } from '../lib/commandesCopy';
import { PageHeader, StatCard, StatusBadge } from '../components/UI';
import type { Commande, DashboardData } from '../types';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [mesCommandes, setMesCommandes] = useState<Commande[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        if (user?.role === 'MAGASIN') {
          const commandes = await commandesApi.list();
          setMesCommandes(commandes.slice(0, 5));
        } else {
          const data = await dashboardApi.get();
          setDashboard(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : COMMANDES_COPY.errors.load);
      }
    }

    load();
  }, [user]);

  if (user?.role === 'MAGASIN') {
    return (
      <>
        <PageHeader
          title={`Bonjour, ${user.nom}`}
          subtitle={user.magasin ? `Magasin : ${user.magasin.nom}` : undefined}
          action={
            <Link to="/nouvelle-commande" className="btn btn-primary">
              Nouvelle commande
            </Link>
          }
        />

        {error && <p className="error-text">{error}</p>}

        <section className="panel">
          <div className="panel-section-head">
            <h2>{COMMANDES_COPY.dashboard.recentMagasin}</h2>
            <Link to="/commandes" className="btn btn-secondary btn-sm">
              {COMMANDES_COPY.dashboard.seeAll}
            </Link>
          </div>
          {mesCommandes.length === 0 ? (
            <p className="muted">{COMMANDES_COPY.dashboard.emptyMagasin}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>N° commande</th>
                    <th>Date</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {mesCommandes.map((commande) => (
                    <tr
                      key={commande.id}
                      className="clickable-row"
                      onClick={() => navigate(`/commandes/${commande.id}`)}
                    >
                      <td><strong>{commande.numero}</strong></td>
                      <td>{new Date(commande.createdAt).toLocaleDateString('fr-FR')}</td>
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

  return (
    <>
      <PageHeader
        title="Tableau de bord global"
        subtitle="Vue d'ensemble des magasins, commandes et stocks"
      />

      {error && <p className="error-text">{error}</p>}

      {dashboard && (
        <>
          <div className="stats-grid">
            <StatCard label="Magasins actifs" value={dashboard.stats.magasinsActifs} />
            <StatCard
              label={COMMANDES_COPY.dashboard.pending}
              value={dashboard.stats.commandesEnAttente}
              alert={dashboard.stats.commandesEnAttente > 0}
            />
            <StatCard
              label="Alertes stock production"
              value={dashboard.stats.alertesStockProduction}
              alert={dashboard.stats.alertesStockProduction > 0}
            />
            <StatCard
              label="Alertes inventaire magasins"
              value={dashboard.stats.alertesInventaireMagasins}
              alert={dashboard.stats.alertesInventaireMagasins > 0}
            />
          </div>

          <div className="grid-2">
            <section className="panel">
              <div className="panel-section-head">
                <h2>{COMMANDES_COPY.dashboard.recentGlobal}</h2>
                <Link to="/commandes" className="btn btn-secondary btn-sm">
                  {COMMANDES_COPY.dashboard.seeAll}
                </Link>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>N° commande</th>
                      <th>Magasin</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.commandesRecentes.map((commande) => (
                      <tr
                        key={commande.id}
                        className="clickable-row"
                        onClick={() => navigate(`/commandes/${commande.id}`)}
                      >
                        <td><strong>{commande.numero}</strong></td>
                        <td>{commande.magasin?.nom}</td>
                        <td><StatusBadge statut={commande.statut} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <h2>Alertes</h2>
              <div className="alert-list">
                {dashboard.alertes.inventairesMagasins.slice(0, 5).map((item) => (
                  <div key={item.id} className="alert-item">
                    <strong>{item.produit.nom}</strong>
                    <span>{item.magasin?.nom ?? 'Magasin'} — {item.quantite} restants</span>
                  </div>
                ))}
                {dashboard.alertes.stockProduits.slice(0, 3).map((item) => (
                  <div key={item.id} className="alert-item">
                    <strong>Stock production : {item.produit.nom}</strong>
                    <span>{item.quantite} {item.produit.unite}</span>
                  </div>
                ))}
                {dashboard.alertes.stockMarchandises.slice(0, 3).map((item) => (
                  <div key={item.id} className="alert-item">
                    <strong>Matière : {item.marchandise.nom}</strong>
                    <span>{item.quantite} {item.marchandise.unite}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
