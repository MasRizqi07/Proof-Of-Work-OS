import { useEffect, useMemo, useRef, useState } from 'react';

function parseUtcDate(isoDateStr) {
  const [y, m, d] = isoDateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDayDate(isoDateStr) {
  if (!isoDateStr) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseUtcDate(isoDateStr));
}

function formatMonthShort(isoDateStr) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  }).format(parseUtcDate(isoDateStr));
}

function getHeatLevel(withProof) {
  if (withProof >= 5) return 4;
  if (withProof >= 3) return 3;
  if (withProof === 2) return 2;
  if (withProof === 1) return 1;
  return 0;
}

function formatCellSummary(day) {
  return `${formatDayDate(day.date)}: ${day.withProof} with proof, ${day.withoutProof} without`;
}

function getLocalToday(timezone) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default function WeeklyHeatmap({ heatmap, todayOverride }) {
  const days = useMemo(() => heatmap?.days || [], [heatmap]);
  const timezone = heatmap?.timezone || 'UTC';
  const todayStr = todayOverride || getLocalToday(timezone);

  const numWeeks = Math.ceil(days.length / 7);

  // Build 7 rows (Mon=0..Sun=6) x numWeeks columns for accessible ARIA grid
  const { rows, monthLabels, totalWithProof, totalWithoutProof, nonEmptyDays } =
    useMemo(() => {
      const gridRows = Array.from({ length: 7 }, () => []);
      const columns = [];
      let sumWith = 0;
      let sumWithout = 0;
      const nonEmpty = [];

      for (let col = 0; col < numWeeks; col++) {
        const weekSlice = days.slice(col * 7, col * 7 + 7);
        columns.push(weekSlice);
        for (let row = 0; row < 7; row++) {
          const item = weekSlice[row] || null;
          gridRows[row].push(item);
          if (item) {
            sumWith += item.withProof || 0;
            sumWithout += item.withoutProof || 0;
            if ((item.withProof || 0) > 0 || (item.withoutProof || 0) > 0) {
              nonEmpty.push(item);
            }
          }
        }
      }

      const colHasFirstOfMonth = columns.map((week) =>
        week.find((d) => d?.date?.endsWith('-01')),
      );

      const labels = columns.map((week, col) => {
        const firstDay = colHasFirstOfMonth[col];
        if (firstDay) {
          return formatMonthShort(firstDay.date);
        }
        if (col === 0 && week[0] && !colHasFirstOfMonth[1]) {
          return formatMonthShort(week[0].date);
        }
        return '';
      });

      return {
        rows: gridRows,
        monthLabels: labels,
        totalWithProof: sumWith,
        totalWithoutProof: sumWithout,
        nonEmptyDays: [...nonEmpty].reverse(),
      };
    }, [days, numWeeks]);

  const defaultActiveDate = useMemo(() => {
    if (!days.length) return '';
    const hasToday = days.some((d) => d.date === todayStr);
    return hasToday ? todayStr : days[days.length - 1].date;
  }, [days, todayStr]);

  const [selectedDate, setSelectedDate] = useState(defaultActiveDate);
  const [hoveredDate, setHoveredDate] = useState(null);
  const scrollWrapRef = useRef(null);
  const cellRefs = useRef({});

  // Synchronize default active date when dataset shifts
  const [prevDefaultDate, setPrevDefaultDate] = useState(defaultActiveDate);
  if (defaultActiveDate !== prevDefaultDate) {
    setPrevDefaultDate(defaultActiveDate);
    setSelectedDate(defaultActiveDate);
  }

  // Initial scroll to newest week on narrow containers (< 560px)
  useEffect(() => {
    const el = scrollWrapRef.current;
    if (el && days.length > 0) {
      el.scrollLeft = el.scrollWidth;
    }
  }, [days.length]);

  if (!days.length) {
    return null;
  }

  const activeDate = days.some((d) => d.date === selectedDate)
    ? selectedDate
    : defaultActiveDate;

  const inspectedDate = hoveredDate || activeDate;
  const inspectedCell = days.find((d) => d.date === inspectedDate) || null;

  const focusCell = (targetDate) => {
    if (!targetDate) return;
    setSelectedDate(targetDate);
    const btn = cellRefs.current[targetDate];
    if (btn && typeof btn.focus === 'function') {
      btn.focus();
    }
  };

  const handleCellKeyDown = (e, rowIdx, colIdx) => {
    let nextRow = rowIdx;
    let nextCol = colIdx;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextCol = Math.min(numWeeks - 1, colIdx + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextCol = Math.max(0, colIdx - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextRow = Math.min(6, rowIdx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = Math.max(0, rowIdx - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextCol = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextCol = numWeeks - 1;
    } else {
      return;
    }

    const target = rows[nextRow]?.[nextCol];
    if (target) {
      focusCell(target.date);
    }
  };

  return (
    <figure
      className="proof-heatmap-figure"
      aria-label="Proof activity heatmap"
    >
      <figcaption className="proof-chart-caption">
        {numWeeks} weeks: {totalWithProof} completed with proof,{' '}
        {totalWithoutProof} without
      </figcaption>

      <div className="heatmap-layout">
        <div className="heatmap-day-labels" aria-hidden="true">
          <div className="heatmap-month-spacer" />
          <span>Mon</span>
          <span />
          <span>Wed</span>
          <span />
          <span>Fri</span>
          <span />
          <span />
        </div>

        <div
          className="heatmap-scroll-wrap"
          ref={scrollWrapRef}
          onMouseLeave={() => setHoveredDate(null)}
        >
          <div
            className="heatmap-months"
            style={{ '--heatmap-cols': numWeeks }}
            aria-hidden="true"
          >
            {monthLabels.map((label, colIdx) => (
              <span key={colIdx} className="heatmap-month-label">
                {label}
              </span>
            ))}
          </div>

          <div
            role="grid"
            aria-label={`${numWeeks}-week proof activity heatmap`}
            className="heatmap-grid"
          >
            {rows.map((rowDays, rowIdx) => (
              <div
                key={rowIdx}
                role="row"
                className="heatmap-row"
                style={{ '--heatmap-cols': numWeeks }}
              >
                {rowDays.map((cell, colIdx) => {
                  if (!cell) {
                    return (
                      <span
                        key={`empty-${rowIdx}-${colIdx}`}
                        role="gridcell"
                        aria-hidden="true"
                        className="heatmap-cell-spacer"
                      />
                    );
                  }

                  const level = getHeatLevel(cell.withProof);
                  const hasOnlyNoProof =
                    cell.withProof === 0 && cell.withoutProof > 0;
                  const isToday = cell.date === todayStr;
                  const isActive = cell.date === activeDate;
                  const cellLabel = formatCellSummary(cell);

                  return (
                    <button
                      key={cell.date}
                      ref={(el) => {
                        if (el) cellRefs.current[cell.date] = el;
                        else delete cellRefs.current[cell.date];
                      }}
                      type="button"
                      role="gridcell"
                      tabIndex={isActive ? 0 : -1}
                      aria-label={cellLabel}
                      title={cellLabel}
                      data-date={cell.date}
                      data-level={level}
                      className={`heatmap-cell level-${level}${isToday ? ' is-today' : ''}`}
                      onClick={() => {
                        setSelectedDate(cell.date);
                        setHoveredDate(cell.date);
                      }}
                      onFocus={() => setSelectedDate(cell.date)}
                      onMouseEnter={() => setHoveredDate(cell.date)}
                      onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx)}
                    >
                      {hasOnlyNoProof && (
                        <span
                          className="heatmap-noproof-dot"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="heatmap-meta-row">
        <p
          className="heatmap-tooltip font-mono"
          role="status"
          aria-live="polite"
        >
          {inspectedCell ? formatCellSummary(inspectedCell) : ''}
        </p>

        <div className="chart-legend heatmap-legend">
          <span>Less</span>
          <span
            className="heatmap-swatch level-0"
            title="0 with proof"
            aria-hidden="true"
          />
          <span
            className="heatmap-swatch level-1"
            title="1 with proof"
            aria-hidden="true"
          />
          <span
            className="heatmap-swatch level-2"
            title="2 with proof"
            aria-hidden="true"
          />
          <span
            className="heatmap-swatch level-3"
            title="3–4 with proof"
            aria-hidden="true"
          />
          <span
            className="heatmap-swatch level-4"
            title="5+ with proof"
            aria-hidden="true"
          />
          <span>More</span>
          <span className="legend-item">
            <span
              className="heatmap-swatch level-0 has-dot-preview"
              title="Completed without proof"
              aria-hidden="true"
            >
              <span className="heatmap-noproof-dot" />
            </span>
            <span>No proof</span>
          </span>
        </div>
      </div>

      <details className="chart-data-details">
        <summary>Show data table</summary>
        <div className="table-container">
          {nonEmptyDays.length === 0 ? (
            <p className="chart-empty-message">
              No completed tasks recorded in this {numWeeks}-week window.
            </p>
          ) : (
            <table className="proof-data-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">With proof</th>
                  <th scope="col">Without proof</th>
                </tr>
              </thead>
              <tbody>
                {nonEmptyDays.map((day) => (
                  <tr key={day.date}>
                    <td className="font-mono">{formatDayDate(day.date)}</td>
                    <td className="font-mono">{day.withProof}</td>
                    <td className="font-mono">{day.withoutProof}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </details>
    </figure>
  );
}
