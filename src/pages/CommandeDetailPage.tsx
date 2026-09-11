import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CommandeWorkflow } from '../components/CommandeWorkflow';
import { useAuth } from '../context/AuthContext';
import { commandesApi, produitsApi } from '../lib/api';
import { COMMANDES_COPY, statutActionLabel } from '../lib/commandesCopy';
import { PageHeader, StatusBadge } from '../components/UI';
import type { Commande, LigneCommande, LigneCommandeInput, Produit, StatutCommande } from '../types';
import { ligneCategorie, ligneLabel } from '../types';

const nextStatut: Partial<Record<StatutCommande, StatutCommande>> = {
  EN_ATTENTE: 'EN_PREPARATION',
  EN_PREPARATION: 'EXPEDIEE',
  EXPEDIEE: 'LIVREE',
};

const editableStatuts: StatutCommande[] = ['EN_ATTENTE', 'EN_PREPARATION', 'EXPEDIEE'];

type EditLigne = {
  key: string;
  produitId?: string;
  nomLibre?: string;
  nom: string;
  categorie: string;
  quantite: number;
};

const copy = COMMANDES_COPY.detail;

function toEditLigne(ligne: LigneCommande): EditLigne {
  return {
    key: ligne.id,
    produitId: ligne.produitId ?? undefined,
    nomLibre: ligne.nomLibre ?? undefined,
    nom: ligneLabel(ligne),
    categorie: ligneCategorie(ligne),
    quantite: ligne.quantite,
  };
}

function toLigneInput(ligne: EditLigne): LigneCommandeInput {
  if (ligne.produitId) {
    return { produitId: ligne.produitId, quantite: ligne.quantite };
  }
  return { nomLibre: ligne.nomLibre ?? ligne.nom, quantite: ligne.quantite };
}

export function CommandeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [commande, setCommande] = useState<Commande | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [annotations, setAnnotations] = useState('');
  const [editLignes, setEditLignes] = useState<EditLigne[]>([]);
  const [addProduitId, setAddProduitId] = useState('');
  const [addLibreNom, setAddLibreNom] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingStatut, setLoadingStatut] = useState(false);

  const canManage = user?.role === 'PRODUCTION' || user?.role === 'ADMIN';
  const canAnnotate = Boolean(commande && commande.statut !== 'LIVREE' && commande.statut !== 'ANNULEE');

  useEffect(() => {
    if (!id) return;

    Promise.all([commandesApi.get(id), produitsApi.list()])
      .then(([data, catalog]) => {
        setCommande(data);
        setAnnotations(data.notes ?? '');
        setEditLignes(data.lignes.map(toEditLigne));
        setProduits(catalog);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  async function saveAnnotations(event: FormEvent) {
    event.preventDefault();
    if (!commande) return;

    setSaving(true);
    setError('');
    try {
      const updated = await commandesApi.update(commande.id, { notes: annotations });
      setCommande(updated);
      setAnnotations(updated.notes ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : COMMANDES_COPY.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  async function saveCommande(event: FormEvent) {
    event.preventDefault();
    if (!commande || !canManage) return;

    const lignes = editLignes
      .filter((ligne) => ligne.quantite > 0)
      .map(toLigneInput);

    if (lignes.length === 0) {
      setError(COMMANDES_COPY.errors.atLeastOneWithQty);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await commandesApi.update(commande.id, {
        lignes,
        notes: annotations || undefined,
      });
      setCommande(updated);
      setAnnotations(updated.notes ?? '');
      setEditLignes(updated.lignes.map(toEditLigne));
    } catch (err) {
      setError(err instanceof Error ? err.message : COMMANDES_COPY.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  function addProductLine() {
    if (!addProduitId) return;
    const produit = produits.find((p) => p.id === addProduitId);
    if (!produit) return;

    if (editLignes.some((ligne) => ligne.produitId === produit.id)) {
      setError(COMMANDES_COPY.errors.alreadyInOrder);
      return;
    }

    setEditLignes((items) => [
      ...items,
      {
        key: crypto.randomUUID(),
        produitId: produit.id,
        nom: produit.nom,
        categorie: produit.categorie,
        quantite: 1,
      },
    ]);
    setAddProduitId('');
    setError('');
  }

  function addLibreLine() {
    const nom = addLibreNom.trim();
    if (!nom) {
      setError(COMMANDES_COPY.errors.articleNameRequired);
      return;
    }

    setEditLignes((items) => [
      ...items,
      {
        key: crypto.randomUUID(),
        nomLibre: nom,
        nom,
        categorie: copy.horsCatalogue,
        quantite: 1,
      },
    ]);
    setAddLibreNom('');
    setError('');
  }

  async function advanceStatut() {
    if (!commande) return;
    const next = nextStatut[commande.statut];
    if (!next) return;

    setLoadingStatut(true);
    setError('');
    try {
      await commandesApi.updateStatut(commande.id, next);
      if (next === 'LIVREE') {
        navigate('/commandes');
      } else {
        const updated = await commandesApi.get(commande.id);
        setCommande(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : COMMANDES_COPY.errors.generic);
    } finally {
      setLoadingStatut(false);
    }
  }

  if (!commande) {
    return (
      <>
        <PageHeader title={copy.loadingTitle} subtitle={copy.loadingSubtitle} />
        {error && <p className="error-text">{error}</p>}
      </>
    );
  }

  const availableProduits = produits.filter(
    (p) => !editLignes.some((ligne) => ligne.produitId === p.id),
  );
  const next = nextStatut[commande.statut];

  return (
    <>
      <PageHeader
        title={`Commande ${commande.numero}`}
        subtitle={commande.magasin ? `${copy.fields.magasin} : ${commande.magasin.nom}` : undefined}
        action={
          <Link to="/commandes" className="btn btn-secondary">
            {copy.back}
          </Link>
        }
      />

      {error && <p className="error-text">{error}</p>}

      <section className="panel commande-workflow-panel">
        <h2>{copy.sections.workflow}</h2>
        <CommandeWorkflow statut={commande.statut} />
        {canManage && next && (
          <button
            type="button"
            className="btn btn-primary commande-status-action"
            disabled={loadingStatut}
            onClick={advanceStatut}
          >
            {loadingStatut ? copy.updatingStatus : statutActionLabel(next)}
          </button>
        )}
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2>{copy.sections.infos}</h2>
          <dl className="detail-list">
            <div>
              <dt>{copy.fields.numero}</dt>
              <dd>{commande.numero}</dd>
            </div>
            <div>
              <dt>{copy.fields.date}</dt>
              <dd>{new Date(commande.createdAt).toLocaleString('fr-FR')}</dd>
            </div>
            <div>
              <dt>{copy.fields.magasin}</dt>
              <dd>{commande.magasin?.nom ?? '—'}</dd>
            </div>
            <div>
              <dt>{copy.fields.statut}</dt>
              <dd><StatusBadge statut={commande.statut} /></dd>
            </div>
          </dl>
        </section>

        <section className="panel form-panel">
          <h2>{copy.sections.annotations}</h2>
          <p className="muted panel-intro">{copy.annotationsHint}</p>
          <form onSubmit={saveAnnotations}>
            <label>
              {copy.fields.annotations}
              <textarea
                rows={5}
                value={annotations}
                onChange={(e) => setAnnotations(e.target.value)}
                disabled={!canAnnotate}
                placeholder={copy.annotationsPlaceholder}
              />
            </label>
            {canAnnotate && (
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? copy.saving : copy.saveAnnotations}
              </button>
            )}
          </form>
        </section>
      </div>

      <section className="panel">
        <h2>{copy.sections.articles}</h2>
        {canManage && editableStatuts.includes(commande.statut) ? (
          <form onSubmit={saveCommande} className="form-panel">
            <p className="muted panel-intro">{copy.articlesIntroProduction}</p>

            <div className="add-product-row">
              <label>
                {copy.addCatalogue}
                <select value={addProduitId} onChange={(e) => setAddProduitId(e.target.value)}>
                  <option value="">{copy.selectArticle}</option>
                  {availableProduits.map((produit) => (
                    <option key={produit.id} value={produit.id}>
                      {produit.nom} ({produit.categorie})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!addProduitId}
                onClick={addProductLine}
              >
                {copy.add}
              </button>
            </div>

            <div className="add-product-row">
              <label>
                {copy.addHorsCatalogue}
                <input
                  type="text"
                  value={addLibreNom}
                  onChange={(e) => setAddLibreNom(e.target.value)}
                  placeholder={copy.articleNamePlaceholder}
                />
              </label>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!addLibreNom.trim()}
                onClick={addLibreLine}
              >
                {copy.add}
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{copy.columns.article}</th>
                    <th>{copy.columns.categorie}</th>
                    <th>{copy.columns.quantite}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {editLignes.map((ligne, index) => (
                    <tr key={ligne.key}>
                      <td><strong>{ligne.nom}</strong></td>
                      <td>{ligne.categorie}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={ligne.quantite}
                          onChange={(e) =>
                            setEditLignes((items) =>
                              items.map((item, i) =>
                                i === index ? { ...item, quantite: Number(e.target.value) } : item,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() =>
                            setEditLignes((items) => items.filter((_, i) => i !== index))
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

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? copy.saving : copy.saveArticles}
            </button>
          </form>
        ) : (
          <>
            <p className="muted panel-intro">{copy.articlesIntroReadonly}</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{copy.columns.article}</th>
                    <th>{copy.columns.categorie}</th>
                    <th>{copy.columns.prixUnitaire}</th>
                    <th>{copy.columns.quantite}</th>
                    <th>{copy.columns.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {commande.lignes.map((ligne) => (
                    <tr key={ligne.id}>
                      <td><strong>{ligneLabel(ligne)}</strong></td>
                      <td>{ligneCategorie(ligne)}</td>
                      <td>{ligne.produit ? `${ligne.produit.prix.toFixed(2)} €` : copy.noPrice}</td>
                      <td>{ligne.quantite}</td>
                      <td>
                        {ligne.produit
                          ? `${(ligne.produit.prix * ligne.quantite).toFixed(2)} €`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
}
