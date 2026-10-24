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
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h2>Projects</h2>
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
          Couldn't load projects.{' '}
          <button className="link-button" onClick={onRetry}>
            Retry
          </button>
        </StateMessage>
      ) : !projects.length ? (
        <StateMessage>No projects yet.</StateMessage>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <div className="project-card" key={project.id}>
              <strong>{project.name}</strong>
              <span>{project.archivedAt ? 'archived' : project.status}</span>
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
                className="icon-button"
                disabled={isDeleting}
                onClick={() => onDelete(project.id)}
                aria-label={`Delete ${project.name}`}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
