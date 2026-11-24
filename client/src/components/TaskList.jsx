import { useState, useRef } from 'react';
import StateMessage from './StateMessage';
import Icon from './Icon';
import TaskDetailDialog from './TaskDetailDialog';
import DeleteConfirmDialog from './DeleteConfirmDialog';

export default function TaskList({
  tasks,
  onDelete,
  onUpdate,
  isDeleting = false,
  projects = [],
  searchQuery = '',
  activeDetailTask: controlledDetailTask,
  onOpenDetail,
  onCloseDetail,
}) {
  const [internalDetailTask, setInternalDetailTask] = useState(null);
  const activeDetailTask =
    controlledDetailTask !== undefined
      ? controlledDetailTask
      : internalDetailTask;
  const setActiveDetailTask = onOpenDetail || setInternalDetailTask;
  const [activeDeleteTask, setActiveDeleteTask] = useState(null);
  const [pendingTaskIds, setPendingTaskIds] = useState(new Set());
  const [inlineErrors, setInlineErrors] = useState({});

  const detailTriggerRef = useRef(null);
  const deleteTriggerRef = useRef(null);

  if (!tasks.length) {
    if (searchQuery) {
      return <StateMessage>No tasks match “{searchQuery}”</StateMessage>;
    }
    return (
      <StateMessage>
        No tasks yet. Add the first one to get moving.
      </StateMessage>
    );
  }

  // Create project lookup map for fast name display
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  // Find the fresh object for activeDetailTask if it updated
  const currentDetailTask = activeDetailTask
    ? tasks.find((t) => t.id === activeDetailTask.id) || activeDetailTask
    : null;

  const handleStatusChange = async (task, newStatus) => {
    setPendingTaskIds((prev) => new Set(prev).add(task.id));
    setInlineErrors((prev) => {
      const next = { ...prev };
      delete next[task.id];
      return next;
    });

    try {
      await onUpdate({ id: task.id, status: newStatus });
    } catch {
      setInlineErrors((prev) => ({
        ...prev,
        [task.id]: "Couldn't update this task. Your change was undone.",
      }));
    } finally {
      setPendingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const openDetail = (task, triggerEl) => {
    detailTriggerRef.current = triggerEl;
    if (
      typeof document !== 'undefined' &&
      document.startViewTransition &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      document.startViewTransition(() => {
        setActiveDetailTask(task);
      });
    } else {
      setActiveDetailTask(task);
    }
  };

  const closeDetail = () => {
    if (onCloseDetail) {
      onCloseDetail();
    } else {
      setInternalDetailTask(null);
    }
    setTimeout(() => {
      detailTriggerRef.current?.focus?.();
    }, 0);
  };

  return (
    <>
      <div className="task-list">
        {tasks.map((task) => {
          const isDone = task.status === 'done';
          const projectName = task.projectId
            ? projectMap.get(task.projectId)
            : null;
          const isTaskBusy = pendingTaskIds.has(task.id);
          const inlineError = inlineErrors[task.id];

          return (
            <article
              key={task.id}
              className="task-card"
              aria-busy={isTaskBusy ? 'true' : undefined}
              style={isTaskBusy ? { opacity: 0.7 } : undefined}
            >
              <div className="task-card-header">
                <div>
                  <h3 className="task-title">{task.title}</h3>
                  {task.description && (
                    <p className="task-desc-preview">{task.description}</p>
                  )}
                </div>

                <div className="task-badges-row">
                  {/* Status Badge */}
                  <span className={`status status-${task.status}`}>
                    {task.status === 'done' ? (
                      <Icon name="check" size={12} />
                    ) : task.status === 'in-progress' ? (
                      <Icon name="clock" size={12} />
                    ) : task.status === 'cancelled' ? (
                      <Icon name="x" size={12} />
                    ) : (
                      <span className="status-dot"></span>
                    )}
                    <span>{task.status}</span>
                  </span>

                  {/* Proof Badge (only for done tasks) */}
                  {isDone && task.hasProof && (
                    <span className="proof-badge proof-badge-with">
                      <Icon name="check" size={12} />
                      <span>With proof · </span>
                      <code className="font-mono">{task.proofCount}</code>
                    </span>
                  )}

                  {isDone && !task.hasProof && (
                    <div className="no-proof-container">
                      <span className="proof-badge proof-badge-without">
                        <Icon name="alert" size={12} />
                        <span>No proof yet</span>
                      </span>
                      <button
                        type="button"
                        className="button button-secondary button-xs"
                        onClick={(e) => openDetail(task, e.currentTarget)}
                      >
                        Add proof
                      </button>
                    </div>
                  )}

                  {/* Non-done tasks with proof */}
                  {!isDone && (task.proofCount || 0) > 0 && (
                    <span className="proof-badge-neutral font-mono">
                      {task.proofCount} proof
                    </span>
                  )}

                  {/* Overdue Badge */}
                  {task.overdue && (
                    <span className="badge-overdue">
                      <Icon name="clock" size={12} />
                      <span>Overdue</span>
                    </span>
                  )}
                </div>
              </div>

              {inlineError && (
                <div role="alert" className="task-inline-alert">
                  <Icon name="alert" size={14} />
                  <span>{inlineError}</span>
                </div>
              )}

              <div className="task-meta">
                <span className="task-priority-tag">
                  {task.priority} priority
                </span>
                <span className="task-due-tag font-mono">
                  Due {task.dueDate ? task.dueDate.slice(0, 10) : 'TBD'}
                </span>
                {projectName && (
                  <span className="task-project-tag">{projectName}</span>
                )}

                <div className="task-actions-row">
                  <select
                    aria-label={`Status for ${task.title}`}
                    value={task.status}
                    disabled={isTaskBusy}
                    onChange={(e) => handleStatusChange(task, e.target.value)}
                  >
                    <option value="todo">todo</option>
                    <option value="in-progress">in-progress</option>
                    <option value="done">done</option>
                    <option value="cancelled">cancelled</option>
                  </select>

                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    onClick={(e) => openDetail(task, e.currentTarget)}
                    aria-label={`Open details for ${task.title}`}
                  >
                    Details
                  </button>

                  <button
                    type="button"
                    className="icon-button"
                    disabled={isDeleting || isTaskBusy}
                    onClick={(e) => {
                      deleteTriggerRef.current = e.currentTarget;
                      setActiveDeleteTask(task);
                    }}
                    aria-label={`Delete ${task.title}`}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        isOpen={Boolean(currentDetailTask)}
        task={currentDetailTask}
        projects={projects}
        onClose={closeDetail}
        onUpdateTask={async (patch) => {
          await onUpdate(patch);
          setActiveDetailTask((curr) => (curr ? { ...curr, ...patch } : null));
        }}
        onDeleteRequest={(t) => {
          setActiveDetailTask(null);
          setActiveDeleteTask(t);
        }}
      />

      {/* Task Delete Confirm Dialog */}
      <DeleteConfirmDialog
        isOpen={Boolean(activeDeleteTask)}
        task={activeDeleteTask}
        onClose={() => {
          setActiveDeleteTask(null);
          setTimeout(() => {
            deleteTriggerRef.current?.focus?.();
          }, 0);
        }}
        onConfirm={(id) => {
          onDelete(id);
          setActiveDeleteTask(null);
        }}
        isDeleting={isDeleting}
      />
    </>
  );
}
