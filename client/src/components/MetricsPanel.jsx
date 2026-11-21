import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import WeeklyProofChart from './WeeklyProofChart';
import StateMessage from './StateMessage';

export default function MetricsPanel({ enabled = true }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['metrics-summary'],
    queryFn: ({ signal }) => api.getMetricsSummary({ signal }),
    enabled,
    retry: 1,
  });

  if (isLoading) {
    return (
      <section className="panel metrics-panel" aria-label="Proof metrics">
        <StateMessage>Loading momentum metrics…</StateMessage>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="panel metrics-panel" aria-label="Proof metrics">
        <StateMessage>
          Couldn&apos;t load metrics summary.{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </StateMessage>
      </section>
    );
  }

  const totals = data?.totals || {};
  const streak = data?.streak || {};
  const weekly = data?.weekly || [];

  const proofRateDisplay =
    totals.proofRate !== null && totals.proofRate !== undefined
      ? `${Math.round(totals.proofRate * 100)}%`
      : '—';

  return (
    <section className="panel metrics-panel" aria-labelledby="metrics-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Momentum</p>
          <h2 id="metrics-heading">Proof summary</h2>
        </div>
      </div>

      <div
        className="stats-grid metrics-stats-grid"
        aria-label="Proof statistics"
      >
        <div className="stat-card">
          <strong>{proofRateDisplay}</strong>
          <span>Proof rate</span>
        </div>
        <div className="stat-card">
          <strong>{streak.currentWeeks ?? 0} weeks</strong>
          <span>Current streak</span>
        </div>
        <div className="stat-card">
          <strong>{totals.withProof ?? 0}</strong>
          <span>Completed with proof</span>
        </div>
        <div className="stat-card">
          <strong>{totals.withoutProof ?? 0}</strong>
          <span>Completed without proof</span>
        </div>
      </div>

      <WeeklyProofChart weekly={weekly} />
    </section>
  );
}
