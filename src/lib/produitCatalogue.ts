export const PRODUIT_CATEGORIES = [
  'Pain',
  'Viennoiserie',
  'Pâtisserie',
  'Salé',
  'Snacking',
  'Autre',
] as const;

export const PRODUIT_UNITES = ['pièce', 'plateau', 'barquette', 'kg', 'g'] as const;

export type ProduitDraft = {
  nom: string;
  categorie: string;
  categorieCustom: string;
  description: string;
  prix: string;
  unite: string;
};

export function produitToDraft(produit: {
  nom: string;
  categorie: string;
  description?: string | null;
  prix: number;
  unite: string;
}): ProduitDraft {
  const isPreset = (PRODUIT_CATEGORIES as readonly string[]).includes(produit.categorie);
  return {
    nom: produit.nom,
    categorie: isPreset ? produit.categorie : 'Autre',
    categorieCustom: isPreset ? '' : produit.categorie,
    description: produit.description ?? '',
    prix: String(produit.prix),
    unite: produit.unite,
  };
}

export function draftCategorie(draft: ProduitDraft): string {
  return draft.categorie === 'Autre' ? draft.categorieCustom.trim() : draft.categorie;
}

export function draftToPayload(draft: ProduitDraft) {
  const categorie = draftCategorie(draft);
  return {
    nom: draft.nom.trim(),
    categorie,
    description: draft.description.trim() || undefined,
    prix: Number(draft.prix),
    unite: draft.unite.trim() || 'pièce',
  };
}

export function isDraftValid(draft: ProduitDraft): boolean {
  return Boolean(
    draft.nom.trim() &&
      draftCategorie(draft) &&
      draft.prix &&
      !Number.isNaN(Number(draft.prix)) &&
      Number(draft.prix) >= 0,
  );
}

export function isDraftDirty(
  produit: { nom: string; categorie: string; description?: string | null; prix: number; unite: string },
  draft: ProduitDraft,
): boolean {
  const payload = draftToPayload(draft);
  return (
    produit.nom !== payload.nom ||
    produit.categorie !== payload.categorie ||
    (produit.description ?? '') !== (payload.description ?? '') ||
    produit.prix !== payload.prix ||
    produit.unite !== payload.unite
  );
}

export const emptyProduitDraft = (): ProduitDraft => ({
  nom: '',
  categorie: 'Pain',
  categorieCustom: '',
  description: '',
  prix: '',
  unite: 'pièce',
});
