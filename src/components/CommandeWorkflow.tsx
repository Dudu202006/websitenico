import { statutLabels } from '../lib/api';
import { workflowSteps } from '../lib/commandesCopy';
import type { StatutCommande } from '../types';

const activeOrder: StatutCommande[] = [
  'EN_ATTENTE',
  'EN_PREPARATION',
  'EXPEDIEE',
  'LIVREE',
];

export function CommandeWorkflow({ statut }: { statut: StatutCommande }) {
  if (statut === 'ANNULEE') {
    return (
      <p className="commande-workflow-cancelled">
        Commande <strong>annulée</strong>
      </p>
    );
  }

  const currentIndex = activeOrder.indexOf(statut);

  return (
    <ol className="commande-workflow" aria-label="Avancement de la commande">
      {workflowSteps.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const upcoming = index > currentIndex;

        return (
          <li
            key={step.key}
            className={`commande-workflow-step ${done ? 'done' : ''} ${current ? 'current' : ''} ${upcoming ? 'upcoming' : ''}`}
            aria-current={current ? 'step' : undefined}
          >
            <span className="commande-workflow-dot" aria-hidden />
            <span className="commande-workflow-label">{step.label}</span>
            {current && (
              <span className="commande-workflow-status">{statutLabels[statut]}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
