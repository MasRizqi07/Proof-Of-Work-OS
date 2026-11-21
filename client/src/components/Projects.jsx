import { useState } from 'react';
import StateMessage from './StateMessage';

export default function Projects({
  projects,
  onCreate,
  onDelete,
  onUpdate,
  isPending,
  isDeleting,
  isLoading,
  error,
  onRetry,
}) {
  const [name, setName] = useState('');

  return (
    <section className="panel" aria-labelledby="projects-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h2 id="projects-heading">Projects</h2>
        </div>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              onCreate({ name: name.trim() });
              setName('');
            }
          }}
        >
          <input
            aria-label="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project"
            required
          />
          <button className="button" disabled={isPending}>
            Add
          </button>
        </form>
      </div>
      {isLoading ? (
        <StateMessage>Loading projects…</StateMessage>
      ) : error ? (
        <StateMessage>
          Couldn&apos;t load projects.{' '}
          <button type="button" className="link-button" onClick={onRetry}>
            Retry
          </button>
        </StateMessage>
      ) : !projects.length ? (
        <StateMessage>No projects yet.</StateMessage>
      ) : (
        <div className="project-grid">
          {projects.map((project) => {
            const done = project.taskCounts?.done ?? 0;
            const total = project.taskCounts?.total ?? 0;

            return (
              <div className="project-card" key={project.id}>
                <div className="project-card-header">
                  <strong>{project.name}</strong>
                  <span className="project-task-counts font-mono">
                    {done} of {total} done
                  </span>
                </div>
                <div className="project-meta-row">
                  <span className="project-status-tag">
                    {project.archivedAt ? 'archived' : project.status}
                  </span>
                  <select
                    aria-label={`Status for ${project.name}`}
                    value={project.status || 'active'}
                    onChange={(e) =>
                      onUpdate({ ...project, status: e.target.value })
                    }
                  >
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="completed">completed</option>
                  </select>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={isDeleting}
                    onClick={() => onDelete(project.id)}
                    aria-label={`Delete ${project.name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
