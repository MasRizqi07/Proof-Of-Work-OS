import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './lib/api';
import { isSupabaseConfigured } from './lib/supabase';
import { useAuth } from './context/AuthContext';
import { useTasks } from './hooks/useTasks';
import { useProjects } from './hooks/useProjects';
import AuthPanel from './components/AuthPanel';
import StateMessage from './components/StateMessage';
import MetricsPanel from './components/MetricsPanel';
import TaskForm from './components/TaskForm';
import TaskFilter from './components/TaskFilter';
import TaskList from './components/TaskList';
import Projects from './components/Projects';
import ProfileCard from './components/ProfileCard';
import ActivityFeed from './components/ActivityFeed';
import ThemeToggle from './components/ThemeToggle';
import OfflineBanner from './components/OfflineBanner';
import ConfigRequired from './components/ConfigRequired';

function getMissingConfig() {
  const missing = [];
  if (!import.meta.env.VITE_SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY)
    missing.push('VITE_SUPABASE_ANON_KEY');
  if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
    missing.push('VITE_API_URL');
  }
  return missing;
}

export default function App() {
  const missingConfig = getMissingConfig();
  if (!isSupabaseConfigured || missingConfig.length > 0) {
    return <ConfigRequired missingVars={missingConfig} />;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { authLoading, authenticated, unauthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [proofFilter, setProofFilter] = useState('');

  const userQuery = useQuery({
    queryKey: ['user'],
    queryFn: ({ signal }) => api.getUser({ signal }),
    retry: 1,
    enabled: authenticated,
  });

  const { tasksQuery, createTask, updateTask, deleteTask } = useTasks(
    authenticated,
    {
      status: statusFilter || undefined,
      projectId: projectFilter || undefined,
      hasProof: proofFilter || undefined,
    },
  );
  const { projectsQuery, createProject, updateProject, deleteProject } =
    useProjects(authenticated);

  const user = userQuery.data || null;
  const projects = projectsQuery.data?.items || projectsQuery.data || [];

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <OfflineBanner />
      <div className="app-shell">
        <header className="app-header">
          <div>
            <div className="header-eyebrow-row">
              <p className="eyebrow">Proof of Work OS</p>
              <ThemeToggle />
            </div>
            <h1>Make progress visible.</h1>
            <p>
              One calm workspace for your tasks, projects, and professional
              momentum.
            </p>
          </div>
          <div className="user-card">
            <div className="user-card-heading">
              <div>
                <p className="user-name">{user?.name || 'Welcome'}</p>
                <p>
                  {user?.role ||
                    (authenticated ? 'Developer' : 'Sign in to begin')}
                </p>
              </div>
              <AuthPanel />
            </div>
            {!authLoading && authenticated && user && (
              <ProfileCard user={user} />
            )}
          </div>
        </header>

        {authLoading ? (
          <StateMessage>Checking your session…</StateMessage>
        ) : unauthenticated ? (
          <StateMessage>Sign in to access your workspace.</StateMessage>
        ) : null}

        {!authLoading && authenticated && userQuery.isError && (
          <StateMessage>
            We couldn&apos;t load your profile.{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => userQuery.refetch()}
            >
              Try again
            </button>
          </StateMessage>
        )}

        {/* Overview Stats (PRD M-03 preservation) */}
        <section className="stats-grid" aria-label="Overview statistics">
          {[
            ['completedTasks', 'Completed tasks'],
            ['weeklyActivityEvents', 'Activity this week'],
            ['projectsCompleted', 'Projects completed'],
          ].map(([key, label]) => (
            <div className="stat-card" key={key}>
              <strong>{user?.metrics?.[key] ?? '—'}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>

        {!authLoading && authenticated && (
          <main id="main" tabIndex="-1" className="dashboard-grid">
            <div className="dashboard-main-stack">
              <MetricsPanel enabled={authenticated} />

              <section
                className="panel tasks-panel"
                aria-labelledby="tasks-heading"
              >
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Today</p>
                    <h2 id="tasks-heading">Active work</h2>
                  </div>
                </div>
                <TaskForm
                  onCreate={(task) => createTask.mutate(task)}
                  isPending={createTask.isPending}
                  projects={projects}
                />
                <TaskFilter
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  projectFilter={projectFilter}
                  onProjectChange={setProjectFilter}
                  proofFilter={proofFilter}
                  onProofChange={setProofFilter}
                  projects={projects}
                />
                {createTask.isError && (
                  <StateMessage>
                    Couldn&apos;t add that task. {createTask.error.message}
                  </StateMessage>
                )}
                {updateTask.isError && (
                  <StateMessage>
                    Couldn&apos;t update that task. {updateTask.error.message}
                  </StateMessage>
                )}
                {deleteTask.isError && (
                  <StateMessage>
                    Couldn&apos;t delete that task. {deleteTask.error.message}
                  </StateMessage>
                )}
                {tasksQuery.isLoading ? (
                  <StateMessage>Loading tasks…</StateMessage>
                ) : tasksQuery.isError ? (
                  <StateMessage>
                    Couldn&apos;t load tasks.{' '}
                    <button
                      type="button"
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
                    onUpdate={(task) => updateTask.mutateAsync(task)}
                    isDeleting={deleteTask.isPending}
                    projects={projects}
                  />
                )}
              </section>
            </div>

            <aside className="sidebar-stack" aria-label="Projects and activity">
              <Projects
                projects={projects}
                onCreate={(project) => createProject.mutate(project)}
                onUpdate={(project) => updateProject.mutate(project)}
                onDelete={(id) => deleteProject.mutate(id)}
                isPending={createProject.isPending}
                isDeleting={deleteProject.isPending}
                isLoading={projectsQuery.isLoading}
                error={projectsQuery.isError}
                onRetry={() => projectsQuery.refetch()}
              />
              <ActivityFeed enabled={authenticated} />
            </aside>
          </main>
        )}
      </div>
    </>
  );
}
