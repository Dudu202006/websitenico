import { StockMarchandisesPanel } from '../components/StockPanels';
import { PageHeader } from '../components/UI';

export function MarchandisesPage() {
  return (
    <>
      <PageHeader
        title="Inventaire matières premières"
        subtitle="Vue d'ensemble de toutes les matières premières — ajustez les stocks en direct"
      />

      <StockMarchandisesPanel showAdd />
    </>
  );
}
