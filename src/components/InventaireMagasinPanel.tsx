import { useEffect, useMemo, useState } from 'react';
import { inventaireApi } from '../lib/api';
import { AddInventaireForm } from './AddForms';
import { InventaireGridPanel, type InventaireGridItem } from './InventaireGridPanel';
import type { InventaireMagasin } from '../types';

interface InventaireMagasinPanelProps {
  magasinId: string;
  magasinNom?: string;
  showAddForm?: boolean;
  allowRemove?: boolean;
  readOnly?: boolean;
}

function toGridItem(item: InventaireMagasin): InventaireGridItem {
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

export function InventaireMagasinPanel({
  magasinId,
  magasinNom,
  showAddForm = true,
  allowRemove = true,
  readOnly = false,
}: InventaireMagasinPanelProps) {
  const [inventaires, setInventaires] = useState<InventaireMagasin[]>([]);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setInventaires(await inventaireApi.list(magasinId));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [magasinId]);

  const gridItems = useMemo(() => inventaires.map(toGridItem), [inventaires]);

  async function updateItem(
    produitId: string,
    data: { quantite?: number; seuilAlerte?: number },
  ) {
    setSavingId(produitId);
    setError('');
    try {
      const updated = await inventaireApi.update(produitId, { magasinId, ...data });
      setInventaires((items) =>
        items.map((item) => (item.produitId === produitId ? updated : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      throw err;
    } finally {
      setSavingId(null);
    }
  }

  async function removeItem(produitId: string) {
    setSavingId(produitId);
    setError('');
    try {
      await inventaireApi.remove(produitId, magasinId);
      setInventaires((items) => items.filter((item) => item.produitId !== produitId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      throw err;
    } finally {
      setSavingId(null);
    }
  }

  function handleAdded(item: InventaireMagasin, close: () => void) {
    setInventaires((items) =>
      [...items, item].sort((a, b) => a.produit.nom.localeCompare(b.produit.nom)),
    );
    close();
  }

  return (
    <>
      {error && <p className="error-text">{error}</p>}

      <InventaireGridPanel
        items={gridItems}
        contextLabel={magasinNom}
        intro={
          readOnly
            ? magasinNom
              ? `Stock actuellement disponible au magasin ${magasinNom} — consultation seule.`
              : undefined
            : magasinNom
              ? `Gérez librement le stock du magasin ${magasinNom} : recherchez, filtrez et ajustez en un clic.`
              : undefined
        }
        savingKey={readOnly ? null : savingId}
        showAdd={!readOnly && showAddForm}
        addLabel="+ Ajouter"
        addModalTitle="Ajouter un article"
        allowRemove={!readOnly && allowRemove}
        readOnly={readOnly}
        onUpdate={readOnly ? async () => {} : updateItem}
        onRemove={!readOnly && allowRemove ? removeItem : undefined}
        addForm={
          !readOnly && showAddForm
            ? (close) => (
                <AddInventaireForm
                  magasinId={magasinId}
                  existingProduitIds={inventaires.map((i) => i.produitId)}
                  onAdded={(item) => handleAdded(item, close)}
                />
              )
            : undefined
        }
      />
    </>
  );
}
