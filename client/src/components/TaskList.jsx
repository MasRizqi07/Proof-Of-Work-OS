import StateMessage from './StateMessage';

export default function TaskList({ tasks, onDelete, onUpdate, isDeleting }) {
  if (!tasks.length) {
    return (
      <StateMessage>
        No tasks yet. Add the first one to get moving.
      </StateMessage>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <article key={task.id} className="task-card">
          <div>
            <h3>{task.title}</h3>
            <span className={`status status-${task.status}`}>
              {task.status}
            </span>
          </div>
          <div className="task-meta">
            <span>{task.priority} priority</span>
            <span>Due {task.dueDate || 'TBD'}</span>
            <select
              aria-label={`Status for ${task.title}`}
              value={task.status}
              onChange={(e) =>
                onUpdate({ id: task.id, status: e.target.value })
              }
            >
              <option value="todo">todo</option>
              <option value="in-progress">in-progress</option>
              <option value="done">done</option>
              <option value="cancelled">cancelled</option>
            </select>
            <button
              className="icon-button"
              disabled={isDeleting}
              onClick={() => onDelete(task.id)}
              aria-label={`Delete ${task.title}`}
            >
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

