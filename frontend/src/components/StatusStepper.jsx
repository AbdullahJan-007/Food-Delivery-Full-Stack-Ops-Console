import { STATUS_LABELS } from '../lib/orderStatus';

const STEPS = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

export default function StatusStepper({ status }) {
  if (status === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-muted" />
        Cancelled
      </span>
    );
  }

  const currentIndex = STEPS.indexOf(status);

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <span
            className={`h-2 w-2 rounded-full ${
              i <= currentIndex ? 'bg-gradient-to-br from-ember to-paprika' : 'bg-line'
            }`}
            title={STATUS_LABELS[step]}
          />
          {i < STEPS.length - 1 && (
            <span
              className={`h-px w-5 sm:w-6 ${i < currentIndex ? 'bg-paprika' : 'bg-line'}`}
            />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs font-medium text-ink-muted whitespace-nowrap">
        {STATUS_LABELS[status]}
      </span>
    </div>
  );
}
