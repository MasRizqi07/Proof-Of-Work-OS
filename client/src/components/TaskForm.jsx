import { useState } from 'react';

export default function TaskForm({ onCreate, isPending, projects }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');

  function submit(event) {
    event.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      priority,
      dueDate: dueDate || null,
      projectId: projectId || null,
    });
    setTitle('');
    setDueDate('');
  }

  return (
    <form className="task-form" onSubmit={submit}>
      <label>
        Title{' '}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task title"
          required
        />
      </label>
      <label>
        Priority{' '}
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="urgent">urgent</option>
        </select>
      </label>
      <label>
        Due date{' '}
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </label>
      {projects && projects.length > 0 && (
        <label>
          Project{' '}
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <button className="button" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add task'}
      </button>
    </form>
  );
}
