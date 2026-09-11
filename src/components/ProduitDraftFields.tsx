import {
  PRODUIT_CATEGORIES,
  PRODUIT_UNITES,
  type ProduitDraft,
} from '../lib/produitCatalogue';

type ProduitDraftFieldsProps = {
  draft: ProduitDraft;
  onChange: (draft: ProduitDraft) => void;
  idPrefix?: string;
  compact?: boolean;
};

export function ProduitDraftFields({
  draft,
  onChange,
  idPrefix = 'produit',
  compact = false,
}: ProduitDraftFieldsProps) {
  function patch(partial: Partial<ProduitDraft>) {
    onChange({ ...draft, ...partial });
  }

  return (
    <div className={`produit-draft-fields ${compact ? 'produit-draft-fields-compact' : ''}`}>
      <label>
        Nom du produit
        <input
          id={`${idPrefix}-nom`}
          value={draft.nom}
          onChange={(e) => patch({ nom: e.target.value })}
          placeholder="Ex. : Croissant au beurre"
          required
        />
      </label>

      <label>
        Catégorie
        <select
          value={draft.categorie}
          onChange={(e) => patch({ categorie: e.target.value, categorieCustom: '' })}
        >
          {PRODUIT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </label>

      {draft.categorie === 'Autre' && (
        <label>
          Catégorie personnalisée
          <input
            value={draft.categorieCustom}
            onChange={(e) => patch({ categorieCustom: e.target.value })}
            placeholder="Ex. : Boisson chaude"
            required
          />
        </label>
      )}

      <label>
        Prix (€)
        <input
          type="number"
          min="0"
          step="0.01"
          value={draft.prix}
          onChange={(e) => patch({ prix: e.target.value })}
          placeholder="0.00"
          required
        />
      </label>

      <label>
        Unité
        <select value={draft.unite} onChange={(e) => patch({ unite: e.target.value })}>
          {PRODUIT_UNITES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>

      <label className="produit-draft-desc">
        Description
        <textarea
          rows={compact ? 2 : 3}
          value={draft.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="Courte description visible par les magasins…"
        />
      </label>
    </div>
  );
}
