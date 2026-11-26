import { useState, useEffect, useRef, useMemo } from 'react';
import Icon from './Icon';

const STATIC_ACTIONS = [
  {
    id: 'action-new-task',
    label: 'New task',
    group: 'Actions',
    icon: 'plus',
    actionKey: 'new-task',
  },
  {
    id: 'action-proof-with',
    label: 'Show tasks with proof',
    group: 'Actions',
    icon: 'check',
    actionKey: 'proof-with',
  },
  {
    id: 'action-proof-without',
    label: 'Show tasks without proof',
    group: 'Actions',
    icon: 'clock',
    actionKey: 'proof-without',
  },
  {
    id: 'action-toggle-theme',
    label: 'Toggle theme',
    group: 'Actions',
    icon: 'sun',
    actionKey: 'toggle-theme',
  },
  {
    id: 'action-shortcuts-help',
    label: 'Open shortcuts help',
    group: 'Actions',
    icon: 'help',
    actionKey: 'shortcuts-help',
  },
  {
    id: 'action-copy-link',
    label: 'Copy public link',
    group: 'Actions',
    icon: 'link',
    actionKey: 'copy-link',
  },
  {
    id: 'action-print-report',
    label: 'Print proof report',
    group: 'Actions',
    icon: 'note',
    actionKey: 'print-report',
  },
];

export default function CommandPalette({
  isOpen,
  onClose,
  tasks = [],
  onNewTask,
  onFilterProof,
  onToggleTheme,
  onOpenHelp,
  onSelectTask,
  onPrintReport,
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Filter actions and tasks client-side without network calls
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    const matchedActions = STATIC_ACTIONS.filter((item) =>
      q ? item.label.toLowerCase().includes(q) : true,
    );

    const matchedTasks = tasks
      .filter((t) => (q ? t.title.toLowerCase().includes(q) : true))
      .slice(0, 8)
      .map((t) => ({
        id: `task-${t.id}`,
        label: t.title,
        group: 'Tasks',
        icon: t.status === 'done' ? 'check' : 'clock',
        task: t,
      }));

    return [...matchedActions, ...matchedTasks];
  }, [query, tasks]);

  // Dialog open/close and focus management
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return undefined;

    triggerRef.current = document.activeElement;
    setQuery('');
    setActiveIndex(0);

    if (!dialog.open) {
      dialog.showModal();
    }
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
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

  const executeItem = (item) => {
    if (!item) return;
    onClose();

    if (item.task) {
      onSelectTask && onSelectTask(item.task);
      return;
    }

    switch (item.actionKey) {
      case 'new-task':
        onNewTask && onNewTask();
        break;
      case 'proof-with':
        onFilterProof && onFilterProof('true');
        break;
      case 'proof-without':
        onFilterProof && onFilterProof('false');
        break;
      case 'toggle-theme':
        onToggleTheme && onToggleTheme();
        break;
      case 'shortcuts-help':
        onOpenHelp && onOpenHelp();
        break;
      case 'copy-link':
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(window.location.href).catch(() => {});
        }
        break;
      case 'print-report':
        if (onPrintReport) {
          onPrintReport();
        } else {
          window.print();
        }
        break;
      default:
        break;
    }
  };

  const handleKeyDown = (e) => {
    if (filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(
        (prev) => (prev - 1 + filteredItems.length) % filteredItems.length,
      );
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(filteredItems.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[activeIndex]) {
        executeItem(filteredItems[activeIndex]);
      }
    }
  };

  if (!isOpen) return null;

  const activeItem = filteredItems[activeIndex] || null;

  // Group items for display
  const actionItems = filteredItems.filter((i) => i.group === 'Actions');
  const taskItems = filteredItems.filter((i) => i.group === 'Tasks');

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog palette-dialog"
      aria-label="Command palette"
    >
      <div className="palette-search-wrapper">
        <Icon name="search" size={16} className="palette-search-icon" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls="palette-listbox"
          aria-activedescendant={activeItem ? activeItem.id : undefined}
          className="palette-input"
          placeholder="Type a command or search tasks..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="dialog-close-btn"
          onClick={onClose}
          aria-label="Close command palette"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      <div className="palette-body">
        {filteredItems.length === 0 ? (
          <div className="palette-empty">
            No match. Try a task title or an action.
          </div>
        ) : (
          <ul
            id="palette-listbox"
            role="listbox"
            aria-label="Commands and tasks"
            className="palette-list"
          >
            {actionItems.length > 0 && (
              <li role="presentation" className="palette-group-header">
                Actions
              </li>
            )}
            {actionItems.map((item) => {
              const itemIdx = filteredItems.indexOf(item);
              const isSelected = itemIdx === activeIndex;
              return (
                <li
                  key={item.id}
                  id={item.id}
                  role="option"
                  aria-selected={isSelected}
                  className={`palette-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => executeItem(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      executeItem(item);
                    }
                  }}
                  onMouseEnter={() => setActiveIndex(itemIdx)}
                >
                  <span className="palette-item-icon">
                    <Icon name={item.icon} size={14} />
                  </span>
                  <span className="palette-item-label">{item.label}</span>
                </li>
              );
            })}

            {taskItems.length > 0 && (
              <li role="presentation" className="palette-group-header">
                Tasks
              </li>
            )}
            {taskItems.map((item) => {
              const itemIdx = filteredItems.indexOf(item);
              const isSelected = itemIdx === activeIndex;
              return (
                <li
                  key={item.id}
                  id={item.id}
                  role="option"
                  aria-selected={isSelected}
                  className={`palette-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => executeItem(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      executeItem(item);
                    }
                  }}
                  onMouseEnter={() => setActiveIndex(itemIdx)}
                >
                  <span className="palette-item-icon">
                    <Icon name={item.icon} size={14} />
                  </span>
                  <span className="palette-item-label">{item.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="palette-footer">
        <kbd>↑↓</kbd> move · <kbd>Enter</kbd> run · <kbd>Esc</kbd> close
      </div>
    </dialog>
  );
}
