"use client";

import styles from "./Charts.module.css";

// Bar chart data — monthly revenue
const BAR_DATA = [
  { label: "Jan", value: 42 },
  { label: "Feb", value: 58 },
  { label: "Mar", value: 35 },
  { label: "Apr", value: 72 },
  { label: "May", value: 65 },
  { label: "Jun", value: 88 },
  { label: "Jul", value: 76 },
  { label: "Aug", value: 94 },
];

const BAR_MAX = Math.max(...BAR_DATA.map((d) => d.value));

// Pie chart data — department headcount
const PIE_DATA = [
  { label: "Engineering", value: 8, color: "var(--color-primary)" },
  { label: "Design", value: 3, color: "var(--color-accent)" },
  { label: "Marketing", value: 2, color: "var(--color-warning)" },
  { label: "Sales", value: 2, color: "var(--color-success)" },
  { label: "HR", value: 2, color: "var(--color-danger)" },
  { label: "Finance", value: 2, color: "var(--color-text-secondary)" },
];

const PIE_TOTAL = PIE_DATA.reduce((sum, d) => sum + d.value, 0);

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pieSlicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function BarChart() {
  const chartHeight = 200;
  const barWidth = 40;
  const gap = 16;
  const chartWidth = BAR_DATA.length * (barWidth + gap) - gap;

  return (
    <div className={styles.chart}>
      <h3 className={styles.chartTitle}>Monthly Revenue (K)</h3>
      <svg
        viewBox={`0 0 ${chartWidth + 40} ${chartHeight + 40}`}
        className={styles.svg}
        role="img"
        aria-label="Bar chart showing monthly revenue"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = chartHeight - frac * chartHeight + 10;
          return (
            <g key={frac}>
              <line
                x1={30}
                y1={y}
                x2={chartWidth + 40}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={1}
                strokeDasharray={frac > 0 ? "4 4" : "0"}
              />
              <text
                x={26}
                y={y + 4}
                textAnchor="end"
                fill="var(--color-text-secondary)"
                fontSize={11}
              >
                {Math.round(BAR_MAX * frac)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {BAR_DATA.map((d, i) => {
          const barHeight = (d.value / BAR_MAX) * chartHeight;
          const x = 34 + i * (barWidth + gap);
          const y = chartHeight - barHeight + 10;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill="var(--color-primary)"
                className={styles.bar}
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight + 26}
                textAnchor="middle"
                fill="var(--color-text-secondary)"
                fontSize={12}
              >
                {d.label}
              </text>
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fill="var(--color-text)"
                fontSize={11}
                fontWeight={600}
              >
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PieChart() {
  const cx = 120;
  const cy = 120;
  const r = 100;
  let currentAngle = 0;

  const slices = PIE_DATA.map((d) => {
    const sliceAngle = (d.value / PIE_TOTAL) * 360;
    const path = pieSlicePath(cx, cy, r, currentAngle, currentAngle + sliceAngle);
    const midAngle = currentAngle + sliceAngle / 2;
    const labelPos = polarToCartesian(cx, cy, r * 0.65, midAngle);
    currentAngle += sliceAngle;
    return { ...d, path, labelPos, percentage: Math.round((d.value / PIE_TOTAL) * 100) };
  });

  return (
    <div className={styles.chart}>
      <h3 className={styles.chartTitle}>Headcount by Department</h3>
      <div className={styles.pieLayout}>
        <svg
          viewBox="0 0 240 240"
          className={styles.pieSvg}
          role="img"
          aria-label="Pie chart showing headcount by department"
        >
          {slices.map((s) => (
            <path
              key={s.label}
              d={s.path}
              fill={s.color}
              stroke="var(--color-surface)"
              strokeWidth={2}
              className={styles.slice}
            />
          ))}
        </svg>
        <ul className={styles.legend}>
          {slices.map((s) => (
            <li key={s.label} className={styles.legendItem}>
              <span
                className={styles.legendSwatch}
                style={{ background: s.color }}
              />
              <span className={styles.legendLabel}>{s.label}</span>
              <span className={styles.legendValue}>{s.percentage}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Charts() {
  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Analytics Overview</h2>
      <div className={styles.grid}>
        <BarChart />
        <PieChart />
      </div>
    </div>
  );
}
