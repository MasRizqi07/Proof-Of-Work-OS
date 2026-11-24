import { useState, useEffect, useRef } from 'react';
import Icon from './Icon';

export default function TaskFilter({
  statusFilter,
  onStatusChange,
  projectFilter,
  onProjectChange,
  proofFilter = '',
  onProofChange,
  projects = [],
  searchValue = '',
  onSearchChange,
  searchInputRef,
}) {
  const [localInput, setLocalInput] = useState(searchValue);
  const [prevSearchValue, setPrevSearchValue] = useState(searchValue);
  const debounceTimerRef = useRef(null);

  if (searchValue !== prevSearchValue) {
    setPrevSearchValue(searchValue);
    setLocalInput(searchValue);
  }

  const handleInputChange = (e) => {
    const val = e.target.value;
    setLocalInput(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onSearchChange && onSearchChange(val.trim());
    }, 250);
  };

  const handleClear = () => {
    setLocalInput('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onSearchChange && onSearchChange('');
    searchInputRef?.current?.focus();
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="task-filter-container">
      <div className="task-search-section">
        <label htmlFor="task-search-input" className="task-search-label">
          <span>Search tasks</span>
          <kbd aria-hidden="true">/</kbd>
        </label>
        <div className="task-search-input-wrapper">
          <Icon name="search" size={14} className="task-search-icon" />
          <input
            id="task-search-input"
            ref={searchInputRef}
            type="search"
            value={localInput}
            onChange={handleInputChange}
            placeholder="Search by title or description..."
            className="task-search-input"
          />
          {localInput && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="task-search-clear-btn"
            >
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="task-filter">
        <label>
          Status{' '}
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter tasks by status"
          >
            <option value="">All</option>
            <option value="todo">Todo</option>
            <option value="in-progress">In progress</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label>
          Proof{' '}
          <select
            value={proofFilter}
            onChange={(e) => onProofChange && onProofChange(e.target.value)}
            aria-label="Filter tasks by proof"
          >
            <option value="">All</option>
            <option value="true">With proof</option>
            <option value="false">No proof yet</option>
          </select>
        </label>

        {projects.length > 0 && (
          <label>
            Project{' '}
            <select
              value={projectFilter}
              onChange={(e) => onProjectChange(e.target.value)}
              aria-label="Filter tasks by project"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
