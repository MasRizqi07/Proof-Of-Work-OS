import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import StateMessage from './StateMessage';

const EVENT_LABELS = {
  'task.created': 'Created a task',
  'task.completed': 'Completed a task',
  'task.started': 'Started a task',
  'task.updated': 'Updated a task',
  'task.cancelled': 'Cancelled a task',
  'task.reopened': 'Reopened a task',
  'task.deleted': 'Deleted a task',
  'project.created': 'Created a project',
  'project.updated': 'Updated a project',
  'project.archived': 'Archived a project',
  'profile.updated': 'Updated profile',
};

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ActivityFeed({ enabled }) {
  const activitiesQuery = useQuery({
    queryKey: ['activities'],
    queryFn: ({ signal }) => api.getActivities({ signal }),
    retry: 1,
    enabled,
  });

  return (
    <section className="panel activity-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Timeline</p>
          <h2>Recent activity</h2>
        </div>
      </div>
      {activitiesQuery.isLoading ? (
        <StateMessage>Loading activity…</StateMessage>
      ) : activitiesQuery.isError ? (
        <StateMessage>
          Couldn't load activity.{' '}
          <button
            className="link-button"
            onClick={() => activitiesQuery.refetch()}
          >
            Retry
          </button>
        </StateMessage>
      ) : !activitiesQuery.data?.items?.length ? (
        <StateMessage>No activity yet. Start by creating a task.</StateMessage>
      ) : (
        <div className="activity-list">
          {activitiesQuery.data.items.map((event) => (
            <div className="activity-item" key={event.id}>
              <span
                className={`activity-dot activity-dot-${event.type.split('.')[1] || 'default'}`}
              />
              <div className="activity-content">
                <span className="activity-label">
                  {EVENT_LABELS[event.type] || event.type}
                </span>
                {event.metadata?.name && (
                  <span className="activity-detail">
                    {' '}
                    — {event.metadata.name}
                  </span>
                )}
                <span className="activity-time">
                  {formatRelativeTime(event.occurredAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
