const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(error.error || 'Une erreur est survenue');
  }

  return response.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: import('../types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => api<import('../types').User>('/auth/me'),
};

export const magasinsApi = {
  list: () => api<import('../types').Magasin[]>('/magasins'),
  get: (id: string) => api<import('../types').Magasin>(`/magasins/${id}`),
  create: (data: Pick<import('../types').Magasin, 'nom' | 'adresse' | 'telephone'>) =>
    api<import('../types').Magasin>('/magasins', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const produitsApi = {
  list: () => api<import('../types').Produit[]>('/produits'),
  create: (data: Partial<import('../types').Produit>) =>
    api<import('../types').Produit>('/produits', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<import('../types').Produit>) =>
    api<import('../types').Produit>(`/produits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    api<{ success: boolean }>(`/produits/${id}`, { method: 'DELETE' }),
};

export const inventaireApi = {
  list: (magasinId: string) =>
    api<import('../types').InventaireMagasin[]>(`/inventaire?magasinId=${magasinId}`),
  update: (produitId: string, data: { magasinId: string; quantite?: number; seuilAlerte?: number }) =>
    api<import('../types').InventaireMagasin>(`/inventaire/${produitId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  remove: (produitId: string, magasinId: string) =>
    api<{ success: boolean }>(`/inventaire/${produitId}?magasinId=${magasinId}`, {
      method: 'DELETE',
    }),
  addArticle: (data: {
    magasinId: string;
    nom: string;
    categorie?: string;
    quantite?: number;
    seuilAlerte?: number;
    unite?: string;
    prix?: number;
  }) =>
    api<import('../types').InventaireMagasin>('/inventaire/article', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const commandesApi = {
  list: (params?: { statut?: string; magasinId?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return api<import('../types').Commande[]>(`/commandes${query ? `?${query}` : ''}`);
  },
  get: (id: string) => api<import('../types').Commande>(`/commandes/${id}`),
  create: (data: { lignes: import('../types').LigneCommandeInput[]; notes?: string; magasinId?: string }) =>
    api<import('../types').Commande>('/commandes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatut: (id: string, statut: import('../types').StatutCommande) =>
    api<import('../types').Commande>(`/commandes/${id}/statut`, {
      method: 'PATCH',
      body: JSON.stringify({ statut }),
    }),
  update: (
    id: string,
    data: { lignes?: import('../types').LigneCommandeInput[]; notes?: string },
  ) =>
    api<import('../types').Commande>(`/commandes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

export const stockApi = {
  produits: () => api<import('../types').StockProduit[]>('/stock/produits'),
  updateProduit: (produitId: string, data: { quantite?: number; seuilAlerte?: number }) =>
    api<import('../types').StockProduit>(`/stock/produits/${produitId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  marchandises: () => api<import('../types').StockMarchandise[]>('/stock/marchandises'),
  updateMarchandise: (marchandiseId: string, data: { quantite?: number; seuilAlerte?: number }) =>
    api<import('../types').StockMarchandise>(`/stock/marchandises/${marchandiseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const marchandisesApi = {
  list: () => api<import('../types').Marchandise[]>('/marchandises'),
  create: (data: Partial<import('../types').Marchandise> & { quantite?: number; seuilAlerte?: number }) =>
    api<import('../types').Marchandise>('/marchandises', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const dashboardApi = {
  get: () => api<import('../types').DashboardData>('/dashboard'),
};

export const recettesApi = {
  list: (q?: string) => {
    const query = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    return api<import('../types').Recette[]>(`/recettes${query}`);
  },
  get: (id: string) => api<import('../types').Recette>(`/recettes/${id}`),
  create: (data: import('../types').RecetteInput, photo?: File | null) =>
    saveRecette('/recettes', 'POST', data, photo),
  update: (id: string, data: Partial<import('../types').RecetteInput>, photo?: File | null) =>
    saveRecette(`/recettes/${id}`, 'PATCH', data, photo),
  remove: (id: string) =>
    api<{ success: boolean }>(`/recettes/${id}`, { method: 'DELETE' }),
};

async function saveRecette(
  path: string,
  method: 'POST' | 'PATCH',
  data: Partial<import('../types').RecetteInput>,
  photo?: File | null,
) {
  const token = getToken();
  const hasPhoto = photo instanceof File;
  const hasRemovePhoto = data.removePhoto === true;

  if (!hasPhoto && !hasRemovePhoto) {
    return api<import('../types').Recette>(path, {
      method,
      body: JSON.stringify(data),
    });
  }

  const formData = new FormData();
  if (data.nom !== undefined) formData.append('nom', data.nom);
  if (data.description !== undefined) formData.append('description', data.description);
  if (data.instructions !== undefined) formData.append('instructions', data.instructions);
  if (data.allergenes !== undefined) formData.append('allergenes', JSON.stringify(data.allergenes));
  if (data.portionsBase !== undefined) formData.append('portionsBase', String(data.portionsBase));
  if (data.unitePortion !== undefined) formData.append('unitePortion', data.unitePortion);
  if (data.ingredients !== undefined) formData.append('ingredients', JSON.stringify(data.ingredients));
  if (data.magasinIds !== undefined) formData.append('magasinIds', JSON.stringify(data.magasinIds));
  if (hasRemovePhoto) formData.append('removePhoto', 'true');
  if (hasPhoto) formData.append('photo', photo);

  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(error.error || 'Une erreur est survenue');
  }

  return response.json() as Promise<import('../types').Recette>;
}

export const evenementsApi = {
  list: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return api<import('../types').EvenementProduction[]>(
      `/evenements${query ? `?${query}` : ''}`,
    );
  },
  get: (id: string) => api<import('../types').EvenementProduction>(`/evenements/${id}`),
  create: (data: import('../types').EvenementInput) =>
    api<import('../types').EvenementProduction>('/evenements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<import('../types').EvenementInput>) =>
    api<import('../types').EvenementProduction>(`/evenements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    api<{ success: boolean }>(`/evenements/${id}`, { method: 'DELETE' }),
};

export const usersApi = {
  list: () => api<import('../types').User[]>('/users'),
  create: (data: import('../types').UserInput) =>
    api<import('../types').User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<import('../types').UserInput>) =>
    api<import('../types').User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    api<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),
};

export const photosApi = {
  list: (categorie?: string) => {
    const query = categorie?.trim() ? `?categorie=${encodeURIComponent(categorie.trim())}` : '';
    return api<import('../types').Photo[]>(`/photos${query}`);
  },
  upload: async (file: File, data: import('../types').PhotoInput = {}) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    if (data.titre?.trim()) formData.append('titre', data.titre.trim());
    if (data.description?.trim()) formData.append('description', data.description.trim());
    if (data.categorie) formData.append('categorie', data.categorie);

    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/photos`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
      throw new Error(error.error || 'Une erreur est survenue');
    }

    return response.json() as Promise<import('../types').Photo>;
  },
  update: (id: string, data: import('../types').PhotoInput) =>
    api<import('../types').Photo>(`/photos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    api<{ success: boolean }>(`/photos/${id}`, { method: 'DELETE' }),
};

export const typeEvenementLabels: Record<import('../types').TypeEvenement, string> = {
  CONGE: 'Congé',
  RDV: 'Rendez-vous',
  PRODUCTION: 'Production',
  LIVRAISON: 'Livraison',
  AUTRE: 'Autre',
};

export const couleursParType: Record<import('../types').TypeEvenement, string> = {
  CONGE: '#4A90D9',
  RDV: '#E67E22',
  PRODUCTION: '#8B6914',
  LIVRAISON: '#9B59B6',
  AUTRE: '#7F8C8D',
};

export const statutLabels: Record<import('../types').StatutCommande, string> = {
  EN_ATTENTE: 'En attente',
  EN_PREPARATION: 'En préparation',
  EXPEDIEE: 'Expédiée',
  LIVREE: 'Livrée',
  ANNULEE: 'Annulée',
};

export const roleLabels: Record<import('../types').Role, string> = {
  ADMIN: 'Administrateur',
  MAGASIN: 'Magasin',
  PRODUCTION: 'Production',
};
