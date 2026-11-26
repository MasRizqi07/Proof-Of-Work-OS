import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { safeHref, getHostname } from '../lib/safeHref';
import StateMessage from './StateMessage';
import Icon from './Icon';

const DAY_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '365 days' },
];

function formatIsoDate(isoStr, timezone = 'UTC') {
  if (!isoStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) {
    const [y, m, d] = isoStr.split('-').map(Number);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(y, m - 1, d)));
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date(isoStr));
}

function formatGeneratedTimestamp(isoStr, timezone) {
  if (!isoStr) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone || 'UTC',
  }).format(new Date(isoStr));
}

export default function ProofReportPage({ enabled = true, onBack }) {
  const [days, setDays] = useState(30);

  const reportQuery = useQuery({
    queryKey: ['report', days],
    queryFn: ({ signal }) => api.getReport({ signal, days }),
    enabled,
    retry: 1,
  });

  const report = reportQuery.data;

  return (
    <section className="report-page" aria-labelledby="report-heading">
      <div className="report-toolbar no-print">
        <button
          type="button"
          className="button button-secondary button-sm"
          onClick={onBack}
        >
          Back to workspace
        </button>

        <div className="report-controls">
          <div
            className="report-range-group"
            role="group"
            aria-label="Report period"
          >
            {DAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`button button-sm ${days === opt.value ? 'button-primary' : 'button-ghost'}`}
                aria-pressed={days === opt.value}
                onClick={() => setDays(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="button button-primary button-sm"
            onClick={() => window.print()}
            disabled={!report}
          >
            <Icon name="note" size={14} />
            <span>Print or save as PDF</span>
          </button>
        </div>
      </div>

      {reportQuery.isLoading ? (
        <StateMessage>Preparing proof report…</StateMessage>
      ) : reportQuery.isError ? (
        <StateMessage>
          Couldn&apos;t load proof report.{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => reportQuery.refetch()}
          >
            Retry
          </button>
        </StateMessage>
      ) : report ? (
        <>
          <header className="report-header panel">
            <p className="eyebrow">Proof of Work OS · Report</p>
            <h1 id="report-heading">{report.displayName}</h1>
            <p className="report-meta-line font-mono">
              {formatIsoDate(report.from)} &ndash; {formatIsoDate(report.to)} (
              {report.days} days) &middot; Generated{' '}
              {formatGeneratedTimestamp(report.generatedAt, report.timezone)}{' '}
              &middot; {report.timezone}
            </p>
            <p className="report-disclaimer">
              Proof is attached by the owner. Merged-PR labels are checked
              against GitHub&apos;s public API.
            </p>

            <div className="report-summary-row font-mono">
              <span>Completed: {report.summary.completed}</span>
              <span>With proof: {report.summary.withProof}</span>
              <span>No proof: {report.summary.withoutProof}</span>
              <span>
                Proof rate:{' '}
                {report.summary.proofRate !== null &&
                report.summary.proofRate !== undefined
                  ? `${Math.round(report.summary.proofRate * 100)}%`
                  : '—'}
              </span>
            </div>
          </header>

          {report.weeks.length === 0 ? (
            <StateMessage>
              No completed tasks in the last {report.days} days.
            </StateMessage>
          ) : (
            <div className="report-weeks">
              {report.weeks.map((week) => (
                <section
                  key={week.weekStart}
                  className="report-week-section"
                  aria-label={`Week of ${formatIsoDate(week.weekStart)}`}
                >
                  <h2 className="report-week-heading font-mono">
                    Week of {formatIsoDate(week.weekStart)}
                  </h2>

                  <div className="report-task-list">
                    {week.tasks.map((task) => (
                      <article key={task.id} className="report-task-item panel">
                        <div className="report-task-header">
                          <div>
                            <h3 className="report-task-title">{task.title}</h3>
                            <p className="report-task-meta font-mono">
                              Completed{' '}
                              {formatIsoDate(task.completedAt, report.timezone)}
                              {task.projectName ? ` · ${task.projectName}` : ''}
                            </p>
                          </div>
                          <span
                            className={`proof-badge ${
                              task.hasProof
                                ? 'proof-badge-with'
                                : 'proof-badge-without'
                            }`}
                          >
                            <Icon
                              name={task.hasProof ? 'check' : 'alert'}
                              size={12}
                            />
                            <span>
                              {task.hasProof
                                ? `With proof · ${task.proofCount}`
                                : 'No proof yet'}
                            </span>
                          </span>
                        </div>

                        {task.description && (
                          <p className="report-task-description">
                            {task.description}
                          </p>
                        )}

                        {task.evidence.length > 0 && (
                          <ul className="report-evidence-list">
                            {task.evidence.map((ev) => {
                              const validHref =
                                ev.kind === 'url' ? safeHref(ev.url) : null;
                              return (
                                <li
                                  key={ev.id}
                                  className="report-evidence-item"
                                >
                                  <div className="report-evidence-head">
                                    <Icon
                                      name={ev.kind === 'url' ? 'link' : 'note'}
                                      size={14}
                                    />
                                    <strong>{ev.label}</strong>
                                    {ev.kind === 'url' && validHref ? (
                                      <a
                                        href={validHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="evidence-link font-mono"
                                      >
                                        {getHostname(validHref)}
                                      </a>
                                    ) : ev.kind === 'url' && ev.url ? (
                                      <span className="evidence-unsafe-url font-mono">
                                        {ev.url}
                                      </span>
                                    ) : null}
                                  </div>
                                  {ev.kind === 'note' && ev.body && (
                                    <pre className="report-note-body font-mono">
                                      {ev.body}
                                    </pre>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
