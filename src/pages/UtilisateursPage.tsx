import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { magasinsApi, roleLabels, usersApi } from '../lib/api';
import { PageHeader } from '../components/UI';
import type { Magasin, Role, User, UserInput } from '../types';

const ROLES: Role[] = ['ADMIN', 'PRODUCTION', 'MAGASIN'];

type FormState = UserInput & { id?: string; passwordConfirm: string };

const emptyForm = (): FormState => ({
  email: '',
  nom: '',
  role: 'MAGASIN',
  magasinId: '',
  password: '',
  passwordConfirm: '',
});

function formFromUser(user: User): FormState {
  return {
    id: user.id,
    email: user.email,
    nom: user.nom,
    role: user.role,
    magasinId: user.magasinId ?? '',
    password: '',
    passwordConfirm: '',
  };
}

export function UtilisateursPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  async function load() {
    setError('');
    try {
      const [userList, magasinList] = await Promise.all([
        usersApi.list(),
        magasinsApi.list(),
      ]);
      setUsers(userList);
      setMagasins(magasinList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setFormOpen(true);
    setError('');
  }

  function openEdit(user: User) {
    setForm(formFromUser(user));
    setFormOpen(true);
    setError('');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.email.trim() || !form.nom.trim()) {
      setError('Email et nom requis');
      return;
    }

    if (form.role === 'MAGASIN' && !form.magasinId) {
      setError('Sélectionnez un magasin pour ce compte');
      return;
    }

    if (!form.id) {
      if (!form.password || form.password.length < 6) {
        setError('Mot de passe requis (6 caractères minimum)');
        return;
      }
      if (form.password !== form.passwordConfirm) {
        setError('Les mots de passe ne correspondent pas');
        return;
      }
    } else if (form.password) {
      if (form.password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        return;
      }
      if (form.password !== form.passwordConfirm) {
        setError('Les mots de passe ne correspondent pas');
        return;
      }
    }

    const payload: UserInput = {
      email: form.email.trim(),
      nom: form.nom.trim(),
      role: form.role,
      magasinId: form.role === 'MAGASIN' ? form.magasinId : null,
      ...(form.password ? { password: form.password } : {}),
    };

    setSaving(true);
    setError('');
    try {
      if (form.id) {
        await usersApi.update(form.id, payload);
      } else {
        await usersApi.create({ ...payload, password: form.password! });
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: User) {
    if (user.id === currentUser?.id) {
      setError('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }
    if (!window.confirm(`Supprimer le compte ${user.nom} (${user.email}) ?`)) return;

    setError('');
    try {
      await usersApi.remove(user.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        subtitle="Créez et gérez les comptes administrateur, production et magasins"
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Nouvel utilisateur
          </button>
        }
      />

      {error && !formOpen && <p className="error-text">{error}</p>}

      <section className="panel">
        <h2>{users.length} compte{users.length !== 1 ? 's' : ''}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Magasin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.nom}</strong>
                    {user.id === currentUser?.id && (
                      <span className="user-you-badge"> (vous)</span>
                    )}
                  </td>
                  <td>{user.email}</td>
                  <td>{roleLabels[user.role]}</td>
                  <td>{user.magasin?.nom ?? '—'}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEdit(user)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDelete(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div
            className="modal-panel"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{form.id ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setFormOpen(false)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="add-form">
              {error && <p className="error-text">{error}</p>}

              <label>
                Nom complet
                <input
                  value={form.nom}
                  onChange={(e) => setForm((prev) => ({ ...prev, nom: e.target.value }))}
                  required
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </label>

              <label>
                Rôle
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      role: e.target.value as Role,
                      magasinId: e.target.value === 'MAGASIN' ? prev.magasinId : '',
                    }))
                  }
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </label>

              {form.role === 'MAGASIN' && (
                <label>
                  Magasin rattaché
                  <select
                    value={form.magasinId ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, magasinId: e.target.value }))
                    }
                    required
                  >
                    <option value="">— Choisir un magasin —</option>
                    {magasins.map((magasin) => (
                      <option key={magasin.id} value={magasin.id}>
                        {magasin.nom}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                {form.id ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe'}
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  minLength={form.id ? undefined : 6}
                  required={!form.id}
                  autoComplete="new-password"
                />
              </label>

              <label>
                Confirmer le mot de passe
                <input
                  type="password"
                  value={form.passwordConfirm}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, passwordConfirm: e.target.value }))
                  }
                  required={!form.id || !!form.password}
                  autoComplete="new-password"
                />
              </label>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Enregistrement…' : form.id ? 'Enregistrer' : 'Créer le compte'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
