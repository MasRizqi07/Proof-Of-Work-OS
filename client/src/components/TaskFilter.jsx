export default function TaskFilter({
  statusFilter,
  onStatusChange,
  projectFilter,
  onProjectChange,
  projects,
}) {
  return (
    <div className="task-filter">
      <label>
        Status{' '}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filter tasks by status"
        >
          <option value="">All</option>
          <option value="todo">Todo</option>
          <option value="in-progress">In progress</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>
      {projects.length > 0 && (
        <label>
          Project{' '}
          <select
            value={projectFilter}
            onChange={(e) => onProjectChange(e.target.value)}
            aria-label="Filter tasks by project"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
