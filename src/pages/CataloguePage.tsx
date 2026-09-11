import { useEffect, useMemo, useState } from 'react';
import { produitsApi } from '../lib/api';
import {
  draftToPayload,
  emptyProduitDraft,
  isDraftDirty,
  isDraftValid,
  PRODUIT_CATEGORIES,
  PRODUIT_UNITES,
  produitToDraft,
  type ProduitDraft,
} from '../lib/produitCatalogue';
import { PageHeader } from '../components/UI';
import type { Produit } from '../types';

function patchDraft(draft: ProduitDraft, partial: Partial<ProduitDraft>): ProduitDraft {
  return { ...draft, ...partial };
}

export function CataloguePage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ProduitDraft>>({});
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newDraft, setNewDraft] = useState(emptyProduitDraft);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const data = await produitsApi.list();
    setProduits(data);
    setDrafts(Object.fromEntries(data.map((p) => [p.id, produitToDraft(p)])));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const categories = useMemo(
    () => [...new Set(produits.map((p) => p.categorie))].sort((a, b) => a.localeCompare(b, 'fr')),
    [produits],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return produits.filter((produit) => {
      if (categorie && produit.categorie !== categorie) return false;
      if (!query) return true;
      return (
        produit.nom.toLowerCase().includes(query) ||
        produit.categorie.toLowerCase().includes(query) ||
        (produit.description?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [produits, search, categorie]);

  function updateDraft(id: string, draft: ProduitDraft) {
    setDrafts((prev) => ({ ...prev, [id]: draft }));
  }

  async function saveProduit(produit: Produit) {
    const draft = drafts[produit.id];
    if (!draft || !isDraftValid(draft)) {
      setError('Nom, catégorie et prix requis.');
      return;
    }

    setSavingId(produit.id);
    setError('');
    try {
      const updated = await produitsApi.update(produit.id, draftToPayload(draft));
      setProduits((items) => items.map((p) => (p.id === updated.id ? updated : p)));
      setDrafts((prev) => ({ ...prev, [updated.id]: produitToDraft(updated) }));
      setToast('Enregistré');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSavingId(null);
    }
  }

  async function deleteProduit(produit: Produit) {
    if (!window.confirm(`Retirer « ${produit.nom} » du catalogue ?`)) return;

    setSavingId(produit.id);
    setError('');
    try {
      await produitsApi.remove(produit.id);
      setProduits((items) => items.filter((p) => p.id !== produit.id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[produit.id];
        return next;
      });
      setToast('Produit retiré');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSavingId(null);
    }
  }

  function resetDraft(produit: Produit) {
    setDrafts((prev) => ({ ...prev, [produit.id]: produitToDraft(produit) }));
  }

  async function handleCreate() {
    if (!isDraftValid(newDraft)) {
      setError('Nom, catégorie et prix requis.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const created = await produitsApi.create(draftToPayload(newDraft));
      setProduits((items) => [...items, created].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')));
      setDrafts((prev) => ({ ...prev, [created.id]: produitToDraft(created) }));
      setNewDraft(emptyProduitDraft());
      setAddOpen(false);
      setToast('Produit ajouté');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setCreating(false);
    }
  }

  function renderCategoryCell(
    draft: ProduitDraft,
    onChange: (next: ProduitDraft) => void,
  ) {
    return (
      <div className="catalogue-cat-cell">
        <select
          value={draft.categorie}
          aria-label="Catégorie"
          onChange={(e) => onChange(patchDraft(draft, { categorie: e.target.value, categorieCustom: '' }))}
        >
          {PRODUIT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {draft.categorie === 'Autre' && (
          <input
            value={draft.categorieCustom}
            placeholder="Catégorie"
            aria-label="Catégorie personnalisée"
            onChange={(e) => onChange(patchDraft(draft, { categorieCustom: e.target.value }))}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Catalogue"
        subtitle={`${produits.length} produit${produits.length > 1 ? 's' : ''} · ${categories.length} catégorie${categories.length > 1 ? 's' : ''}`}
        action={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setAddOpen((open) => !open)}
          >
            {addOpen ? 'Annuler' : '+ Ajouter'}
          </button>
        }
      />

      {toast && <p className="toast-banner toast-banner-compact">{toast}</p>}
      {error && <p className="error-text">{error}</p>}

      <section className="panel catalogue-panel">
        <div className="catalogue-toolbar-inline">
          <input
            type="search"
            className="catalogue-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
          />
          <div className="catalogue-filters-inline">
            <button
              type="button"
              className={`filter-chip filter-chip-sm ${!categorie ? 'active' : ''}`}
              onClick={() => setCategorie('')}
            >
              Tous
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-chip filter-chip-sm ${categorie === cat ? 'active' : ''}`}
                onClick={() => setCategorie((c) => (c === cat ? '' : cat))}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap catalogue-table-wrap">
          <table className="catalogue-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Prix</th>
                <th>Unité</th>
                <th>Description</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {addOpen && (
                <tr className="catalogue-add-row">
                  <td>
                    <input
                      value={newDraft.nom}
                      placeholder="Nom"
                      onChange={(e) => setNewDraft(patchDraft(newDraft, { nom: e.target.value }))}
                    />
                  </td>
                  <td>{renderCategoryCell(newDraft, setNewDraft)}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="catalogue-input-narrow"
                      value={newDraft.prix}
                      placeholder="0.00"
                      onChange={(e) => setNewDraft(patchDraft(newDraft, { prix: e.target.value }))}
                    />
                  </td>
                  <td>
                    <select
                      value={newDraft.unite}
                      onChange={(e) => setNewDraft(patchDraft(newDraft, { unite: e.target.value }))}
                    >
                      {PRODUIT_UNITES.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      value={newDraft.description}
                      placeholder="Description"
                      onChange={(e) => setNewDraft(patchDraft(newDraft, { description: e.target.value }))}
                    />
                  </td>
                  <td className="catalogue-actions-cell">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={creating || !isDraftValid(newDraft)}
                      onClick={handleCreate}
                    >
                      {creating ? '…' : 'Ajouter'}
                    </button>
                  </td>
                </tr>
              )}

              {filtered.length === 0 && !addOpen ? (
                <tr>
                  <td colSpan={6} className="catalogue-empty-cell muted">
                    {produits.length === 0 ? 'Catalogue vide.' : 'Aucun résultat.'}
                  </td>
                </tr>
              ) : (
                filtered.map((produit) => {
                  const draft = drafts[produit.id] ?? produitToDraft(produit);
                  const dirty = isDraftDirty(produit, draft);
                  const saving = savingId === produit.id;

                  return (
                    <tr
                      key={produit.id}
                      className={`${dirty ? 'catalogue-row-dirty' : ''} ${saving ? 'catalogue-row-saving' : ''}`}
                    >
                      <td>
                        <input
                          value={draft.nom}
                          onChange={(e) => updateDraft(produit.id, patchDraft(draft, { nom: e.target.value }))}
                        />
                      </td>
                      <td>{renderCategoryCell(draft, (next) => updateDraft(produit.id, next))}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="catalogue-input-narrow"
                          value={draft.prix}
                          onChange={(e) => updateDraft(produit.id, patchDraft(draft, { prix: e.target.value }))}
                        />
                      </td>
                      <td>
                        <select
                          value={draft.unite}
                          onChange={(e) => updateDraft(produit.id, patchDraft(draft, { unite: e.target.value }))}
                        >
                          {PRODUIT_UNITES.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          value={draft.description}
                          placeholder="—"
                          onChange={(e) => updateDraft(produit.id, patchDraft(draft, { description: e.target.value }))}
                        />
                      </td>
                      <td className="catalogue-actions-cell">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Enregistrer"
                          disabled={!dirty || saving || !isDraftValid(draft)}
                          onClick={() => saveProduit(produit)}
                        >
                          {saving ? '…' : '✓'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Annuler"
                          disabled={!dirty || saving}
                          onClick={() => resetDraft(produit)}
                        >
                          ↺
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm catalogue-delete-btn"
                          title="Retirer"
                          disabled={saving}
                          onClick={() => deleteProduit(produit)}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
