import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './lib/api';
import { isSupabaseConfigured } from './lib/supabase';
import { useAuth } from './context/AuthContext';
import { useTasks } from './hooks/useTasks';
import { useProjects } from './hooks/useProjects';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import AuthPanel from './components/AuthPanel';
import StateMessage from './components/StateMessage';
import MetricsPanel from './components/MetricsPanel';
import ProofReportPage from './components/ProofReportPage';
import TaskForm from './components/TaskForm';
import TaskFilter from './components/TaskFilter';
import TaskList from './components/TaskList';
import Projects from './components/Projects';
import ProfileCard from './components/ProfileCard';
import ActivityFeed from './components/ActivityFeed';
import ThemeToggle from './components/ThemeToggle';
import CommandPalette from './components/CommandPalette';
import ShortcutsHelpDialog from './components/ShortcutsHelpDialog';
import OfflineBanner from './components/OfflineBanner';
import ConfigRequired from './components/ConfigRequired';
import Icon from './components/Icon';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeDetailTask, setActiveDetailTask] = useState(null);
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );

  const searchInputRef = useRef(null);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to);
      setPathname(to);
    }
  };

  const isReportRoute = pathname === '/report';

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
      q: searchQuery || undefined,
    },
  );
  const { projectsQuery, createProject, updateProject, deleteProject } =
    useProjects(authenticated);

  const user = userQuery.data || null;
  const projects = projectsQuery.data?.items || projectsQuery.data || [];
  const loadedTasks = tasksQuery.data?.items || tasksQuery.data || [];

  // Register global shortcuts (PRD K-01, K-02)
  useKeyboardShortcuts({
    onOpenPalette: () => setIsPaletteOpen(true),
    onFocusNewTask: () => {
      const el = document.getElementById('new-task-title');
      el?.focus();
    },
    onFocusSearch: () => {
      searchInputRef.current?.focus();
    },
    onToggleTheme: () => {
      const btn = document.querySelector('.theme-toggle');
      btn?.click();
    },
    onOpenHelp: () => setIsHelpOpen(true),
    isEnabled: authenticated,
  });

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
              <div className="header-quick-actions">
                {authenticated && (
                  <>
                    <button
                      type="button"
                      className="button button-ghost button-sm header-action-btn"
                      onClick={() => setIsPaletteOpen(true)}
                      aria-keyshortcuts="Control+k Meta+k"
                    >
                      <Icon name="command" size={14} />
                      <span className="hide-on-mobile">Palette</span>
                      <kbd aria-hidden="true">Ctrl+K</kbd>
                    </button>
                    <button
                      type="button"
                      className="button button-ghost button-sm header-action-btn"
                      onClick={() => setIsHelpOpen(true)}
                      aria-keyshortcuts="?"
                    >
                      <Icon name="help" size={14} />
                      <span className="hide-on-mobile">Shortcuts</span>
                      <kbd aria-hidden="true">?</kbd>
                    </button>
                  </>
                )}
                <ThemeToggle />
              </div>
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
        {!isReportRoute && (
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
        )}

        {!authLoading && authenticated && isReportRoute && (
          <main id="main" tabIndex="-1">
            <ProofReportPage
              enabled={authenticated}
              onBack={() => navigate('/')}
            />
          </main>
        )}

        {!authLoading && authenticated && !isReportRoute && (
          <main id="main" tabIndex="-1" className="dashboard-grid">
            <div className="dashboard-main-stack">
              <MetricsPanel
                enabled={authenticated}
                onOpenReport={() => navigate('/report')}
              />

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
                  searchValue={searchQuery}
                  onSearchChange={setSearchQuery}
                  searchInputRef={searchInputRef}
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
                    tasks={loadedTasks}
                    onDelete={(id) => deleteTask.mutate(id)}
                    onUpdate={(task) => updateTask.mutateAsync(task)}
                    isDeleting={deleteTask.isPending}
                    projects={projects}
                    searchQuery={searchQuery}
                    activeDetailTask={activeDetailTask}
                    onOpenDetail={setActiveDetailTask}
                    onCloseDetail={() => setActiveDetailTask(null)}
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

      {/* Global Modals for Interaction Layer (Fase 12) */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        tasks={loadedTasks}
        onNewTask={() => {
          const el = document.getElementById('new-task-title');
          el?.focus();
        }}
        onFilterProof={(val) => setProofFilter(val)}
        onToggleTheme={() => {
          const btn = document.querySelector('.theme-toggle');
          btn?.click();
        }}
        onOpenHelp={() => setIsHelpOpen(true)}
        onSelectTask={(task) => {
          navigate('/');
          setActiveDetailTask(task);
        }}
        onPrintReport={() => {
          if (isReportRoute) {
            window.print();
          } else {
            navigate('/report');
          }
        }}
      />

      <ShortcutsHelpDialog
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </>
  );
}
