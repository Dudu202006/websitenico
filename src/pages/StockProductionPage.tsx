import { StockProduitsPanel } from '../components/StockPanels';
import { PageHeader } from '../components/UI';

export function StockProductionPage() {
  return (
    <>
      <PageHeader
        title="Inventaire produits finis"
        subtitle="Stock central au centre de production — recherchez, filtrez et ajustez en un clic"
      />

      <StockProduitsPanel showAdd contextLabel="Produits finis" />
    </>
  );
}
