import { useEffect, useRef } from 'react';
import Icon from './Icon';

export default function ShortcutsHelpDialog({ isOpen, onClose }) {
  const dialogRef = useRef(null);
  const titleHeadingRef = useRef(null);
  const triggerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return undefined;

    triggerRef.current = document.activeElement;

    if (!dialog.open) {
      dialog.showModal();
    }
    const frame = requestAnimationFrame(() => {
      titleHeadingRef.current?.focus();
    });

    const handleCancel = (e) => {
      e.preventDefault();
      onCloseRef.current();
    };

    dialog.addEventListener('cancel', handleCancel);

    return () => {
      cancelAnimationFrame(frame);
      dialog.removeEventListener('cancel', handleCancel);
      if (dialog.open) {
        dialog.close();
      }
      setTimeout(() => {
        triggerRef.current?.focus?.();
      }, 0);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog shortcuts-dialog"
      aria-labelledby="shortcuts-dialog-title"
    >
      <div className="modal-header">
        <h2
          id="shortcuts-dialog-title"
          ref={titleHeadingRef}
          tabIndex="-1"
          className="modal-title"
        >
          Keyboard Shortcuts
        </h2>
        <button
          type="button"
          className="dialog-close-btn"
          onClick={onClose}
          aria-label="Close shortcuts help dialog"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      <div className="modal-body">
        <table className="shortcuts-table">
          <thead>
            <tr>
              <th scope="col">Shortcut</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd>
              </td>
              <td>Open command palette</td>
            </tr>
            <tr>
              <td>
                <kbd>n</kbd>
              </td>
              <td>Focus new task form title input</td>
            </tr>
            <tr>
              <td>
                <kbd>/</kbd>
              </td>
              <td>Focus task search input</td>
            </tr>
            <tr>
              <td>
                <kbd>t</kbd>
              </td>
              <td>Toggle light / dark color theme</td>
            </tr>
            <tr>
              <td>
                <kbd>?</kbd>
              </td>
              <td>Open this keyboard shortcuts help dialog</td>
            </tr>
            <tr>
              <td>
                <kbd>Esc</kbd>
              </td>
              <td>Close active dialog or modal</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="modal-footer">
        <button
          type="button"
          className="button button-primary"
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    </dialog>
  );
}
