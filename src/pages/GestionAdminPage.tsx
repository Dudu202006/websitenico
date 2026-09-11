import { useEffect, useState } from 'react';
import { magasinsApi } from '../lib/api';
import { InventaireMagasinPanel } from '../components/InventaireMagasinPanel';
import { StockMarchandisesPanel, StockProduitsPanel } from '../components/StockPanels';
import { PageHeader } from '../components/UI';
import type { Magasin } from '../types';

type GestionTab = 'magasins' | 'produits' | 'marchandises';

export function GestionAdminPage() {
  const [tab, setTab] = useState<GestionTab>('magasins');
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [magasinId, setMagasinId] = useState('');
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

  const selectedMagasin = magasins.find((m) => m.id === magasinId);

  return (
    <>
      <PageHeader
        title="Gestion & corrections"
        subtitle="Vue administrateur pour corriger les inventaires magasins et production"
      />

      {error && <p className="error-text">{error}</p>}

      <div className="tab-bar">
        <button
          type="button"
          className={`btn btn-sm ${tab === 'magasins' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('magasins')}
        >
          Inventaires magasins
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'produits' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('produits')}
        >
          Stock produits finis
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'marchandises' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('marchandises')}
        >
          Inventaire matières premières
        </button>
      </div>

      {tab === 'magasins' && (
        <>
          <section className="panel form-panel magasin-picker">
            <label>
              Magasin à gérer
              <select value={magasinId} onChange={(e) => setMagasinId(e.target.value)}>
                {magasins.map((magasin) => (
                  <option key={magasin.id} value={magasin.id}>
                    {magasin.nom}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {magasinId && (
            <InventaireMagasinPanel
              key={magasinId}
              magasinId={magasinId}
              magasinNom={selectedMagasin?.nom}
            />
          )}
        </>
      )}

      {tab === 'produits' && <StockProduitsPanel showAdd />}
      {tab === 'marchandises' && <StockMarchandisesPanel showAdd />}
    </>
  );
}
