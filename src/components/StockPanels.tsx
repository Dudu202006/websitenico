import { ReactNode, useEffect, useMemo, useState } from 'react';
import { stockApi } from '../lib/api';
import { AddMarchandiseForm, AddProduitForm } from './AddForms';
import { InventaireGridPanel, type InventaireGridItem } from './InventaireGridPanel';
import type { StockMarchandise, StockProduit } from '../types';

function produitToGrid(item: StockProduit): InventaireGridItem {
  return {
    id: item.id,
    itemKey: item.produitId,
    nom: item.produit.nom,
    categorie: item.produit.categorie,
    quantite: item.quantite,
    seuilAlerte: item.seuilAlerte,
    unite: item.produit.unite,
  };
}

function marchandiseToGrid(item: StockMarchandise): InventaireGridItem {
  return {
    id: item.id,
    itemKey: item.marchandiseId,
    nom: item.marchandise.nom,
    categorie: item.marchandise.categorie,
    description: item.marchandise.description,
    quantite: item.quantite,
    seuilAlerte: item.seuilAlerte,
    unite: item.marchandise.unite,
  };
}

interface StockPanelProps {
  intro?: string;
  contextLabel?: string;
  showAdd?: boolean;
  addFormExtra?: ReactNode;
}

export function StockProduitsPanel({
  intro = 'Stock central de produits finis au centre de production, partagé entre tous les magasins.',
  contextLabel = 'Production',
  showAdd = false,
}: StockPanelProps) {
  const [stock, setStock] = useState<StockProduit[]>([]);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setStock(await stockApi.produits());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const gridItems = useMemo(() => stock.map(produitToGrid), [stock]);

  async function updateItem(produitId: string, data: { quantite?: number; seuilAlerte?: number }) {
    setSavingId(produitId);
    setError('');
    try {
      const updated = await stockApi.updateProduit(produitId, data);
      setStock((items) => items.map((item) => (item.produitId === produitId ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      throw err;
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      {error && <p className="error-text">{error}</p>}
      <InventaireGridPanel
        items={gridItems}
        contextLabel={contextLabel}
        intro={intro}
        savingKey={savingId}
        showAdd={showAdd}
        addLabel="+ Ajouter un produit"
        addModalTitle="Ajouter un produit fini"
        emptyLabel="Aucun produit fini en stock."
        onUpdate={updateItem}
        addForm={
          showAdd
            ? (close) => (
                <AddProduitForm
                  onAdded={() => {
                    load().catch((err) => setError(err.message));
                    close();
                  }}
                />
              )
            : undefined
        }
      />
    </>
  );
}

export function StockMarchandisesPanel({
  intro = 'Suivez farine, beurre, levure et toutes vos matières premières. Les stocks sont regroupés par famille avec alerte de réapprovisionnement.',
  contextLabel = 'Production',
  showAdd = false,
  addFormExtra,
}: StockPanelProps) {
  const [stock, setStock] = useState<StockMarchandise[]>([]);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setStock(await stockApi.marchandises());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const gridItems = useMemo(() => stock.map(marchandiseToGrid), [stock]);

  async function updateItem(
    marchandiseId: string,
    data: { quantite?: number; seuilAlerte?: number },
  ) {
    setSavingId(marchandiseId);
    setError('');
    try {
      const updated = await stockApi.updateMarchandise(marchandiseId, data);
      setStock((items) =>
        items.map((item) => (item.marchandiseId === marchandiseId ? updated : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      throw err;
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      {error && <p className="error-text">{error}</p>}
      <InventaireGridPanel
        items={gridItems}
        contextLabel={contextLabel}
        intro={intro}
        step={0.1}
        variant="matieres"
        savingKey={savingId}
        showAdd={showAdd}
        addLabel="+ Nouvelle matière"
        addModalTitle="Ajouter une matière première"
        emptyLabel="Aucune matière première enregistrée."
        onUpdate={updateItem}
        addForm={
          showAdd
            ? (close) => (
                <>
                  <AddMarchandiseForm
                    onAdded={() => {
                      load().catch((err) => setError(err.message));
                      close();
                    }}
                  />
                  {addFormExtra}
                </>
              )
            : undefined
        }
      />
    </>
  );
}
