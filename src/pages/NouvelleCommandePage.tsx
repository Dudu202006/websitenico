import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { commandesApi, produitsApi } from '../lib/api';
import { COMMANDES_COPY } from '../lib/commandesCopy';
import { PageHeader } from '../components/UI';
import type { LigneCommandeInput, Produit } from '../types';

type LigneLibre = { id: string; nom: string; quantite: number };

const copy = COMMANDES_COPY.new;
const errors = COMMANDES_COPY.errors;

export function NouvelleCommandePage() {
  const navigate = useNavigate();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [search, setSearch] = useState('');
  const [quantites, setQuantites] = useState<Record<string, number>>({});
  const [lignesLibres, setLignesLibres] = useState<LigneLibre[]>([]);
  const [libreNom, setLibreNom] = useState('');
  const [libreQuantite, setLibreQuantite] = useState(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    produitsApi
      .list()
      .then(setProduits)
      .catch((err) => setError(err.message));
  }, []);

  const filteredProduits = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return produits;
    return produits.filter(
      (p) =>
        p.nom.toLowerCase().includes(query) ||
        p.categorie.toLowerCase().includes(query),
    );
  }, [produits, search]);

  const selectedCatalogueCount = Object.values(quantites).filter((q) => q > 0).length;

  function addLigneLibre() {
    const nom = libreNom.trim();
    if (!nom) {
      setError(errors.articleNameRequired);
      return;
    }
    if (libreQuantite <= 0) {
      setError(errors.quantityPositive);
      return;
    }

    setLignesLibres((items) => [
      ...items,
      { id: crypto.randomUUID(), nom, quantite: libreQuantite },
    ]);
    setLibreNom('');
    setLibreQuantite(1);
    setError('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const lignesCatalogue: LigneCommandeInput[] = Object.entries(quantites)
      .filter(([, quantite]) => quantite > 0)
      .map(([produitId, quantite]) => ({ produitId, quantite }));

    const lignesHorsCatalogue: LigneCommandeInput[] = lignesLibres.map(({ nom, quantite }) => ({
      nomLibre: nom,
      quantite,
    }));

    const lignes = [...lignesCatalogue, ...lignesHorsCatalogue];

    if (lignes.length === 0) {
      setError(errors.atLeastOneArticle);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await commandesApi.create({ lignes, notes: notes || undefined });
      navigate('/commandes');
    } catch (err) {
      setError(err instanceof Error ? err.message : errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      {error && <p className="error-text">{error}</p>}

      <form onSubmit={handleSubmit} className="panel form-panel commande-form">
        <section className="commande-form-section">
          <h2>{copy.catalogue}</h2>
          <label>
            {copy.search}
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy.searchPlaceholder}
            />
          </label>

          {selectedCatalogueCount > 0 && (
            <p className="commande-form-summary">
              {selectedCatalogueCount} article{selectedCatalogueCount > 1 ? 's' : ''} sélectionné{selectedCatalogueCount > 1 ? 's' : ''} dans le catalogue
            </p>
          )}

          <div className="product-order-grid">
            {filteredProduits.map((produit) => (
              <label key={produit.id} className="product-order-card">
                <div>
                  <strong>{produit.nom}</strong>
                  <span>{produit.categorie} — {produit.prix.toFixed(2)} €</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  aria-label={`Quantité pour ${produit.nom}`}
                  value={quantites[produit.id] ?? ''}
                  onChange={(e) =>
                    setQuantites((prev) => ({
                      ...prev,
                      [produit.id]: Number(e.target.value) || 0,
                    }))
                  }
                />
              </label>
            ))}
          </div>

          {filteredProduits.length === 0 && (
            <p className="muted">{copy.emptySearch}</p>
          )}
        </section>

        <section className="custom-lines-section commande-form-section">
          <h2>{copy.horsCatalogue}</h2>
          <p className="muted panel-intro">{copy.horsCatalogueIntro}</p>

          <div className="add-product-row">
            <label>
              {copy.articleName}
              <input
                type="text"
                value={libreNom}
                onChange={(e) => setLibreNom(e.target.value)}
                placeholder={copy.articleNamePlaceholder}
              />
            </label>
            <label>
              {copy.quantite}
              <input
                type="number"
                min="1"
                step="1"
                value={libreQuantite}
                onChange={(e) => setLibreQuantite(Number(e.target.value) || 1)}
              />
            </label>
            <button type="button" className="btn btn-secondary" onClick={addLigneLibre}>
              {copy.add}
            </button>
          </div>

          {lignesLibres.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Quantité</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lignesLibres.map((ligne) => (
                    <tr key={ligne.id}>
                      <td><strong>{ligne.nom}</strong></td>
                      <td>{ligne.quantite}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() =>
                            setLignesLibres((items) => items.filter((item) => item.id !== ligne.id))
                          }
                        >
                          {copy.remove}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="commande-form-section">
          <h2>{copy.annotations}</h2>
          <p className="muted panel-intro">{copy.annotationsHint}</p>
          <label>
            {copy.annotations}
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={copy.annotationsPlaceholder}
            />
          </label>
        </section>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? copy.submitting : copy.submit}
        </button>
      </form>
    </>
  );
}
