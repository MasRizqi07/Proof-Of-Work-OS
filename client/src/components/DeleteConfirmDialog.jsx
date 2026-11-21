import { useEffect, useRef } from 'react';

export default function DeleteConfirmDialog({
  isOpen,
  task,
  onClose,
  onConfirm,
  isDeleting = false,
}) {
  const dialogRef = useRef(null);
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      // Ensure focus on Cancel button per PRD T-06 / DESIGN 6.11
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 0);

      const handleBackdropClick = (e) => {
        if (e.target === dialog) {
          onClose();
        }
      };
      dialog.addEventListener('click', handleBackdropClick);

      return () => {
        clearTimeout(timer);
        dialog.removeEventListener('click', handleBackdropClick);
      };
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog delete-confirm-dialog"
      aria-labelledby="delete-confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-content">
        <h2 id="delete-confirm-title">Delete this task?</h2>
        <p className="dialog-description">
          All evidence attached to <strong>&ldquo;{task.title}&rdquo;</strong>{' '}
          will be permanently deleted. This action cannot be undone.
        </p>
        <div className="dialog-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="button button-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={() => onConfirm(task.id)}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete task'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
