import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './lib/api';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const fallbackUser = {
  name: 'Demo developer',
  role: 'Software Engineer',
  metrics: { weeklyPoints: 0, streakDays: 0, projectsCompleted: 0 },
};

function StateMessage({ children, action }) {
  return (
    <div className="state-message">
      {children}
      {action}
    </div>
  );
}

function AuthPanel({ session, onSignOut }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('sign-in');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured)
    return <span className="demo-badge">Demo mode</span>;
  if (session) {
    return (
      <button className="button button-ghost" onClick={onSignOut}>
        Sign out
      </button>
    );
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const result =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else
      setMessage(
        mode === 'sign-in' ? '' : 'Check your email to confirm your account.',
      );
  }

  return (
    <form className="auth-form" onSubmit={submit} aria-label="Authentication">
      <input
        aria-label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
      />
      <input
        aria-label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        minLength={6}
        required
      />
      <button className="button" disabled={busy}>
        {busy ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
      </button>
      <button
        type="button"
        className="link-button"
        onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
      >
        {mode === 'sign-in'
          ? 'Create an account'
          : 'Already have an account? Sign in'}
      </button>
      {message && (
        <small className="form-error" role="alert">
          {message}
        </small>
      )}
    </form>
  );
}

function TaskForm({ onCreate, isPending }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  function submit(event) {
    event.preventDefault();
    if (!title.trim()) return;
    onCreate({ title: title.trim(), priority, dueDate: dueDate || null });
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
          <option>low</option>
          <option>medium</option>
          <option>high</option>
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
      <button className="button" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add task'}
      </button>
    </form>
  );
}

function TaskList({ tasks, onDelete, onUpdate, isDeleting }) {
  if (!tasks.length)
    return (
      <StateMessage>
        No tasks yet. Add the first one to get moving.
      </StateMessage>
    );
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
              onChange={(e) => onUpdate({ ...task, status: e.target.value })}
            >
              <option value="todo">todo</option>
              <option value="in-progress">in-progress</option>
              <option value="done">done</option>
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

function Projects({
  projects,
  onCreate,
  onDelete,
  onUpdate,
  isPending,
  isDeleting,
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
      {error ? (
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
              <span>{project.status || 'active'}</span>
              <select
                aria-label={`Status for ${project.name}`}
                value={project.status || 'active'}
                onChange={(e) =>
                  onUpdate({ ...project, status: e.target.value })
                }
              >
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="done">done</option>
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

export default function App() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(null);
  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => setSession(nextSession),
    );
    return () => listener.subscription.unsubscribe();
  }, []);
  const userQuery = useQuery({
    queryKey: ['user'],
    queryFn: api.getUser,
    retry: 1,
  });
  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: api.getTasks,
    retry: 1,
  });
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
    retry: 1,
  });
  const createTask = useMutation({
    mutationFn: api.createTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
  const updateTask = useMutation({
    mutationFn: ({ id, ...task }) => api.updateTask(id, task),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
  const deleteTask = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
  const createProject = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
  const updateProject = useMutation({
    mutationFn: ({ id, ...project }) => api.updateProject(id, project),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
  const deleteProject = useMutation({
    mutationFn: api.deleteProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
  const user = userQuery.data || fallbackUser;

  async function signOut() {
    await supabase?.auth.signOut();
    setSession(null);
  }
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Proof of Work OS</p>
          <h1>Make progress visible.</h1>
          <p>
            One calm workspace for your tasks, projects, and professional
            momentum.
          </p>
        </div>
        <div className="user-card">
          <div className="user-card-heading">
            <div>
              <p className="user-name">{user.name}</p>
              <p>{user.role}</p>
            </div>
            <AuthPanel session={session} onSignOut={signOut} />
          </div>
          {!session && isSupabaseConfigured && (
            <AuthPanel session={session} onSignOut={signOut} />
          )}
        </div>
      </header>
      {userQuery.isError && (
        <StateMessage>
          We couldn't load your profile.{' '}
          <button className="link-button" onClick={() => userQuery.refetch()}>
            Try again
          </button>
        </StateMessage>
      )}
      <section className="stats-grid">
        {[
          ['weeklyPoints', 'Weekly points'],
          ['streakDays', 'Streak days'],
          ['projectsCompleted', 'Projects completed'],
        ].map(([key, label]) => (
          <div className="stat-card" key={key}>
            <strong>{user.metrics?.[key] ?? '—'}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <main className="dashboard-grid">
        <section className="panel tasks-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Today</p>
              <h2>Active work</h2>
            </div>
          </div>
          <TaskForm
            onCreate={(task) => createTask.mutate(task)}
            isPending={createTask.isPending}
          />
          {createTask.isError && (
            <StateMessage>
              Couldn't add that task. {createTask.error.message}
            </StateMessage>
          )}
          {updateTask.isError && (
            <StateMessage>
              Couldn't update that task. {updateTask.error.message}
            </StateMessage>
          )}
          {deleteTask.isError && (
            <StateMessage>
              Couldn't delete that task. {deleteTask.error.message}
            </StateMessage>
          )}
          {tasksQuery.isLoading ? (
            <StateMessage>Loading tasks…</StateMessage>
          ) : tasksQuery.isError ? (
            <StateMessage>
              Couldn't load tasks.{' '}
              <button
                className="link-button"
                onClick={() => tasksQuery.refetch()}
              >
                Retry
              </button>
            </StateMessage>
          ) : (
            <TaskList
              tasks={tasksQuery.data?.items || tasksQuery.data || []}
              onDelete={(id) => deleteTask.mutate(id)}
              onUpdate={(task) => updateTask.mutate(task)}
              isDeleting={deleteTask.isPending}
            />
          )}
        </section>
        <Projects
          projects={projectsQuery.data?.items || projectsQuery.data || []}
          onCreate={(project) => createProject.mutate(project)}
          onUpdate={(project) => updateProject.mutate(project)}
          onDelete={(id) => deleteProject.mutate(id)}
          isPending={createProject.isPending}
          isDeleting={deleteProject.isPending}
          error={projectsQuery.isError}
          onRetry={() => projectsQuery.refetch()}
        />
      </main>
    </div>
  );
}
