import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { safeHref, getHostname } from '../lib/safeHref';
import Icon from './Icon';

export default function TaskDetailDialog({
  isOpen,
  task,
  projects = [],
  onClose,
  onUpdateTask,
  onDeleteRequest,
}) {
  if (!isOpen || !task) return null;

  return (
    <TaskDetailDialogModal
      key={task.id}
      isOpen={isOpen}
      task={task}
      projects={projects}
      onClose={onClose}
      onUpdateTask={onUpdateTask}
      onDeleteRequest={onDeleteRequest}
    />
  );
}

function TaskDetailDialogModal({
  isOpen,
  task,
  projects,
  onClose,
  onUpdateTask,
  onDeleteRequest,
}) {
  const dialogRef = useRef(null);
  const titleHeadingRef = useRef(null);
  const queryClient = useQueryClient();

  // Task edit state initialized directly from prop
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status || 'todo');
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [progress, setProgress] = useState(task.progress ?? 0);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? task.dueDate.slice(0, 10) : '',
  );
  const [projectId, setProjectId] = useState(task.projectId || '');
  const [taskSaved, setTaskSaved] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Evidence state
  const [kind, setKind] = useState('url'); // 'url' | 'note'
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceBody, setEvidenceBody] = useState('');
  const [evidenceError, setEvidenceError] = useState('');

  // Modal open/close handling & initial focus & backdrop click
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
        titleHeadingRef.current?.focus();
      }

      const handleBackdropClick = (e) => {
        if (e.target === dialog) {
          onClose();
        }
      };
      const handleCancel = (e) => {
        e.preventDefault();
        onClose();
      };
      dialog.addEventListener('click', handleBackdropClick);
      dialog.addEventListener('cancel', handleCancel);

      return () => {
        dialog.removeEventListener('click', handleBackdropClick);
        dialog.removeEventListener('cancel', handleCancel);
      };
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen, onClose]);

  // Query live evidence for this task
  const evidenceQuery = useQuery({
    queryKey: ['evidence', task.id],
    queryFn: ({ signal }) => api.getEvidence(task.id, { signal }),
    enabled: Boolean(isOpen && task.id),
  });

  const addEvidenceMutation = useMutation({
    mutationFn: (newEvidence) => api.addEvidence(task.id, newEvidence),
    onSuccess: () => {
      setEvidenceLabel('');
      setEvidenceUrl('');
      setEvidenceBody('');
      setEvidenceError('');
      queryClient.invalidateQueries({ queryKey: ['evidence', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['report'] });
    },
    onError: (err) => {
      setEvidenceError(
        err.message ||
          "Couldn't save this proof. Check the link starts with http:// or https:// and try again.",
      );
    },
  });

  const deleteEvidenceMutation = useMutation({
    mutationFn: (evidenceId) => api.deleteEvidence(task.id, evidenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['report'] });
    },
    onError: (err) => {
      setEvidenceError(err.message || "Couldn't remove this proof.");
    },
  });

  const evidenceItems = evidenceQuery.data?.items || [];
  const evidenceCount = evidenceQuery.data?.total ?? evidenceItems.length;

  async function handleSaveTask(e) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const patch = {};
    if (trimmedTitle !== (task.title || '')) {
      patch.title = trimmedTitle;
    }
    const trimmedDesc = description.trim();
    if (trimmedDesc !== (task.description || '')) {
      patch.description = trimmedDesc || null;
    }
    if (status !== (task.status || 'todo')) {
      patch.status = status;
    }
    if (priority !== (task.priority || 'medium')) {
      patch.priority = priority;
    }
    if (Number(progress) !== (task.progress ?? 0)) {
      patch.progress = Number(progress);
    }
    const taskDue = task.dueDate ? task.dueDate.slice(0, 10) : '';
    if (dueDate !== taskDue) {
      patch.dueDate = dueDate || null;
    }
    const taskProj = task.projectId || '';
    if (projectId !== taskProj) {
      patch.projectId = projectId || null;
    }

    if (Object.keys(patch).length === 0) {
      return;
    }

    setTaskError('');
    setTaskSaved(false);
    setIsSaving(true);

    try {
      await onUpdateTask({ id: task.id, ...patch });
      setTaskSaved(true);
      setTimeout(() => setTaskSaved(false), 2000);
    } catch (err) {
      // Revert form values back to original task
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'todo');
      setPriority(task.priority || 'medium');
      setProgress(task.progress ?? 0);
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
      setProjectId(task.projectId || '');
      setTaskError(
        err?.message || "Couldn't update this task. Your change was undone.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleAddEvidence(e) {
    e.preventDefault();
    setEvidenceError('');

    const trimmedLabel = evidenceLabel.trim();
    if (!trimmedLabel) {
      setEvidenceError('Please provide a label for this proof.');
      return;
    }

    if (kind === 'url') {
      const trimmedUrl = evidenceUrl.trim();
      if (!trimmedUrl) {
        setEvidenceError('Please provide a URL.');
        return;
      }
      if (!/^https?:\/\//i.test(trimmedUrl)) {
        setEvidenceError(
          "Couldn't save this proof. Check the link starts with http:// or https:// and try again.",
        );
        return;
      }
      addEvidenceMutation.mutate({
        kind: 'url',
        label: trimmedLabel,
        url: trimmedUrl,
      });
    } else {
      const trimmedBody = evidenceBody.trim();
      if (!trimmedBody) {
        setEvidenceError('Please provide note content.');
        return;
      }
      if (trimmedBody.length > 2000) {
        setEvidenceError('Note cannot exceed 2000 characters.');
        return;
      }
      addEvidenceMutation.mutate({
        kind: 'note',
        label: trimmedLabel,
        body: trimmedBody,
      });
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="task-detail-dialog"
      aria-labelledby="task-detail-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="task-detail-content">
        <div className="dialog-header">
          <h2 id="task-detail-title" ref={titleHeadingRef} tabIndex="-1">
            Task details
          </h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Section 1: Edit task form */}
        <form className="task-edit-form" onSubmit={handleSaveTask}>
          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label>
            Description
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about this task"
            />
          </label>

          <div className="form-row">
            <label>
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="todo">todo</option>
                <option value="in-progress">in-progress</option>
                <option value="done">done</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>

            <label>
              Priority
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Progress ({progress}%)
              <input
                type="number"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
              />
            </label>

            <label>
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
          </div>

          <label>
            Project
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

          <div className="form-submit-row">
            <button type="submit" className="button" disabled={isSaving}>
              Save changes
            </button>
            {taskSaved && (
              <span className="save-feedback" role="status">
                Saved.
              </span>
            )}
          </div>
          {taskError && (
            <p className="state-message error" role="alert">
              {taskError}
            </p>
          )}
        </form>

        <hr className="dialog-divider" />

        {/* Section 2: Proof of work / Evidence */}
        <section
          className="evidence-section"
          aria-labelledby="evidence-heading"
        >
          <div className="evidence-heading-row">
            <h3 id="evidence-heading">Proof of work</h3>
            <span className="evidence-count-badge font-mono">
              {evidenceCount} / 20
            </span>
          </div>

          {evidenceQuery.isLoading ? (
            <p className="state-message">Loading proof…</p>
          ) : evidenceItems.length === 0 ? (
            <p className="evidence-empty">
              No proof attached yet. Attach a link or text snippet to prove
              completion.
            </p>
          ) : (
            <ul className="evidence-list" aria-label="Attached proof items">
              {evidenceItems.map((item) => (
                <li key={item.id} className="evidence-item">
                  <div className="evidence-item-header">
                    <span className="evidence-kind-badge">
                      <Icon
                        name={item.kind === 'url' ? 'link' : 'note'}
                        size={14}
                      />
                      <span>{item.label}</span>
                    </span>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => deleteEvidenceMutation.mutate(item.id)}
                      disabled={deleteEvidenceMutation.isPending}
                      aria-label={`Remove proof: ${item.label}`}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>

                  {item.kind === 'url' ? (
                    <div className="evidence-url-row">
                      {safeHref(item.url) ? (
                        <a
                          href={safeHref(item.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="evidence-link font-mono"
                        >
                          <code>{getHostname(item.url)}</code>
                        </a>
                      ) : (
                        <span className="evidence-link font-mono">
                          <code>{item.url}</code>
                        </span>
                      )}
                    </div>
                  ) : (
                    <pre className="evidence-note-body font-mono">
                      {item.body}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Add Evidence Form */}
          {evidenceCount >= 20 ? (
            <p className="evidence-limit-notice" role="status">
              Maximum 20 proofs reached for this task.
            </p>
          ) : (
            <form className="evidence-add-form" onSubmit={handleAddEvidence}>
              <h4>Add proof</h4>
              <div
                className="kind-radio-group"
                role="radiogroup"
                aria-label="Proof type"
              >
                <label className="radio-label">
                  <input
                    type="radio"
                    name="evidence-kind"
                    value="url"
                    checked={kind === 'url'}
                    onChange={() => setKind('url')}
                  />
                  <span>Link</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="evidence-kind"
                    value="note"
                    checked={kind === 'note'}
                    onChange={() => setKind('note')}
                  />
                  <span>Note</span>
                </label>
              </div>

              <label>
                Label
                <input
                  type="text"
                  placeholder={
                    kind === 'url'
                      ? 'e.g. Pull Request #42'
                      : 'e.g. Test output log'
                  }
                  value={evidenceLabel}
                  onChange={(e) => setEvidenceLabel(e.target.value)}
                  maxLength={120}
                  required
                />
              </label>

              {kind === 'url' ? (
                <label>
                  URL
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    required
                  />
                </label>
              ) : (
                <label>
                  Note content
                  <textarea
                    rows={4}
                    placeholder="Paste output or test run results (max 2000 chars)"
                    value={evidenceBody}
                    onChange={(e) => setEvidenceBody(e.target.value)}
                    maxLength={2000}
                    required
                  />
                </label>
              )}

              {evidenceError && (
                <p className="form-error" role="alert">
                  {evidenceError}
                </p>
              )}

              <button
                type="submit"
                className="button button-secondary"
                disabled={addEvidenceMutation.isPending}
              >
                {addEvidenceMutation.isPending ? 'Adding…' : 'Add proof'}
              </button>
            </form>
          )}
        </section>

        <hr className="dialog-divider" />

        {/* Section 3: Danger zone */}
        <section className="danger-zone" aria-labelledby="danger-heading">
          <h3 id="danger-heading">Danger zone</h3>
          <p className="danger-description">
            Permanently delete this task and all attached evidence.
          </p>
          <button
            type="button"
            className="button button-danger"
            onClick={() => onDeleteRequest(task)}
          >
            Delete task
          </button>
        </section>
      </div>
    </dialog>
  );
}
