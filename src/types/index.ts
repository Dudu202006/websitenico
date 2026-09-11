export type Role = 'ADMIN' | 'MAGASIN' | 'PRODUCTION';

export type StatutCommande =
  | 'EN_ATTENTE'
  | 'EN_PREPARATION'
  | 'EXPEDIEE'
  | 'LIVREE'
  | 'ANNULEE';

export interface Magasin {
  id: string;
  nom: string;
  adresse: string;
  telephone?: string | null;
  actif: boolean;
  _count?: {
    commandes: number;
    inventaires: number;
  };
}

export interface Produit {
  id: string;
  nom: string;
  description?: string | null;
  categorie: string;
  prix: number;
  unite: string;
  actif: boolean;
}

export interface InventaireMagasin {
  id: string;
  magasinId: string;
  produitId: string;
  quantite: number;
  seuilAlerte: number;
  produit: Produit;
  magasin?: Magasin;
}

export type LigneCommandeInput =
  | { produitId: string; quantite: number }
  | { nomLibre: string; quantite: number };

export interface LigneCommande {
  id: string;
  produitId?: string | null;
  nomLibre?: string | null;
  quantite: number;
  produit?: Produit | null;
}

export function ligneLabel(ligne: LigneCommande): string {
  return ligne.produit?.nom ?? ligne.nomLibre ?? 'Article';
}

export function ligneCategorie(ligne: LigneCommande): string {
  return ligne.produit?.categorie ?? 'Hors catalogue';
}

export interface Commande {
  id: string;
  numero: string;
  magasinId: string;
  statut: StatutCommande;
  notes?: string | null;
  magasin?: Magasin;
  lignes: LigneCommande[];
  createdAt: string;
}

export interface Marchandise {
  id: string;
  nom: string;
  description?: string | null;
  categorie: string;
  unite: string;
  actif: boolean;
  stock?: StockMarchandise | null;
}

export interface StockProduit {
  id: string;
  produitId: string;
  quantite: number;
  seuilAlerte: number;
  produit: Produit;
}

export interface StockMarchandise {
  id: string;
  marchandiseId: string;
  quantite: number;
  seuilAlerte: number;
  marchandise: Marchandise;
}

export interface User {
  id: string;
  email: string;
  nom: string;
  role: Role;
  magasinId?: string | null;
  magasin?: Magasin | null;
  createdAt?: string;
  updatedAt?: string;
}

export type UserInput = {
  email: string;
  nom: string;
  role: Role;
  magasinId?: string | null;
  password?: string;
};

export interface DashboardData {
  stats: {
    magasinsActifs: number;
    commandesEnAttente: number;
    alertesStockProduction: number;
    alertesInventaireMagasins: number;
  };
  commandesRecentes: Commande[];
  alertes: {
    stockProduits: StockProduit[];
    stockMarchandises: StockMarchandise[];
    inventairesMagasins: InventaireMagasin[];
  };
}

export interface RecetteIngredient {
  id: string;
  recetteId: string;
  nom: string;
  quantite?: string | null;
  quantiteValeur?: number | null;
  quantiteUnite?: string | null;
}

export interface RecettePartage {
  id: string;
  recetteId: string;
  magasinId: string;
  magasin?: Magasin;
}

export interface Recette {
  id: string;
  nom: string;
  description?: string | null;
  instructions?: string | null;
  allergenes: string[];
  portionsBase: number;
  unitePortion: string;
  photoFilename?: string | null;
  photoMimeType?: string | null;
  photoUrl?: string | null;
  ingredients?: RecetteIngredient[];
  partages?: RecettePartage[];
  createdAt: string;
  updatedAt: string;
}

export type RecetteInput = {
  nom: string;
  description?: string;
  instructions?: string;
  allergenes: string[];
  portionsBase: number;
  unitePortion: string;
  ingredients: {
    nom: string;
    quantite?: string;
    quantiteValeur?: number;
    quantiteUnite?: string;
  }[];
  magasinIds: string[];
  removePhoto?: boolean;
};

export type TypeEvenement = 'CONGE' | 'RDV' | 'PRODUCTION' | 'LIVRAISON' | 'AUTRE';

export interface EvenementProduction {
  id: string;
  titre: string;
  description?: string | null;
  type: TypeEvenement;
  couleur: string;
  dateDebut: string;
  dateFin: string;
  jourEntier: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EvenementInput = {
  titre: string;
  description?: string;
  type: TypeEvenement;
  couleur?: string;
  dateDebut: string;
  dateFin: string;
  jourEntier?: boolean;
};

export interface Photo {
  id: string;
  titre: string;
  description?: string | null;
  categorie: string;
  filename: string;
  mimeType: string;
  taille: number;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export type PhotoInput = {
  titre?: string;
  description?: string;
  categorie?: string;
};

export const PHOTO_CATEGORIES = ['Produits', 'Recettes', 'Magasins', 'Atelier', 'Autre'] as const;
