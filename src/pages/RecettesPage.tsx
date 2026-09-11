import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { magasinsApi, recettesApi } from '../lib/api';
import { ALLERGENES_COMMUNS } from '../lib/allergenes';
import {
  INGREDIENT_UNITES,
  PORTION_UNITES,
  ingredientDisplay,
  portionLabel,
} from '../lib/recetteScale';
import { PageHeader } from '../components/UI';
import type { Magasin, Recette, RecetteInput } from '../types';

type IngredientDraft = { nom: string; quantiteValeur: string; quantiteUnite: string };

type RecetteFormState = {
  id?: string;
  nom: string;
  description: string;
  instructions: string;
  allergenes: string[];
  portionsBase: number;
  unitePortion: string;
  ingredients: IngredientDraft[];
  magasinIds: string[];
};

const emptyForm = (): RecetteFormState => ({
  nom: '',
  description: '',
  instructions: '',
  allergenes: [],
  portionsBase: 1,
  unitePortion: 'personnes',
  ingredients: [{ nom: '', quantiteValeur: '', quantiteUnite: 'g' }],
  magasinIds: [],
});

function matchesSearch(recette: Recette, query: string, magasinOnly = false): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (magasinOnly) {
    return (
      recette.nom.toLowerCase().includes(q) ||
      recette.allergenes.some((a) => a.toLowerCase().includes(q))
    );
  }
  return (
    recette.nom.toLowerCase().includes(q) ||
    (recette.description?.toLowerCase().includes(q) ?? false) ||
    recette.allergenes.some((a) => a.toLowerCase().includes(q)) ||
    (recette.ingredients?.some((i) => i.nom.toLowerCase().includes(q)) ?? false)
  );
}

export function RecettesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'PRODUCTION' || user?.role === 'ADMIN';
  const isMagasin = user?.role === 'MAGASIN';

  const [recettes, setRecettes] = useState<Recette[]>([]);
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [search, setSearch] = useState('');
  const [allergenFilter, setAllergenFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [scaleTarget, setScaleTarget] = useState(1);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function resetPhotoState() {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview('');
    setExistingPhotoUrl(null);
    setPhotoRemoved(false);
  }

  function handlePhotoPick(file: File | null) {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(existingPhotoUrl && !photoRemoved ? existingPhotoUrl : '');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoRemoved(false);
  }

  function handleRemovePhoto() {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview('');
    setPhotoRemoved(true);
  }

  async function load() {
    const data = await recettesApi.list();
    setRecettes(data);
    if (data.length > 0 && !selectedId) {
      setSelectedId(data[0].id);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
    if (canEdit) {
      magasinsApi.list().then(setMagasins).catch(() => {});
    }
  }, [canEdit]);

  const filtered = useMemo(() => {
    return recettes.filter((r) => {
      if (!matchesSearch(r, search, isMagasin)) return false;
      if (allergenFilter && !r.allergenes.includes(allergenFilter)) return false;
      return true;
    });
  }, [recettes, search, allergenFilter, isMagasin]);

  const selected = recettes.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (filtered.length > 0 && selectedId && !filtered.some((r) => r.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (selected) {
      setScaleTarget(selected.portionsBase || 1);
    }
  }, [selected?.id, selected?.portionsBase]);

  function openCreate() {
    resetPhotoState();
    setForm(emptyForm());
    setFormOpen(true);
    setError('');
  }

  function openEdit(recette: Recette) {
    resetPhotoState();
    setExistingPhotoUrl(recette.photoUrl ?? null);
    setPhotoPreview(recette.photoUrl ?? '');
    setForm({
      id: recette.id,
      nom: recette.nom,
      description: recette.description ?? '',
      instructions: recette.instructions ?? '',
      allergenes: [...recette.allergenes],
      portionsBase: recette.portionsBase || 1,
      unitePortion: recette.unitePortion || 'personnes',
      ingredients: recette.ingredients?.length
        ? recette.ingredients.map((i) => ({
            nom: i.nom,
            quantiteValeur: i.quantiteValeur != null ? String(i.quantiteValeur) : '',
            quantiteUnite: i.quantiteUnite ?? 'g',
          }))
        : [{ nom: '', quantiteValeur: '', quantiteUnite: 'g' }],
      magasinIds: recette.partages?.map((p) => p.magasinId) ?? [],
    });
    setFormOpen(true);
    setError('');
  }

  function toggleAllergene(allergene: string) {
    setForm((prev) => ({
      ...prev,
      allergenes: prev.allergenes.includes(allergene)
        ? prev.allergenes.filter((a) => a !== allergene)
        : [...prev.allergenes, allergene],
    }));
  }

  function toggleMagasin(magasinId: string) {
    setForm((prev) => ({
      ...prev,
      magasinIds: prev.magasinIds.includes(magasinId)
        ? prev.magasinIds.filter((id) => id !== magasinId)
        : [...prev.magasinIds, magasinId],
    }));
  }

  function updateIngredient(index: number, field: keyof IngredientDraft, value: string) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function addIngredientRow() {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { nom: '', quantiteValeur: '', quantiteUnite: 'g' }],
    }));
  }

  function removeIngredientRow(index: number) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.nom.trim()) {
      setError('Le nom de la recette est requis');
      return;
    }

    const payload: RecetteInput = {
      nom: form.nom.trim(),
      description: form.description?.trim() || undefined,
      instructions: form.instructions?.trim() || undefined,
      allergenes: form.allergenes,
      portionsBase: form.portionsBase > 0 ? form.portionsBase : 1,
      unitePortion: form.unitePortion,
      ingredients: form.ingredients
        .filter((i) => i.nom.trim())
        .map((i) => ({
          nom: i.nom.trim(),
          quantiteValeur: i.quantiteValeur ? Number(i.quantiteValeur) : undefined,
          quantiteUnite: i.quantiteUnite || undefined,
        })),
      magasinIds: form.magasinIds,
      ...(photoRemoved && { removePhoto: true }),
    };

    setSaving(true);
    setError('');
    try {
      if (form.id) {
        await recettesApi.update(form.id, payload, photoFile);
      } else {
        await recettesApi.create(payload, photoFile);
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Supprimer cette recette ?')) return;
    setError('');
    try {
      await recettesApi.remove(id);
      if (selectedId === id) setSelectedId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  return (
    <>
      <PageHeader
        title={canEdit ? 'Recettes' : 'Allergènes produits'}
        subtitle={
          canEdit
            ? 'Créez vos recettes, indiquez les allergènes et partagez-les avec les magasins'
            : 'Alertes allergènes communiquées par la production — ingrédients et recette non visibles'
        }
        action={
          canEdit ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Nouvelle recette
            </button>
          ) : undefined
        }
      />

      {error && !formOpen && <p className="error-text">{error}</p>}

      <section className="panel recettes-toolbar">
        <label className="inventaire-search">
          <span className="sr-only">Rechercher</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isMagasin
                ? '🔍  Rechercher un produit ou un allergène...'
                : '🔍  Rechercher une recette, un ingrédient, un allergène...'
            }
          />
        </label>
        <div className="inventaire-filters">
          <button
            type="button"
            className={`filter-chip ${!allergenFilter ? 'active' : ''}`}
            onClick={() => setAllergenFilter('')}
          >
            Tous les allergènes
          </button>
          {ALLERGENES_COMMUNS.map((allergene) => (
            <button
              key={allergene}
              type="button"
              className={`filter-chip filter-chip-allergen ${allergenFilter === allergene ? 'active' : ''}`}
              onClick={() => setAllergenFilter((a) => (a === allergene ? '' : allergene))}
            >
              {allergene}
            </button>
          ))}
        </div>
      </section>

      {isMagasin ? (
        <section className="panel">
          <h2>{filtered.length} produit{filtered.length !== 1 ? 's' : ''}</h2>
          {filtered.length === 0 ? (
            <p className="muted">Aucune alerte allergène partagée avec votre magasin pour le moment.</p>
          ) : (
            <div className="allergene-cards-grid">
              {filtered.map((recette) => (
                <article key={recette.id} className="allergene-product-card">
                  {recette.photoUrl && (
                    <div className="recette-photo-frame recette-photo-frame--card">
                      <img src={recette.photoUrl} alt={recette.nom} />
                    </div>
                  )}
                  <h3>{recette.nom}</h3>
                  {recette.allergenes.length === 0 ? (
                    <p className="muted">Aucun allergène signalé.</p>
                  ) : (
                    <div className="allergene-badges">
                      {recette.allergenes.map((a) => (
                        <span key={a} className="allergene-badge">{a}</span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
      <div className="recettes-layout">
        <section className="panel recettes-list-panel">
          <h2>{filtered.length} recette{filtered.length !== 1 ? 's' : ''}</h2>
          {filtered.length === 0 ? (
            <p className="muted">
              {canEdit
                ? 'Aucune recette. Créez-en une avec le bouton ci-dessus.'
                : 'Aucune recette partagée avec votre magasin pour le moment.'}
            </p>
          ) : (
            <ul className="recettes-list">
              {filtered.map((recette) => (
                <li key={recette.id}>
                  <button
                    type="button"
                    className={`recette-list-item ${selected?.id === recette.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(recette.id)}
                  >
                    {recette.photoUrl && (
                      <div className="recette-photo-frame recette-photo-frame--thumb">
                        <img src={recette.photoUrl} alt="" />
                      </div>
                    )}
                    <span className="recette-list-text">
                      <strong>{recette.nom}</strong>
                      {recette.allergenes.length > 0 && (
                        <span className="recette-list-allergens">
                          {recette.allergenes.slice(0, 3).join(', ')}
                          {recette.allergenes.length > 3 && '…'}
                        </span>
                      )}
                      {canEdit && (recette.partages?.length ?? 0) > 0 && (
                        <span className="recette-shared-badge">
                          Partagée · {recette.partages!.length} magasin{recette.partages!.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel recette-detail-panel">
          {!selected ? (
            <p className="muted">Sélectionnez une recette pour voir le détail.</p>
          ) : (
            <>
              <div className="recette-detail-head">
                <h2>{selected.nom}</h2>
                {canEdit && (
                  <div className="recette-detail-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(selected)}>
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDelete(selected.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>

              {selected.photoUrl && (
                <div className="recette-photo-frame recette-photo-frame--detail">
                  <img src={selected.photoUrl} alt={`Produit fini — ${selected.nom}`} />
                </div>
              )}

              {selected.description && <p className="muted">{selected.description}</p>}

              {!isMagasin && (
                <div className="recette-scale-panel">
                  <p className="recette-scale-base">
                    Recette de base :{' '}
                    <strong>
                      {portionLabel(selected.unitePortion, selected.portionsBase || 1)}
                    </strong>
                  </p>
                  <div className="recette-scale-row">
                    <label>
                      Calculer pour
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={scaleTarget}
                        onChange={(e) => setScaleTarget(Number(e.target.value) || 1)}
                      />
                    </label>
                    <span className="recette-scale-unit">{selected.unitePortion}</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setScaleTarget(selected.portionsBase || 1)}
                    >
                      Réinitialiser
                    </button>
                  </div>
                  {scaleTarget !== (selected.portionsBase || 1) && (
                    <p className="recette-scale-hint">
                      Quantités ajustées pour{' '}
                      <strong>{portionLabel(selected.unitePortion, scaleTarget)}</strong>
                      {' '}(×{(scaleTarget / (selected.portionsBase || 1)).toFixed(2)})
                    </p>
                  )}
                </div>
              )}

              <div className="recette-allergenes-block">
                <h3>Allergènes</h3>
                {selected.allergenes.length === 0 ? (
                  <p className="muted">Aucun allergène signalé.</p>
                ) : (
                  <div className="allergene-badges">
                    {selected.allergenes.map((a) => (
                      <span key={a} className="allergene-badge">{a}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="recette-section">
                <h3>Ingrédients</h3>
                <ul className="ingredient-list">
                  {(selected.ingredients ?? []).map((ing) => (
                    <li key={ing.id}>
                      <strong>{ing.nom}</strong>
                      <span>
                        {ingredientDisplay(
                          ing,
                          selected.portionsBase || 1,
                          scaleTarget,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {selected.instructions && (
                <div className="recette-section">
                  <h3>Préparation</h3>
                  <p className="recette-instructions">{selected.instructions}</p>
                </div>
              )}

              {canEdit && (
                <div className="recette-section">
                  <h3>Partage magasins</h3>
                  {(selected.partages?.length ?? 0) === 0 ? (
                    <p className="muted">Non partagée — les magasins ne voient pas cette recette.</p>
                  ) : (
                    <ul className="inline-list">
                      {selected.partages!.map((p) => (
                        <li key={p.id}>✓ {p.magasin?.nom ?? 'Magasin'}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
      )}

      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div
            className="modal-panel modal-panel-wide"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{form.id ? 'Modifier la recette' : 'Nouvelle recette'}</h2>
              <button type="button" className="modal-close" onClick={() => setFormOpen(false)} aria-label="Fermer">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="add-form recette-form">
              {error && <p className="error-text">{error}</p>}

              <label>
                Nom de la recette
                <input
                  value={form.nom}
                  onChange={(e) => setForm((prev) => ({ ...prev, nom: e.target.value }))}
                  required
                />
              </label>

              <label>
                Description courte
                <input
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </label>

              <fieldset className="recette-fieldset">
                <legend>Photo du produit fini</legend>
                <p className="muted panel-intro">
                  Optionnel — aide la production et les magasins à identifier le produit.
                </p>
                <div
                  className={`galerie-dropzone recette-photo-dropzone ${photoPreview ? 'galerie-dropzone-filled' : ''}`}
                  onClick={() => photoInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file?.type.startsWith('image/')) handlePhotoPick(file);
                  }}
                >
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => handlePhotoPick(e.target.files?.[0] ?? null)}
                  />
                  {photoPreview ? (
                    <div className="recette-photo-frame recette-photo-frame--preview">
                      <img src={photoPreview} alt="Aperçu produit fini" />
                    </div>
                  ) : (
                    <p className="muted">Glissez une image ou cliquez pour parcourir (max 8 Mo)</p>
                  )}
                </div>
                {photoPreview && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm recette-photo-remove"
                    onClick={handleRemovePhoto}
                  >
                    Retirer la photo
                  </button>
                )}
              </fieldset>

              <div className="recette-base-row">
                <label>
                  Quantité de base
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={form.portionsBase}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        portionsBase: Number(e.target.value) || 1,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Unité
                  <select
                    value={form.unitePortion}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, unitePortion: e.target.value }))
                    }
                  >
                    {PORTION_UNITES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="muted panel-intro">
                Les ingrédients ci-dessous correspondent à cette quantité de base. La production
                pourra ensuite calculer pour un autre nombre de personnes ou de pièces.
              </p>

              <fieldset className="recette-fieldset">
                <legend>Allergènes présents</legend>
                <div className="allergene-picker">
                  {ALLERGENES_COMMUNS.map((allergene) => (
                    <label key={allergene} className="allergene-check">
                      <input
                        type="checkbox"
                        checked={form.allergenes.includes(allergene)}
                        onChange={() => toggleAllergene(allergene)}
                      />
                      {allergene}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="recette-fieldset">
                <legend>Ingrédients (pour {form.portionsBase} {form.unitePortion})</legend>
                {form.ingredients.map((ing, index) => (
                  <div key={index} className="ingredient-row ingredient-row-scale">
                    <input
                      placeholder="Ingrédient"
                      value={ing.nom}
                      onChange={(e) => updateIngredient(index, 'nom', e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Qté"
                      value={ing.quantiteValeur}
                      onChange={(e) => updateIngredient(index, 'quantiteValeur', e.target.value)}
                    />
                    <select
                      value={ing.quantiteUnite}
                      onChange={(e) => updateIngredient(index, 'quantiteUnite', e.target.value)}
                    >
                      {INGREDIENT_UNITES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => removeIngredientRow(index)}
                      disabled={form.ingredients.length <= 1}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addIngredientRow}>
                  + Ingrédient
                </button>
              </fieldset>

              <label>
                Instructions de préparation
                <textarea
                  rows={4}
                  value={form.instructions}
                  onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
                />
              </label>

              <fieldset className="recette-fieldset">
                <legend>Partager avec les magasins (allergènes visibles en boutique)</legend>
                <p className="muted panel-intro">
                  Cochez les magasins à informer. Seuls le nom du produit et les allergènes seront visibles en magasin.
                </p>
                <div className="magasin-share-grid">
                  {magasins.map((magasin) => (
                    <label key={magasin.id} className="magasin-share-card">
                      <input
                        type="checkbox"
                        checked={form.magasinIds.includes(magasin.id)}
                        onChange={() => toggleMagasin(magasin.id)}
                      />
                      <span>
                        <strong>{magasin.nom}</strong>
                        <small>{magasin.adresse}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Enregistrement...' : form.id ? 'Enregistrer' : 'Créer la recette'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
