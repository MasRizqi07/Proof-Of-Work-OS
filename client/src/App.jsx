import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './lib/api';
import { useAuth } from './context/AuthContext';
import { useTasks } from './hooks/useTasks';
import { useProjects } from './hooks/useProjects';
import AuthPanel from './components/AuthPanel';
import StateMessage from './components/StateMessage';
import TaskForm from './components/TaskForm';
import TaskFilter from './components/TaskFilter';
import TaskList from './components/TaskList';
import Projects from './components/Projects';
import ProfileCard from './components/ProfileCard';
import ActivityFeed from './components/ActivityFeed';

const fallbackUser = {
  name: 'Demo developer',
  role: 'Software Engineer',
  metrics: { completedTasks: 0, weeklyActivityEvents: 0, projectsCompleted: 0 },
};

export default function App() {
  const { authLoading, authenticated, unauthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

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
    },
  );
  const { projectsQuery, createProject, updateProject, deleteProject } =
    useProjects(authenticated);

  const user = userQuery.data || fallbackUser;
  const projects = projectsQuery.data?.items || projectsQuery.data || [];

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
            <AuthPanel />
          </div>
          {!authLoading && authenticated && userQuery.data && (
            <ProfileCard user={userQuery.data} />
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
          We couldn't load your profile.{' '}
          <button className="link-button" onClick={() => userQuery.refetch()}>
            Try again
          </button>
        </StateMessage>
      )}
      <section className="stats-grid">
        {[
          ['completedTasks', 'Completed tasks'],
          ['weeklyActivityEvents', 'Activity this week'],
          ['projectsCompleted', 'Projects completed'],
        ].map(([key, label]) => (
          <div className="stat-card" key={key}>
            <strong>{user.metrics?.[key] ?? '—'}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>
      {!authLoading && authenticated && (
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
              projects={projects}
            />
            <TaskFilter
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              projectFilter={projectFilter}
              onProjectChange={setProjectFilter}
              projects={projects}
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
          <div className="sidebar-stack">
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
          </div>
        </main>
      )}
    </div>
  );
}
