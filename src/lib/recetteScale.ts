export const PORTION_UNITES = ['personnes', 'pièces', 'kg', 'L'] as const;
export const INGREDIENT_UNITES = ['g', 'kg', 'ml', 'L', 'pièce', 'cs', 'cc'] as const;

export type PortionUnite = (typeof PORTION_UNITES)[number];

export function formatQuantite(valeur: number, unite: string): string {
  const rounded =
    Math.abs(valeur - Math.round(valeur)) < 0.01
      ? Math.round(valeur)
      : Math.round(valeur * 100) / 100;
  return unite ? `${rounded} ${unite}` : String(rounded);
}

export function scaleQuantite(
  baseValeur: number,
  basePortions: number,
  targetPortions: number,
): number {
  if (basePortions <= 0 || targetPortions <= 0) return baseValeur;
  return (baseValeur * targetPortions) / basePortions;
}

export function ingredientDisplay(
  ing: { quantiteValeur?: number | null; quantiteUnite?: string | null; quantite?: string | null },
  basePortions: number,
  targetPortions: number,
): string {
  if (ing.quantiteValeur != null && ing.quantiteUnite) {
    const scaled = scaleQuantite(ing.quantiteValeur, basePortions, targetPortions);
    return formatQuantite(scaled, ing.quantiteUnite);
  }
  return ing.quantite ?? '—';
}

export function portionLabel(unite: string, count: number): string {
  if (unite === 'personnes') return count === 1 ? '1 personne' : `${count} personnes`;
  return `${count} ${unite}`;
}
