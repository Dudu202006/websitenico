import { ReactNode, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export interface InventaireGridItem {
  id: string;
  itemKey: string;
  nom: string;
  categorie: string;
  description?: string | null;
  quantite: number;
  seuilAlerte: number;
  unite: string;
}

interface InventaireGridPanelProps {
  items: InventaireGridItem[];
  contextLabel?: string;
  intro?: string;
  step?: number;
  savingKey?: string | null;
  showAdd?: boolean;
  addLabel?: string;
  addModalTitle?: string;
  addForm?: ReactNode | ((close: () => void) => ReactNode);
  emptyLabel?: string;
  toolbarExtra?: ReactNode;
  allowRemove?: boolean;
  readOnly?: boolean;
  variant?: 'default' | 'matieres';
  onUpdate: (itemKey: string, data: { quantite?: number; seuilAlerte?: number }) => Promise<void>;
  onRemove?: (itemKey: string) => Promise<void>;
}

function stockLevel(quantite: number, seuil: number): number {
  if (seuil <= 0) return quantite > 0 ? 100 : 0;
  return Math.min(100, Math.round((quantite / (seuil * 2)) * 100));
}

function formatQty(value: number, step: number): string {
  if (step >= 1) return String(Math.round(value));
  return String(Number(value.toFixed(2)));
}

function renderCard(
  item: InventaireGridItem,
  opts: {
    step: number;
    savingKey: string | null;
    expandedId: string | null;
    localQty: Record<string, string>;
    variant: 'default' | 'matieres';
    allowRemove: boolean;
    readOnly: boolean;
    onRemove?: (itemKey: string) => Promise<void>;
    setExpandedId: (id: string | null) => void;
    setLocalQty: Dispatch<SetStateAction<Record<string, string>>>;
    adjustQuantite: (itemKey: string, delta: number) => Promise<void>;
    commitQuantite: (itemKey: string) => void;
    onUpdate: (itemKey: string, data: { quantite?: number; seuilAlerte?: number }) => Promise<void>;
    notify: (message: string) => void;
  },
) {
  const lowStock = item.quantite <= item.seuilAlerte;
  const level = stockLevel(item.quantite, item.seuilAlerte);
  const isSaving = opts.savingKey === item.itemKey;
  const isExpanded = opts.expandedId === item.id;
  const isMatieres = opts.variant === 'matieres';

  return (
    <article
      key={item.id}
      className={`inventaire-card ${isMatieres ? 'matiere-card' : ''} ${lowStock ? 'inventaire-card-alert' : ''} ${isSaving ? 'inventaire-card-saving' : ''}`}
    >
      {isMatieres && <div className="matiere-card-accent" aria-hidden />}

      <div className="inventaire-card-head">
        <div>
          {isMatieres ? (
            <>
              <span className="matiere-categorie-label">{item.categorie}</span>
              <h3>{item.nom}</h3>
              {item.description && <p className="matiere-description">{item.description}</p>}
            </>
          ) : (
            <>
              <h3>{item.nom}</h3>
              <span className="category-badge">{item.categorie}</span>
            </>
          )}
        </div>
        <span className={`stock-badge ${lowStock ? 'stock-badge-alert' : 'stock-badge-ok'}`}>
          {lowStock ? 'Stock bas' : 'OK'}
        </span>
      </div>

      {isMatieres && (
        <div className="matiere-qty-highlight">
          <span className="matiere-qty-value">
            {opts.localQty[item.itemKey] ?? formatQty(item.quantite, opts.step)}
          </span>
          <span className="matiere-qty-unit">{item.unite}</span>
          <span className="matiere-seuil-inline">
            Seuil : {formatQty(item.seuilAlerte, opts.step)} {item.unite}
          </span>
        </div>
      )}

      <div className="stock-bar" aria-hidden>
        <div
          className={`stock-bar-fill ${lowStock ? 'stock-bar-fill-alert' : ''}`}
          style={{ width: `${level}%` }}
        />
      </div>

      <div className="inventaire-card-qty">
        {opts.readOnly ? (
          <>
            <span className="inventaire-readonly-qty">
              {opts.localQty[item.itemKey] ?? formatQty(item.quantite, opts.step)}
            </span>
            {!isMatieres && <span className="qty-unit">{item.unite}</span>}
            <span className="matiere-seuil-inline">
              Seuil : {formatQty(item.seuilAlerte, opts.step)} {item.unite}
            </span>
          </>
        ) : (
          <>
        <button
          type="button"
          className="qty-btn qty-btn-minus"
          disabled={isSaving || item.quantite <= 0}
          onClick={() => opts.adjustQuantite(item.itemKey, -opts.step)}
          aria-label="Retirer"
        >
          −
        </button>
        <input
          type="number"
          min="0"
          step={opts.step}
          className="qty-input"
          value={opts.localQty[item.itemKey] ?? formatQty(item.quantite, opts.step)}
          disabled={isSaving}
          onChange={(e) =>
            opts.setLocalQty((prev) => ({ ...prev, [item.itemKey]: e.target.value }))
          }
          onBlur={() => opts.commitQuantite(item.itemKey)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
        <button
          type="button"
          className="qty-btn qty-btn-plus"
          disabled={isSaving}
          onClick={() => opts.adjustQuantite(item.itemKey, opts.step)}
          aria-label="Ajouter"
        >
          +
        </button>
        {!isMatieres && <span className="qty-unit">{item.unite}</span>}
          </>
        )}
      </div>

      {!opts.readOnly && (
      <div className="inventaire-card-foot">
        <button
          type="button"
          className={`btn btn-sm ${isMatieres ? 'btn-secondary' : 'btn-ghost'}`}
          onClick={() => opts.setExpandedId(isExpanded ? null : item.id)}
        >
          {isExpanded ? 'Moins d\'options' : isMatieres ? 'Ajuster le seuil' : 'Options'}
        </button>
        {isSaving && <span className="muted saving-label">Enregistrement...</span>}
      </div>
      )}

      {!opts.readOnly && isExpanded && (
        <div className="inventaire-card-options">
          <label>
            Seuil d'alerte ({item.unite})
            <input
              type="number"
              min="0"
              step={opts.step}
              defaultValue={item.seuilAlerte}
              disabled={isSaving}
              onBlur={(e) => {
                const value = Math.max(0, Number(e.target.value) || 0);
                if (value !== item.seuilAlerte) {
                  opts.onUpdate(item.itemKey, { seuilAlerte: value }).then(() =>
                    opts.notify('Seuil mis à jour'),
                  );
                }
              }}
            />
          </label>
          {opts.allowRemove && opts.onRemove && (
            <button
              type="button"
              className="btn btn-secondary btn-sm inventaire-remove-btn"
              disabled={isSaving}
              onClick={() => opts.onRemove!(item.itemKey)}
            >
              Retirer de l'inventaire
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function InventaireGridPanel({
  items,
  contextLabel,
  intro,
  step = 1,
  savingKey = null,
  showAdd = false,
  addLabel = '+ Ajouter',
  addModalTitle = 'Ajouter',
  addForm,
  emptyLabel = 'Aucun article dans l\'inventaire.',
  toolbarExtra,
  allowRemove = false,
  readOnly = false,
  variant = 'default',
  onUpdate,
  onRemove,
}: InventaireGridPanelProps) {
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [alertOnly, setAlertOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [localQty, setLocalQty] = useState<Record<string, string>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setLocalQty(Object.fromEntries(items.map((i) => [i.itemKey, formatQty(i.quantite, step)])));
  }, [items, step]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.categorie))].sort(),
    [items],
  );

  const stats = useMemo(() => {
    const alertes = items.filter((i) => i.quantite <= i.seuilAlerte).length;
    return { total: items.length, alertes, categories: categories.length };
  }, [items, categories]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = items.filter((item) => {
      if (alertOnly && item.quantite > item.seuilAlerte) return false;
      if (categorie && item.categorie !== categorie) return false;
      if (!query) return true;
      return (
        item.nom.toLowerCase().includes(query) ||
        item.categorie.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query) ?? false)
      );
    });
    if (variant === 'matieres') {
      return [...list].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    }
    return list;
  }, [items, search, categorie, alertOnly, variant]);

  async function adjustQuantite(itemKey: string, delta: number) {
    const item = items.find((i) => i.itemKey === itemKey);
    if (!item) return;
    const next = Math.max(0, Number((item.quantite + delta).toFixed(step < 1 ? 2 : 0)));
    setLocalQty((prev) => ({ ...prev, [itemKey]: formatQty(next, step) }));
    await onUpdate(itemKey, { quantite: next });
    notify('Stock mis à jour');
  }

  function commitQuantite(itemKey: string) {
    const raw = localQty[itemKey];
    const value = Math.max(0, Number(raw) || 0);
    const item = items.find((i) => i.itemKey === itemKey);
    if (!item || item.quantite === value) return;
    onUpdate(itemKey, { quantite: value }).then(() => notify('Stock mis à jour'));
  }

  async function handleRemove(itemKey: string) {
    if (!onRemove) return;
    if (!window.confirm('Retirer cet article de l\'inventaire ?')) return;
    await onRemove(itemKey);
    notify('Article retiré');
  }

  const cardOpts = {
    step,
    savingKey,
    expandedId,
    localQty,
    variant,
    allowRemove,
    readOnly,
    onRemove: handleRemove,
    setExpandedId,
    setLocalQty,
    adjustQuantite,
    commitQuantite,
    onUpdate,
    notify,
  };

  const isMatieres = variant === 'matieres';

  return (
    <>
      {toast && <p className="toast-banner">{toast}</p>}

      {intro && <p className="muted panel-intro">{intro}</p>}

      <div className={`stats-grid inventaire-stats ${isMatieres ? 'matiere-stats' : ''}`}>
        <div className="stat-card">
          <span className="stat-label">{isMatieres ? 'Matières suivies' : 'Articles en stock'}</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className={`stat-card ${stats.alertes > 0 ? 'stat-card-alert' : ''}`}>
          <span className="stat-label">À réapprovisionner</span>
          <span className="stat-value">{stats.alertes}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Familles</span>
          <span className="stat-value">{stats.categories}</span>
        </div>
        {contextLabel && !isMatieres && (
          <div className="stat-card stat-card-info">
            <span className="stat-label">Contexte</span>
            <span className="stat-value stat-value-sm">{contextLabel}</span>
          </div>
        )}
      </div>

      <section className="panel inventaire-toolbar">
        <div className="inventaire-toolbar-row">
          <label className="inventaire-search">
            <span className="sr-only">Rechercher</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isMatieres ? '🔍  Farine, beurre, levure…' : '🔍  Rechercher un article...'}
            />
          </label>

          {showAdd && addForm && !readOnly && (
            <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              {addLabel}
            </button>
          )}

          {toolbarExtra}
        </div>

        <div className="inventaire-filters">
          <button
            type="button"
            className={`filter-chip ${!categorie && !alertOnly ? 'active' : ''}`}
            onClick={() => { setCategorie(''); setAlertOnly(false); }}
          >
            Tous
          </button>
          <button
            type="button"
            className={`filter-chip ${alertOnly ? 'active' : ''}`}
            onClick={() => setAlertOnly((v) => !v)}
          >
            ⚠ Stock bas {stats.alertes > 0 && `(${stats.alertes})`}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`filter-chip ${categorie === cat ? 'active' : ''}`}
              onClick={() => setCategorie((c) => (c === cat ? '' : cat))}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className={`panel ${isMatieres ? 'matiere-panel' : ''}`}>
        {filtered.length === 0 ? (
          <div className="inventaire-empty">
            <p className="muted">
              {items.length === 0 ? emptyLabel : 'Aucun article ne correspond à votre recherche.'}
            </p>
            {showAdd && addForm && items.length === 0 && (
              <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                {isMatieres ? 'Ajouter la première matière' : 'Ajouter le premier article'}
              </button>
            )}
          </div>
        ) : isMatieres ? (
          <div className="table-wrap matiere-table-wrap">
            <table className="matiere-table">
              <thead>
                <tr>
                  <th>Matière</th>
                  <th>Catégorie</th>
                  <th>Stock</th>
                  <th>Seuil</th>
                  <th>Statut</th>
                  <th>Ajuster</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const lowStock = item.quantite <= item.seuilAlerte;
                  const isSaving = savingKey === item.itemKey;
                  const level = stockLevel(item.quantite, item.seuilAlerte);

                  return (
                    <tr
                      key={item.id}
                      className={`${lowStock ? 'row-alert matiere-row-alert' : ''} ${isSaving ? 'matiere-row-saving' : ''}`}
                    >
                      <td className="matiere-table-nom">
                        <strong>{item.nom}</strong>
                        {item.description && <small>{item.description}</small>}
                      </td>
                      <td>
                        <span className="category-badge">{item.categorie}</span>
                      </td>
                      <td className="matiere-table-stock">
                        <span className="matiere-table-qty">
                          {localQty[item.itemKey] ?? formatQty(item.quantite, step)}
                        </span>
                        <span className="matiere-table-unit">{item.unite}</span>
                        <div className="stock-bar matiere-table-bar" aria-hidden>
                          <div
                            className={`stock-bar-fill ${lowStock ? 'stock-bar-fill-alert' : ''}`}
                            style={{ width: `${level}%` }}
                          />
                        </div>
                      </td>
                      <td className="matiere-table-seuil">
                        <input
                          type="number"
                          min="0"
                          step={step}
                          className="matiere-seuil-input"
                          defaultValue={item.seuilAlerte}
                          disabled={isSaving}
                          onBlur={(e) => {
                            const value = Math.max(0, Number(e.target.value) || 0);
                            if (value !== item.seuilAlerte) {
                              onUpdate(item.itemKey, { seuilAlerte: value }).then(() =>
                                notify('Seuil mis à jour'),
                              );
                            }
                          }}
                        />
                        <span className="matiere-table-unit">{item.unite}</span>
                      </td>
                      <td>
                        <span className={`stock-badge ${lowStock ? 'stock-badge-alert' : 'stock-badge-ok'}`}>
                          {lowStock ? 'Bas' : 'OK'}
                        </span>
                      </td>
                      <td>
                        <div className="matiere-table-controls">
                          <button
                            type="button"
                            className="qty-btn qty-btn-minus"
                            disabled={isSaving || item.quantite <= 0}
                            onClick={() => adjustQuantite(item.itemKey, -step)}
                            aria-label="Retirer"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="0"
                            step={step}
                            className="qty-input matiere-table-input"
                            value={localQty[item.itemKey] ?? formatQty(item.quantite, step)}
                            disabled={isSaving}
                            onChange={(e) =>
                              setLocalQty((prev) => ({ ...prev, [item.itemKey]: e.target.value }))
                            }
                            onBlur={() => commitQuantite(item.itemKey)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                          />
                          <button
                            type="button"
                            className="qty-btn qty-btn-plus"
                            disabled={isSaving}
                            onClick={() => adjustQuantite(item.itemKey, step)}
                            aria-label="Ajouter"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="inventaire-grid">
            {filtered.map((item) => renderCard(item, cardOpts))}
          </div>
        )}
      </section>

      {showAddModal && addForm && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-panel"
            role="dialog"
            aria-labelledby="inventaire-add-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="inventaire-add-title">{addModalTitle}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowAddModal(false)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            {typeof addForm === 'function' ? addForm(() => setShowAddModal(false)) : addForm}
          </div>
        </div>
      )}
    </>
  );
}