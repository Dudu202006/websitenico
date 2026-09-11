import { useAuth } from '../context/AuthContext';
import { InventaireMagasinPanel } from '../components/InventaireMagasinPanel';
import { PageHeader } from '../components/UI';

export function InventairePage() {
  const { user } = useAuth();
  const magasinId = user?.magasinId;

  if (!magasinId) {
    return <p className="error-text">Aucun magasin associé à ce compte.</p>;
  }

  return (
    <>
      <PageHeader
        title="Inventaire du magasin"
        subtitle={
          user?.magasin
            ? `${user.magasin.nom} — recherchez, filtrez et ajustez votre stock en un clic`
            : undefined
        }
      />

      <InventaireMagasinPanel
        magasinId={magasinId}
        magasinNom={user?.magasin?.nom}
      />
    </>
  );
}
