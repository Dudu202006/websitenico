import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { photosApi } from '../lib/api';
import { PageHeader } from '../components/UI';
import { PHOTO_CATEGORIES, type Photo, type PhotoInput } from '../types';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-BE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function GaleriePage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'PRODUCTION';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categorieFilter, setCategorieFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [form, setForm] = useState<PhotoInput>({ titre: '', description: '', categorie: 'Autre' });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await photosApi.list(categorieFilter || undefined);
      setPhotos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [categorieFilter]);

  useEffect(() => {
    return () => {
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    };
  }, [uploadPreview]);

  const filteredCount = useMemo(() => photos.length, [photos]);

  function openUpload() {
    setUploadFile(null);
    setUploadPreview('');
    setForm({ titre: '', description: '', categorie: 'Autre' });
    setUploadOpen(true);
    setError('');
  }

  function handleFilePick(file: File | null) {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    if (!file) {
      setUploadFile(null);
      setUploadPreview('');
      return;
    }
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    if (!form.titre?.trim()) {
      setForm((prev) => ({
        ...prev,
        titre: file.name.replace(/\.[^.]+$/, ''),
      }));
    }
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!uploadFile) {
      setError('Sélectionnez une image');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await photosApi.upload(uploadFile, form);
      setUploadOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(photo: Photo) {
    setSelected(photo);
    setForm({
      titre: photo.titre,
      description: photo.description ?? '',
      categorie: photo.categorie,
    });
    setEditOpen(true);
    setError('');
  }

  async function handleEdit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;

    setSaving(true);
    setError('');
    try {
      await photosApi.update(selected.id, form);
      setEditOpen(false);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(photo: Photo) {
    if (!window.confirm(`Supprimer « ${photo.titre} » ?`)) return;
    setError('');
    try {
      await photosApi.remove(photo.id);
      if (selected?.id === photo.id) setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  return (
    <>
      <PageHeader
        title="Galerie photos"
        subtitle={
          canEdit
            ? 'Ajoutez et organisez vos visuels produits, recettes, magasins et atelier'
            : 'Consultez les photos partagées par la production'
        }
        action={
          canEdit ? (
            <button type="button" className="btn btn-primary" onClick={openUpload}>
              + Ajouter une photo
            </button>
          ) : undefined
        }
      />

      {error && !uploadOpen && !editOpen && <p className="error-text">{error}</p>}

      <section className="panel galerie-toolbar">
        <div className="inventaire-filters">
          <button
            type="button"
            className={`filter-chip ${!categorieFilter ? 'active' : ''}`}
            onClick={() => setCategorieFilter('')}
          >
            Toutes
          </button>
          {PHOTO_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`filter-chip ${categorieFilter === cat ? 'active' : ''}`}
              onClick={() => setCategorieFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>
          {filteredCount} photo{filteredCount !== 1 ? 's' : ''}
        </h2>

        {loading ? (
          <p className="muted">Chargement de la galerie…</p>
        ) : filteredCount === 0 ? (
          <div className="galerie-empty">
            <p className="muted">Aucune photo pour le moment.</p>
            {canEdit && (
              <button type="button" className="btn btn-primary" onClick={openUpload}>
                Ajouter la première photo
              </button>
            )}
          </div>
        ) : (
          <div className="galerie-grid">
            {photos.map((photo) => (
              <article key={photo.id} className="galerie-card">
                <button
                  type="button"
                  className="galerie-card-image"
                  onClick={() => setSelected(photo)}
                >
                  <img src={photo.url} alt={photo.titre} loading="lazy" />
                </button>
                <div className="galerie-card-body">
                  <span className="category-badge">{photo.categorie}</span>
                  <h3>{photo.titre}</h3>
                  {photo.description && <p className="muted">{photo.description}</p>}
                  <small className="galerie-meta">
                    {formatDate(photo.createdAt)} · {formatSize(photo.taille)}
                  </small>
                  {canEdit && (
                    <div className="galerie-card-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEdit(photo)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDelete(photo)}
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && !editOpen && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div
            className="modal-panel modal-panel-wide galerie-lightbox"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{selected.titre}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelected(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <img src={selected.url} alt={selected.titre} className="galerie-lightbox-img" />
            <div className="galerie-lightbox-meta">
              <span className="category-badge">{selected.categorie}</span>
              {selected.description && <p>{selected.description}</p>}
              <small className="muted">
                Ajoutée le {formatDate(selected.createdAt)} · {formatSize(selected.taille)}
              </small>
            </div>
          </div>
        </div>
      )}

      {uploadOpen && (
        <div className="modal-overlay" onClick={() => setUploadOpen(false)}>
          <div className="modal-panel" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ajouter une photo</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setUploadOpen(false)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpload} className="add-form galerie-upload-form">
              {error && <p className="error-text">{error}</p>}

              <div
                className={`galerie-dropzone ${uploadFile ? 'galerie-dropzone-filled' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFilePick(file);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
                />
                {uploadPreview ? (
                  <img src={uploadPreview} alt="Aperçu" className="galerie-dropzone-preview" />
                ) : (
                  <>
                    <strong>Cliquez ou glissez une image ici</strong>
                    <span className="muted">JPG, PNG, WebP — max 8 Mo</span>
                  </>
                )}
              </div>

              <label>
                Titre
                <input
                  value={form.titre}
                  onChange={(e) => setForm((prev) => ({ ...prev, titre: e.target.value }))}
                />
              </label>

              <label>
                Description
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </label>

              <label>
                Catégorie
                <select
                  value={form.categorie}
                  onChange={(e) => setForm((prev) => ({ ...prev, categorie: e.target.value }))}
                >
                  {PHOTO_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              <button type="submit" className="btn btn-primary" disabled={saving || !uploadFile}>
                {saving ? 'Envoi en cours…' : 'Enregistrer la photo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {editOpen && selected && (
        <div className="modal-overlay" onClick={() => setEditOpen(false)}>
          <div className="modal-panel" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Modifier la photo</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditOpen(false)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEdit} className="add-form">
              {error && <p className="error-text">{error}</p>}

              <img src={selected.url} alt={selected.titre} className="galerie-edit-preview" />

              <label>
                Titre
                <input
                  value={form.titre}
                  onChange={(e) => setForm((prev) => ({ ...prev, titre: e.target.value }))}
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </label>

              <label>
                Catégorie
                <select
                  value={form.categorie}
                  onChange={(e) => setForm((prev) => ({ ...prev, categorie: e.target.value }))}
                >
                  {PHOTO_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
