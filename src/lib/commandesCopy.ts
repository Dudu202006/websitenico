import type { Role, StatutCommande } from '../types';
import { statutLabels } from './api';

export const COMMANDES_COPY = {
  list: {
    title: {
      MAGASIN: 'Mes commandes',
      PRODUCTION: 'Commandes reçues',
      ADMIN: 'Commandes',
    } satisfies Record<Role, string>,
    subtitle: {
      MAGASIN: 'Suivez l’avancement de vos commandes et ajoutez des annotations si besoin.',
      PRODUCTION: 'Commandes transmises par les magasins — ouvrez une ligne pour la traiter.',
      ADMIN: 'Vue globale des commandes en cours, tous magasins confondus.',
    } satisfies Record<Role, string>,
    empty: {
      MAGASIN: 'Aucune commande en cours. Passez une nouvelle commande à l’atelier.',
      PRODUCTION: 'Aucune commande en attente de traitement.',
      ADMIN: 'Aucune commande en cours.',
    } satisfies Record<Role, string>,
    columns: {
      numero: 'N° commande',
      magasin: 'Magasin',
      date: 'Date de commande',
      articles: 'Contenu',
      annotations: 'Annotations',
      statut: 'Statut',
    },
  },
  detail: {
    loadingTitle: 'Commande',
    loadingSubtitle: 'Chargement en cours…',
    back: '← Retour à la liste',
    sections: {
      infos: 'Informations',
      workflow: 'Avancement',
      annotations: 'Annotations',
      articles: 'Articles commandés',
    },
    fields: {
      numero: 'N° commande',
      date: 'Date de commande',
      magasin: 'Magasin',
      statut: 'Statut',
      annotations: 'Annotations pour l’atelier',
    },
    annotationsHint:
      'Précisez une date de livraison, une urgence ou toute remarque utile pour la production.',
    annotationsPlaceholder:
      'Ex. : livraison demain matin à 6 h, produit fragile, modification demandée…',
    articlesIntroProduction:
      'Ajustez les quantités ou ajoutez des articles, y compris hors catalogue.',
    articlesIntroReadonly: 'Récapitulatif des articles demandés par le magasin.',
    addCatalogue: 'Ajouter depuis le catalogue',
    addHorsCatalogue: 'Ajouter un article hors catalogue',
    selectArticle: 'Sélectionner un article…',
    articleNamePlaceholder: 'Ex. : Pain aux noix 500 g',
    saveAnnotations: 'Enregistrer les annotations',
    saveArticles: 'Enregistrer les articles',
    saving: 'Enregistrement…',
    updatingStatus: 'Mise à jour…',
    columns: {
      article: 'Article',
      categorie: 'Catégorie',
      prixUnitaire: 'Prix unitaire',
      quantite: 'Quantité',
      total: 'Total',
    },
    horsCatalogue: 'Hors catalogue',
    add: 'Ajouter',
    remove: 'Retirer',
    noPrice: 'Non tarifé',
  },
  new: {
    title: 'Nouvelle commande',
    subtitle: 'Sélectionnez les articles du catalogue ou saisissez une demande hors catalogue.',
    catalogue: 'Articles du catalogue',
    search: 'Rechercher',
    searchPlaceholder: 'Nom ou catégorie…',
    horsCatalogue: 'Article hors catalogue',
    horsCatalogueIntro:
      'Pour une demande spéciale ou un produit absent du catalogue.',
    articleName: 'Désignation de l’article',
    articleNamePlaceholder: 'Ex. : Pain aux noix 500 g',
    quantite: 'Quantité',
    annotations: 'Annotations',
    annotationsHint: 'Informations utiles pour la préparation ou la livraison.',
    annotationsPlaceholder:
      'Ex. : livraison demain matin à 6 h, substitution acceptée…',
    submit: 'Envoyer la commande',
    submitting: 'Envoi en cours…',
    add: 'Ajouter à la commande',
    remove: 'Retirer',
    emptySearch: 'Aucun article ne correspond à votre recherche.',
  },
  errors: {
    articleNameRequired: 'Indiquez la désignation de l’article.',
    quantityPositive: 'La quantité doit être supérieure à zéro.',
    atLeastOneArticle: 'Ajoutez au moins un article à la commande.',
    atLeastOneWithQty: 'Ajoutez au moins un article avec une quantité valide.',
    alreadyInOrder: 'Cet article figure déjà dans la commande.',
    generic: 'Une erreur est survenue.',
    load: 'Impossible de charger les données.',
  },
  dashboard: {
    recentMagasin: 'Mes dernières commandes',
    recentGlobal: 'Commandes récentes',
    emptyMagasin: 'Aucune commande en cours.',
    seeAll: 'Voir toutes les commandes',
    pending: 'Commandes en attente',
  },
} as const;

const statutActions: Partial<Record<StatutCommande, string>> = {
  EN_PREPARATION: 'Mettre en préparation',
  EXPEDIEE: 'Marquer comme expédiée',
  LIVREE: 'Confirmer la livraison',
};

export function statutActionLabel(next: StatutCommande): string {
  return statutActions[next] ?? `Passer à : ${statutLabels[next]}`;
}

export const workflowSteps: { key: StatutCommande; label: string }[] = [
  { key: 'EN_ATTENTE', label: 'Reçue' },
  { key: 'EN_PREPARATION', label: 'En préparation' },
  { key: 'EXPEDIEE', label: 'Expédiée' },
  { key: 'LIVREE', label: 'Livrée' },
];

export function resumeCommande(lignes: { quantite: number; produit?: { nom: string } | null; nomLibre?: string | null }[]): string {
  if (lignes.length === 0) return '—';
  const parts = lignes.map((l) => {
    const nom = l.produit?.nom ?? l.nomLibre ?? 'Article';
    return `${l.quantite} × ${nom}`;
  });
  const text = parts.join(', ');
  return text.length > 72 ? `${text.slice(0, 69)}…` : text;
}

export function libelleRoleCommandes(role: Role | undefined): string {
  if (!role) return COMMANDES_COPY.list.title.ADMIN;
  return COMMANDES_COPY.list.title[role];
}

export function sousTitreRoleCommandes(role: Role | undefined): string {
  if (!role) return COMMANDES_COPY.list.subtitle.ADMIN;
  return COMMANDES_COPY.list.subtitle[role];
}

export function messageListeVide(role: Role | undefined): string {
  if (!role) return COMMANDES_COPY.list.empty.ADMIN;
  return COMMANDES_COPY.list.empty[role];
}
