import { FormEvent, useEffect, useState } from 'react';
import { inventaireApi, marchandisesApi, produitsApi } from '../lib/api';
import {
  draftToPayload,
  emptyProduitDraft,
  isDraftValid,
  type ProduitDraft,
} from '../lib/produitCatalogue';
import { ProduitDraftFields } from './ProduitDraftFields';
import type { InventaireMagasin, Produit } from '../types';

export function AddProduitForm({ onAdded }: { onAdded?: () => void }) {
  const [draft, setDraft] = useState<ProduitDraft>(emptyProduitDraft());
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!isDraftValid(draft)) {
      setError('Complétez le nom, la catégorie et le prix.');
      return;
    }
    try {
      await produitsApi.create(draftToPayload(draft));
      setDraft(emptyProduitDraft());
      onAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="add-form">
      {error && <p className="error-text">{error}</p>}
      <ProduitDraftFields draft={draft} onChange={setDraft} idPrefix="add-produit" />
      <button type="submit" className="btn btn-primary">Ajouter le produit</button>
    </form>
  );
}

export function AddMarchandiseForm({ onAdded }: { onAdded?: () => void }) {
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [categorie, setCategorie] = useState('Farine');
  const [categorieCustom, setCategorieCustom] = useState('');
  const [unite, setUnite] = useState('kg');
  const [quantite, setQuantite] = useState('');
  const [seuilAlerte, setSeuilAlerte] = useState('5');
  const [error, setError] = useState('');

  const CATEGORIES = ['Farine', 'Produits laitiers', 'Levure & levain', 'Sucres', 'Condiments', 'Autre'];
  const UNITES = ['kg', 'g', 'L', 'ml', 'pièce'];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const finalCategorie = categorie === 'Autre' ? categorieCustom.trim() : categorie;
    if (!finalCategorie) {
      setError('Indiquez une catégorie');
      return;
    }
    try {
      await marchandisesApi.create({
        nom,
        description: description.trim() || undefined,
        categorie: finalCategorie,
        unite,
        quantite: quantite ? Number(quantite) : 0,
        seuilAlerte: seuilAlerte ? Number(seuilAlerte) : 5,
      });
      setNom('');
      setDescription('');
      setCategorie('Farine');
      setCategorieCustom('');
      setUnite('kg');
      setQuantite('');
      setSeuilAlerte('5');
      onAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="add-form matiere-add-form">
      {error && <p className="error-text">{error}</p>}

      <label>
        Nom de la matière
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex : Farine T55"
          required
        />
      </label>

      <label>
        Description <span className="muted">(optionnel)</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Fournisseur, usage, notes…"
        />
      </label>

      <div className="matiere-form-row">
        <label>
          Catégorie
          <select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
        <label>
          Unité
          <select value={unite} onChange={(e) => setUnite(e.target.value)}>
            {UNITES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>

      {categorie === 'Autre' && (
        <label>
          Nom de la catégorie
          <input
            value={categorieCustom}
            onChange={(e) => setCategorieCustom(e.target.value)}
            placeholder="Ex : Fruits secs"
            required
          />
        </label>
      )}

      <div className="matiere-form-row">
        <label>
          Stock initial
          <input
            type="number"
            min="0"
            step="0.1"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            placeholder="0"
          />
        </label>
        <label>
          Seuil d&apos;alerte
          <input
            type="number"
            min="0"
            step="0.1"
            value={seuilAlerte}
            onChange={(e) => setSeuilAlerte(e.target.value)}
          />
        </label>
      </div>

      <button type="submit" className="btn btn-primary">
        Ajouter la matière
      </button>
    </form>
  );
}

export function AddInventaireForm({
  magasinId,
  existingProduitIds,
  onAdded,
}: {
  magasinId: string;
  existingProduitIds: string[];
  onAdded?: (item: InventaireMagasin) => void;
}) {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [mode, setMode] = useState<'catalogue' | 'libre'>('catalogue');
  const [search, setSearch] = useState('');
  const [produitId, setProduitId] = useState('');
  const [quantite, setQuantite] = useState(0);
  const [seuilAlerte, setSeuilAlerte] = useState(5);
  const [nomLibre, setNomLibre] = useState('');
  const [categorieLibre, setCategorieLibre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const available = produits.filter((p) => !existingProduitIds.includes(p.id));
  const filtered = available.filter((p) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return p.nom.toLowerCase().includes(query) || p.categorie.toLowerCase().includes(query);
  });

  useEffect(() => {
    produitsApi
      .list()
      .then(setProduits)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (available.length === 0) {
      setMode('libre');
    }
  }, [available.length]);

  useEffect(() => {
    if (filtered.length > 0 && !filtered.some((p) => p.id === produitId)) {
      setProduitId(filtered[0].id);
    }
  }, [filtered, produitId]);

  async function handleCatalogueSubmit(event: FormEvent) {
    event.preventDefault();
    if (!produitId) {
      setError('Choisissez un article à ajouter');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const item = await inventaireApi.update(produitId, {
        magasinId,
        quantite,
        seuilAlerte,
      });
      setQuantite(0);
      setSeuilAlerte(5);
      setSearch('');
      onAdded?.(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  async function handleLibreSubmit(event: FormEvent) {
    event.preventDefault();
    if (!nomLibre.trim()) {
      setError('Indiquez le nom de l\'article');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const item = await inventaireApi.addArticle({
        magasinId,
        nom: nomLibre.trim(),
        categorie: categorieLibre.trim() || undefined,
        quantite,
        seuilAlerte,
      });
      setNomLibre('');
      setCategorieLibre('');
      setQuantite(0);
      setSeuilAlerte(5);
      onAdded?.(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="add-form">
      {error && <p className="error-text">{error}</p>}

      <div className="mode-toggle">
        {available.length > 0 && (
          <button
            type="button"
            className={`btn btn-sm ${mode === 'catalogue' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('catalogue')}
          >
            Du catalogue
          </button>
        )}
        <button
          type="button"
          className={`btn btn-sm ${mode === 'libre' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('libre')}
        >
          Nouvel article
        </button>
      </div>

      {mode === 'catalogue' && available.length > 0 ? (
        <form onSubmit={handleCatalogueSubmit}>
          <label>
            Rechercher un article
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom ou catégorie..."
            />
          </label>
          <label>
            Article
            <select value={produitId} onChange={(e) => setProduitId(e.target.value)} required>
              {filtered.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} ({p.categorie})
                </option>
              ))}
            </select>
          </label>
          {filtered.length === 0 && <p className="muted">Aucun article ne correspond.</p>}
          <label>
            Quantité initiale
            <input
              type="number"
              min="0"
              step="1"
              value={quantite}
              onChange={(e) => setQuantite(Number(e.target.value))}
            />
          </label>
          <label>
            Seuil d'alerte
            <input
              type="number"
              min="0"
              step="1"
              value={seuilAlerte}
              onChange={(e) => setSeuilAlerte(Number(e.target.value))}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading || filtered.length === 0}>
            {loading ? 'Ajout...' : 'Ajouter au stock'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLibreSubmit}>
          <p className="muted">
            Créez un article qui n'existe pas encore dans le catalogue de ce magasin.
          </p>
          <label>
            Nom de l'article
            <input
              value={nomLibre}
              onChange={(e) => setNomLibre(e.target.value)}
              placeholder="Ex : Baguette spéciale"
              required
            />
          </label>
          <label>
            Catégorie
            <input
              value={categorieLibre}
              onChange={(e) => setCategorieLibre(e.target.value)}
              placeholder="Ex : Pain, Viennoiserie..."
            />
          </label>
          <label>
            Quantité initiale
            <input
              type="number"
              min="0"
              step="1"
              value={quantite}
              onChange={(e) => setQuantite(Number(e.target.value))}
            />
          </label>
          <label>
            Seuil d'alerte
            <input
              type="number"
              min="0"
              step="1"
              value={seuilAlerte}
              onChange={(e) => setSeuilAlerte(Number(e.target.value))}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Ajout...' : 'Ajouter au stock'}
          </button>
        </form>
      )}
    </div>
  );
}
