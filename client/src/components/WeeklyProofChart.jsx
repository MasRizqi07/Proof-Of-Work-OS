function formatWeekLabel(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const date = new Date(Date.UTC(year, month, day));
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

export default function WeeklyProofChart({ weekly = [] }) {
  const totalWithProof = weekly.reduce((acc, w) => acc + (w.withProof || 0), 0);
  const totalWithoutProof = weekly.reduce(
    (acc, w) => acc + (w.withoutProof || 0),
    0,
  );
  const hasData = totalWithProof > 0 || totalWithoutProof > 0;

  if (!hasData) {
    return (
      <div className="proof-chart-container empty-chart">
        <p className="chart-empty-message">
          No completed tasks yet. Finish a task and attach proof to start your
          streak.
        </p>
      </div>
    );
  }

  // Dimensions & geometry for 8-week chart
  const svgWidth = 560;
  const svgHeight = 175;
  const chartTop = 20;
  const chartHeight = 110;
  const chartBottom = chartTop + chartHeight; // 130
  const marginLeft = 30;
  const marginRight = 20;
  const usableWidth = svgWidth - marginLeft - marginRight;
  const count = Math.max(1, weekly.length);
  const slotWidth = usableWidth / count;
  const barWidth = 26;

  const maxVal = Math.max(
    1,
    ...weekly.map((w) => (w.withProof || 0) + (w.withoutProof || 0)),
  );
  const scale = chartHeight / maxVal;

  return (
    <figure className="proof-chart-figure" aria-label="Weekly proof progress">
      <figcaption className="proof-chart-caption">
        {weekly.length} weeks: {totalWithProof} with proof, {totalWithoutProof}{' '}
        without
      </figcaption>

      <div className="chart-legend">
        <span className="legend-item">
          <span className="legend-swatch legend-with-proof"></span>
          <span>With proof</span>
        </span>
        <span className="legend-item">
          <span className="legend-swatch legend-without-proof"></span>
          <span>No proof</span>
        </span>
      </div>

      <div className="chart-svg-wrap">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="weekly-proof-svg"
          role="img"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="chart-stripe-pattern"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke="var(--color-noproof-fg)"
                strokeWidth="2.5"
              />
            </pattern>
          </defs>

          {/* Baseline */}
          <line
            x1={marginLeft - 10}
            y1={chartBottom}
            x2={svgWidth - marginRight + 10}
            y2={chartBottom}
            stroke="var(--color-border)"
            strokeWidth="1"
          />

          {weekly.map((w, index) => {
            const withProof = w.withProof || 0;
            const withoutProof = w.withoutProof || 0;
            const hWith = withProof * scale;
            const hWithout = withoutProof * scale;
            const barX =
              marginLeft + index * slotWidth + (slotWidth - barWidth) / 2;
            const yWith = chartBottom - hWith;
            const yWithout = chartBottom - hWith - hWithout;
            const weekLabel = formatWeekLabel(w.weekStart);

            return (
              <g key={w.weekStart || index} className="chart-bar-group">
                {/* With proof (solid) */}
                {withProof > 0 && (
                  <rect
                    x={barX}
                    y={yWith}
                    width={barWidth}
                    height={hWith}
                    fill="var(--color-proof-fg)"
                    rx={withoutProof === 0 ? 3 : 0}
                  >
                    <title>{`${weekLabel}: ${withProof} with proof`}</title>
                  </rect>
                )}

                {/* Without proof (striped) */}
                {withoutProof > 0 && (
                  <rect
                    x={barX}
                    y={yWithout}
                    width={barWidth}
                    height={hWithout}
                    fill="url(#chart-stripe-pattern)"
                    stroke="var(--color-noproof-fg)"
                    strokeWidth="1"
                    rx={3}
                  >
                    <title>{`${weekLabel}: ${withoutProof} without proof`}</title>
                  </rect>
                )}

                {/* Week label below baseline */}
                <text
                  x={barX + barWidth / 2}
                  y={chartBottom + 20}
                  textAnchor="middle"
                  className="chart-axis-label font-mono"
                  fill="var(--color-text-secondary)"
                >
                  {weekLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <details className="chart-data-details">
        <summary>Show data table</summary>
        <div className="table-container">
          <table className="proof-data-table">
            <thead>
              <tr>
                <th scope="col">Week</th>
                <th scope="col">With proof</th>
                <th scope="col">Without proof</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((w) => {
                const withProof = w.withProof || 0;
                const withoutProof = w.withoutProof || 0;
                return (
                  <tr key={w.weekStart}>
                    <td className="font-mono">
                      {formatWeekLabel(w.weekStart)}
                    </td>
                    <td className="font-mono">{withProof}</td>
                    <td className="font-mono">{withoutProof}</td>
                    <td className="font-mono">{withProof + withoutProof}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
