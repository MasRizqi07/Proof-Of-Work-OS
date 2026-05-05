import { useEffect, useState } from 'react';

const apiBase = 'http://localhost:4000/api';

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    fetch(`${apiBase}/user`).then((res) => res.json()).then(setUser);
    fetch(`${apiBase}/tasks`).then((res) => res.json()).then(setTasks);
  }, []);

  const handleCreate = async () => {
    if (!newTask.trim()) return;
    const response = await fetch(`${apiBase}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTask }),
    });
    const created = await response.json();
    setTasks((prev) => [...prev, created]);
    setNewTask('');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Proof of Work OS</p>
          <h1>Developer performance tracking & AI career system</h1>
          <p>Track productivity, tasks, and career coaching insights in one dashboard.</p>
        </div>
        <div className="user-card">
          {user ? (
            <>
              <p className="user-name">{user.name}</p>
              <p>{user.role}</p>
            </>
          ) : (
            <p>Loading user...</p>
          )}
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <strong>{user?.metrics.weeklyPoints ?? '––'}</strong>
          <span>Weekly points</span>
        </div>
        <div className="stat-card">
          <strong>{user?.metrics.streakDays ?? '––'}</strong>
          <span>Streak days</span>
        </div>
        <div className="stat-card">
          <strong>{user?.metrics.projectsCompleted ?? '––'}</strong>
          <span>Projects completed</span>
        </div>
      </section>

      <section className="tasks-panel">
        <div className="tasks-header">
          <h2>Active work items</h2>
          <div className="task-input-row">
            <input
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              placeholder="New task title"
            />
            <button onClick={handleCreate}>Add task</button>
          </div>
        </div>

        <div className="task-list">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <article key={task.id} className="task-card">
                <div>
                  <h3>{task.title}</h3>
                  <span>{task.status}</span>
                </div>
                <div className="task-meta">
                  <span>{task.priority} priority</span>
                  <span>Due {task.dueDate || 'TBD'}</span>
                </div>
              </article>
            ))
          ) : (
            <p>No tasks found.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
