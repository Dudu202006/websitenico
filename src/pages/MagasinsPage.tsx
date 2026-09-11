import { FormEvent, useEffect, useState } from 'react';
import { magasinsApi } from '../lib/api';
import { PageHeader } from '../components/UI';
import type { Magasin } from '../types';

export function MagasinsPage() {
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      setMagasins(await magasinsApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await magasinsApi.create({ nom, adresse, telephone: telephone || undefined });
      setNom('');
      setAdresse('');
      setTelephone('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  return (
    <>
      <PageHeader title="Magasins" subtitle="Gestion des points de vente" />

      {error && <p className="error-text">{error}</p>}

      <div className="grid-2">
        <section className="panel">
          <h2>Liste des magasins</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Adresse</th>
                  <th>Téléphone</th>
                </tr>
              </thead>
              <tbody>
                {magasins.map((magasin) => (
                  <tr key={magasin.id}>
                    <td><strong>{magasin.nom}</strong></td>
                    <td>{magasin.adresse}</td>
                    <td>{magasin.telephone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel form-panel">
          <h2>Ajouter un magasin</h2>
          <form onSubmit={handleSubmit} className="add-form">
            <label>
              Nom
              <input value={nom} onChange={(e) => setNom(e.target.value)} required />
            </label>
            <label>
              Adresse
              <input value={adresse} onChange={(e) => setAdresse(e.target.value)} required />
            </label>
            <label>
              Téléphone
              <input value={telephone} onChange={(e) => setTelephone(e.target.value)} />
            </label>
            <button type="submit" className="btn btn-primary">Créer le magasin</button>
          </form>
        </section>
      </div>
    </>
  );
}
