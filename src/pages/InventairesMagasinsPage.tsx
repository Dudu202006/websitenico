import { useEffect, useMemo, useState } from 'react';
import { inventaireApi, magasinsApi } from '../lib/api';
import { InventaireMagasinPanel } from '../components/InventaireMagasinPanel';
import { PageHeader } from '../components/UI';
import type { InventaireMagasin, Magasin } from '../types';

export function InventairesMagasinsPage() {
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [magasinId, setMagasinId] = useState('');
  const [inventaires, setInventaires] = useState<InventaireMagasin[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    magasinsApi
      .list()
      .then((items) => {
        setMagasins(items);
        if (items.length > 0) setMagasinId(items[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!magasinId) return;
    inventaireApi
      .list(magasinId)
      .then(setInventaires)
      .catch((err) => setError(err.message));
  }, [magasinId]);

  const selectedMagasin = magasins.find((m) => m.id === magasinId);

  const stats = useMemo(() => {
    const alertes = inventaires.filter((i) => i.quantite <= i.seuilAlerte).length;
    return { total: inventaires.length, alertes };
  }, [inventaires]);

  return (
    <>
      <PageHeader
        title="Inventaires magasins"
        subtitle="Consultez le stock disponible dans chaque point de vente pour anticiper les livraisons."
      />

      {error && <p className="error-text">{error}</p>}

      <section className="panel magasin-inventaire-overview">
        <h2>Points de vente</h2>
        <div className="magasin-inventaire-grid">
          {magasins.map((magasin) => (
            <button
              key={magasin.id}
              type="button"
              className={`magasin-inventaire-card ${magasinId === magasin.id ? 'active' : ''}`}
              onClick={() => setMagasinId(magasin.id)}
            >
              <strong>{magasin.nom}</strong>
              <span className="muted">{magasin.adresse}</span>
              <span className="magasin-inventaire-count">
                {magasin._count?.inventaires ?? 0} article{(magasin._count?.inventaires ?? 0) > 1 ? 's' : ''} suivi{(magasin._count?.inventaires ?? 0) > 1 ? 's' : ''}
              </span>
            </button>
          ))}
        </div>
      </section>

      {magasinId && selectedMagasin && (
        <>
          <div className="stats-grid magasin-inventaire-stats">
            <div className="stat-card">
              <span className="stat-label">Articles en stock</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className={`stat-card ${stats.alertes > 0 ? 'stat-card-alert' : ''}`}>
              <span className="stat-label">Stocks bas</span>
              <span className="stat-value">{stats.alertes}</span>
            </div>
            <div className="stat-card stat-card-info">
              <span className="stat-label">Magasin sélectionné</span>
              <span className="stat-value stat-value-sm">{selectedMagasin.nom}</span>
            </div>
          </div>

          <InventaireMagasinPanel
            key={magasinId}
            magasinId={magasinId}
            magasinNom={selectedMagasin.nom}
            readOnly
            showAddForm={false}
            allowRemove={false}
          />
        </>
      )}
    </>
  );
}
