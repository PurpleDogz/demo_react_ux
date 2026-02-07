"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, ColDef, RowDoubleClickedEvent } from "ag-grid-community";
import styles from "./ReportExplorer.module.css";
import {
  type Report,
  type ReportRun,
  type SummaryRow,
  type RunDataRow,
  type RunDataParams,
  SCENARIOS,
  METRICS,
  SECTOR_LIST,
  SUB_SECTORS_BY_SECTOR,
  climateImpactReports,
  climateImpactScenarioSummary,
  climateImpactSectorSummary,
  climateImpactSubSectorSummary,
  climateImpactRunData,
} from "@/utils/climateImpactApi";

ModuleRegistry.registerModules([AllCommunityModule]);

// ── Multi-select dropdown ───────────────────────────────────────────────

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    if (next.length > 0) onChange(next);
  };

  const summary =
    selected.length === options.length
      ? "All"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`;

  return (
    <div className={styles.controlGroup}>
      <label className={styles.label}>{label}</label>
      <div className={styles.multiSelect} ref={ref}>
        <button
          type="button"
          className={styles.multiSelectTrigger}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className={styles.multiSelectText}>{summary}</span>
          <span className={styles.multiSelectChevron} aria-hidden="true" />
        </button>
        {open && (
          <div className={styles.multiSelectDropdown}>
            {options.map((opt) => (
              <label key={opt} className={styles.multiSelectOption}>
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className={styles.multiSelectCheckbox}
                />
                {opt}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Cell renderers ──────────────────────────────────────────────────────

function CurrencyCellRenderer(params: { value: number }) {
  return <span>${params.value.toLocaleString()}</span>;
}

function PctChangeCellRenderer(params: { value: number }) {
  const cls = params.value >= 0 ? styles.positive : styles.negative;
  return <span className={cls}>{params.value >= 0 ? "+" : ""}{params.value.toFixed(2)}%</span>;
}

// ── Grid export helpers ─────────────────────────────────────────────────

function gridToCsv<T>(gridRef: React.RefObject<AgGridReact<T> | null>, colDefs: ColDef<T>[]): string {
  const api = gridRef.current?.api;
  if (!api) return "";
  const fields = colDefs.filter((c) => c.field).map((c) => ({ field: c.field as string, header: c.headerName ?? c.field as string }));
  const headers = fields.map((f) => f.header);
  const lines: string[] = [headers.join(",")];
  api.forEachNodeAfterFilterAndSort((node) => {
    if (!node.data) return;
    const vals = fields.map((f) => {
      const val = (node.data as Record<string, unknown>)?.[f.field];
      const str = String(val ?? "");
      return str.includes(",") ? `"${str}"` : str;
    });
    lines.push(vals.join(","));
  });
  return lines.join("\n");
}

function downloadCsv<T>(gridRef: React.RefObject<AgGridReact<T> | null>, colDefs: ColDef<T>[], filename: string) {
  const csv = gridToCsv(gridRef, colDefs);
  if (!csv) return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function copyToClipboard<T>(gridRef: React.RefObject<AgGridReact<T> | null>, colDefs: ColDef<T>[]) {
  const csv = gridToCsv(gridRef, colDefs);
  if (!csv) return;
  navigator.clipboard.writeText(csv);
}

// ── Component ───────────────────────────────────────────────────────────

type Grouping = "total" | "sector" | "subSector";
type DisplayMode = "table" | "chart" | "heatmap";

const GROUPINGS: { id: Grouping; label: string }[] = [
  { id: "total", label: "Total" },
  { id: "sector", label: "By Sector" },
  { id: "subSector", label: "By SubSector" },
];

const DISPLAY_MODES: { id: DisplayMode; label: string }[] = [
  { id: "table", label: "Table" },
  { id: "chart", label: "Chart" },
  { id: "heatmap", label: "Heat Map" },
];

const ALL = "All";

// ── Heat map component ──────────────────────────────────────────────────

function HeatMap({ rows }: { rows: SummaryRow[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        setContainerWidth(Math.max(400, width - 32));
        setContainerHeight(Math.max(300, height - 32));
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  if (rows.length === 0) {
    return <div style={{ padding: "1rem", textAlign: "center", color: "var(--color-text-secondary)" }}>No data to display</div>;
  }

  // Find min/max change for color scaling
  const maxAbsChange = Math.max(...rows.map((r) => Math.abs(r.pctChange)));

  // Improved treemap layout that fills the space
  const padding = 1;
  const rects: Array<{ x: number; y: number; width: number; height: number; row: SummaryRow; idx: number }> = [];

  // Squarified treemap algorithm
  const layoutTreemap = (items: SummaryRow[], x: number, y: number, width: number, height: number) => {
    if (items.length === 0) return;

    if (items.length === 1) {
      rects.push({
        x: x + padding,
        y: y + padding,
        width: width - padding * 2,
        height: height - padding * 2,
        row: items[0],
        idx: rows.indexOf(items[0]),
      });
      return;
    }

    const totalValue = items.reduce((sum, item) => sum + item.projectedValuation, 0);
    const midpoint = totalValue / 2;
    let sum = 0;
    let splitIndex = 0;

    for (let i = 0; i < items.length; i++) {
      sum += items[i].projectedValuation;
      if (sum >= midpoint) {
        splitIndex = i + 1;
        break;
      }
    }

    if (splitIndex === 0) splitIndex = 1;
    if (splitIndex >= items.length) splitIndex = items.length - 1;

    const firstGroup = items.slice(0, splitIndex);
    const secondGroup = items.slice(splitIndex);

    const firstValue = firstGroup.reduce((sum, item) => sum + item.projectedValuation, 0);
    const ratio = firstValue / totalValue;

    if (width > height) {
      // Split vertically
      const splitWidth = width * ratio;
      layoutTreemap(firstGroup, x, y, splitWidth, height);
      layoutTreemap(secondGroup, x + splitWidth, y, width - splitWidth, height);
    } else {
      // Split horizontally
      const splitHeight = height * ratio;
      layoutTreemap(firstGroup, x, y, width, splitHeight);
      layoutTreemap(secondGroup, x, y + splitHeight, width, height - splitHeight);
    }
  };

  layoutTreemap(rows, 0, 0, containerWidth, containerHeight);

  // Color scale function with more solid colors
  const getColor = (pctChange: number) => {
    const absChange = Math.abs(pctChange);
    const intensity = Math.min(absChange / (maxAbsChange || 1), 1);

    if (pctChange >= 0) {
      // Green scale: from light green to dark green (more saturated)
      const r = Math.round(180 - intensity * 140);  // 180 -> 40
      const g = Math.round(220 - intensity * 50);   // 220 -> 170
      const b = Math.round(180 - intensity * 140);  // 180 -> 40
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Red scale: from light red to dark red (more saturated)
      const r = Math.round(220 - intensity * 50);   // 220 -> 170
      const g = Math.round(180 - intensity * 140);  // 180 -> 40
      const b = Math.round(180 - intensity * 140);  // 180 -> 40
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Find hovered rectangle
  const hoveredRect = hoveredIdx !== null ? rects[hoveredIdx] : null;

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", padding: "1rem", overflowX: "auto", overflowY: "auto" }}>
      <svg width={containerWidth} height={containerHeight} style={{ display: "block" }}>
        {/* Render all rectangles with inline labels */}
        {rects.map(({ x, y, width, height, row, idx }) => {
          const color = getColor(row.pctChange);

          return (
            <g key={idx} onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={color}
                stroke={hoveredIdx === idx ? "var(--color-text)" : "var(--color-border)"}
                strokeWidth={hoveredIdx === idx ? 2 : 0.5}
                style={{ cursor: "pointer" }}
                opacity={hoveredIdx === idx ? 1 : 0.9}
              />

              {/* Label inside rect if large enough */}
              {width > 60 && height > 30 && (() => {
                const labels: string[] = [];
                labels.push(row.scenario);
                labels.push(row.metric);
                if (row.sector && row.sector !== "All Sectors") labels.push(row.sector);
                if (row.subSector) labels.push(row.subSector);

                const lineHeight = 14;
                const startY = y + height / 2 - ((labels.length - 1) * lineHeight) / 2;

                // Only show labels if they fit
                if (labels.length * lineHeight > height - 10) {
                  // Show only scenario and metric if not enough space
                  const compactLabels = [row.scenario, row.metric];
                  const compactStartY = y + height / 2 - lineHeight / 2;
                  return (
                    <>
                      {compactLabels.map((label, i) => (
                        <text
                          key={i}
                          x={x + width / 2}
                          y={compactStartY + i * lineHeight}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight={i === 0 ? "600" : "400"}
                          fill={i === 0 ? "var(--color-text)" : "#4b5563"}
                          style={{ pointerEvents: "none" }}
                        >
                          {label}
                        </text>
                      ))}
                    </>
                  );
                }

                return (
                  <>
                    {labels.map((label, i) => (
                      <text
                        key={i}
                        x={x + width / 2}
                        y={startY + i * lineHeight}
                        textAnchor="middle"
                        fontSize={i === 0 ? "11" : "10"}
                        fontWeight={i === 0 ? "600" : "400"}
                        fill={i === 0 ? "var(--color-text)" : "#4b5563"}
                        style={{ pointerEvents: "none" }}
                      >
                        {label}
                      </text>
                    ))}
                  </>
                );
              })()}
            </g>
          );
        })}

        {/* Render tooltip last so it's always on top */}
        {hoveredRect && (() => {
          const { x, y, width, height, row } = hoveredRect;

          const tooltipLines: string[] = [];
          tooltipLines.push(row.scenario);
          tooltipLines.push(row.metric);
          if (row.sector && row.sector !== "All Sectors") tooltipLines.push(row.sector);
          if (row.subSector) tooltipLines.push(row.subSector);
          tooltipLines.push(`Projected: $${row.projectedValuation.toLocaleString()}`);
          tooltipLines.push(`Change: ${row.pctChange >= 0 ? "+" : ""}${row.pctChange.toFixed(2)}%`);

          const tooltipWidth = 200;
          const lineHeight = 16;
          const tooltipPadding = 10;
          const tooltipHeight = tooltipLines.length * lineHeight + tooltipPadding * 2;

          const centerX = x + width / 2;
          const centerY = y + height / 2;
          const tooltipX = Math.max(10, Math.min(containerWidth - tooltipWidth - 10, centerX - tooltipWidth / 2));
          const tooltipY = Math.max(10, centerY - tooltipHeight - 10);

          return (
            <g style={{ pointerEvents: "none" }}>
              <rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height={tooltipHeight}
                fill="var(--color-surface)"
                stroke="var(--color-border)"
                strokeWidth="1.5"
                rx="4"
                style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.15))" }}
              />
              {tooltipLines.map((line, i) => {
                // Color the last line (percentage) based on positive/negative
                const isPercentageLine = i === tooltipLines.length - 1;
                const textColor = isPercentageLine
                  ? row.pctChange >= 0
                    ? "var(--color-success)"
                    : "var(--color-danger)"
                  : i >= tooltipLines.length - 2
                    ? "var(--color-text)"
                    : "var(--color-text-secondary)";

                return (
                  <text
                    key={i}
                    x={tooltipX + tooltipWidth / 2}
                    y={tooltipY + tooltipPadding + (i + 1) * lineHeight}
                    textAnchor="middle"
                    fontSize={i >= tooltipLines.length - 2 ? "11" : "10"}
                    fontWeight={i >= tooltipLines.length - 2 ? "600" : "400"}
                    fill={textColor}
                  >
                    {line}
                  </text>
                );
              })}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

// ── Bar chart component ──────────────────────────────────────────────────

function BarChart({ rows }: { rows: SummaryRow[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800);
  const [chartHeight, setChartHeight] = useState(400);

  // Update chart dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        const chartPadding = 32; // 1rem = 16px, so 2rem total = 32px
        setChartWidth(Math.max(400, containerWidth - chartPadding * 2));
        setChartHeight(Math.max(300, containerHeight - chartPadding * 2));
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  if (rows.length === 0) {
    return <div style={{ padding: "1rem", textAlign: "center", color: "var(--color-text-secondary)" }}>No data to display</div>;
  }

  const padding = { top: 40, right: 20, bottom: 60, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const barWidth = Math.max(12, Math.floor(innerWidth / rows.length * 0.7));
  const barSpacing = Math.floor(innerWidth / rows.length);

  // Calculate Y-axis range with 10% padding
  const dataMin = Math.min(...rows.map((r) => r.pctChange));
  const dataMax = Math.max(...rows.map((r) => r.pctChange));
  const padding10 = Math.max(5, (dataMax - dataMin) * 0.1);
  const minVal = Math.min(dataMin - padding10, -5);
  const maxVal = Math.max(dataMax + padding10, 5);
  const range = maxVal - minVal;
  const zeroY = padding.top + ((maxVal / range) * innerHeight);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", padding: "1rem", overflowX: "auto", overflowY: "auto" }}>
      <svg width={chartWidth} height={chartHeight} style={{ display: "block" }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padding.top + frac * innerHeight;
          const val = maxVal - frac * range;
          return (
            <g key={`gridline-${frac}`}>
              <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="var(--color-border)" strokeDasharray="2,2" strokeWidth="0.5" opacity="0.5" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="12" fill="var(--color-text-secondary)">
                {val.toFixed(1)}%
              </text>
            </g>
          );
        })}

        {/* Zero line */}
        <line x1={padding.left} y1={zeroY} x2={chartWidth - padding.right} y2={zeroY} stroke="var(--color-text-secondary)" strokeWidth="1" opacity="0.7" />

        {/* Bars */}
        {rows.map((row, idx) => {
          const x = padding.left + idx * barSpacing + (barSpacing - barWidth) / 2;
          const isPositive = row.pctChange >= 0;
          const barColor = isPositive ? "var(--color-success)" : "var(--color-danger)";

          // Calculate bar height and position correctly for positive/negative values
          const absBarHeight = Math.abs((row.pctChange / range) * innerHeight);
          const barY = isPositive ? zeroY - absBarHeight : zeroY;

          // Build tooltip lines
          const tooltipLines: string[] = [];
          tooltipLines.push(row.scenario);
          tooltipLines.push(row.metric);
          if (row.sector && row.sector !== "All Sectors") tooltipLines.push(row.sector);
          if (row.subSector) tooltipLines.push(row.subSector);
          tooltipLines.push(`${row.pctChange >= 0 ? "+" : ""}${row.pctChange.toFixed(2)}%`);

          // Tooltip sizing based on content
          const tooltipWidth = 180;
          const lineHeight = 16;
          const tooltipPadding = 10;
          const tooltipHeight = tooltipLines.length * lineHeight + tooltipPadding * 2;

          const barCenterX = x + barWidth / 2;
          const tooltipX = Math.max(padding.left, Math.min(chartWidth - padding.right - tooltipWidth, barCenterX - tooltipWidth / 2));
          const tooltipY = Math.max(padding.top, barY - tooltipHeight - 10);

          return (
            <g key={`bar-${idx}`} onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}>
              <rect x={x} y={barY} width={barWidth} height={absBarHeight} fill={barColor} opacity={hoveredIdx === idx ? 1 : 0.8} style={{ cursor: "pointer" }} />

              {/* Tooltip */}
              {hoveredIdx === idx && (
                <g>
                  <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" rx="4" style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.15))" }} />
                  {tooltipLines.map((line, i) => (
                    <text
                      key={i}
                      x={tooltipX + tooltipWidth / 2}
                      y={tooltipY + tooltipPadding + (i + 1) * lineHeight}
                      textAnchor="middle"
                      fontSize={i === tooltipLines.length - 1 ? "12" : "11"}
                      fontWeight={i === tooltipLines.length - 1 ? "700" : "400"}
                      fill={i === tooltipLines.length - 1 ? "var(--color-text)" : "var(--color-text-secondary)"}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )}
            </g>
          );
        })}

        {/* Axes */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={chartHeight - padding.bottom} stroke="var(--color-text)" strokeWidth="2" />
        <line x1={padding.left} y1={chartHeight - padding.bottom} x2={chartWidth - padding.right} y2={chartHeight - padding.bottom} stroke="var(--color-text)" strokeWidth="2" />

        {/* Y-axis label */}
        <text x={20} y={padding.top - 10} fontSize="12" fill="var(--color-text)" fontWeight="600">
          % Change
        </text>

        {/* X-axis label */}
        <text x={chartWidth / 2} y={chartHeight - 10} textAnchor="middle" fontSize="12" fill="var(--color-text)" fontWeight="600">
          Scenario
        </text>
      </svg>
    </div>
  );
}

export default function ReportExplorer() {
  const [reports, setReports] = useState<Report[]>([]);
  const [published, setPublished] = useState(true);
  const [reportId, setReportId] = useState("");
  const [scenarios, setScenarios] = useState<string[]>([SCENARIOS[0]]);
  const [metrics, setMetrics] = useState<string[]>([METRICS[0]]);
  const [grouping, setGrouping] = useState<Grouping>("subSector");
  const [sectors, setSectors] = useState<string[]>([...SECTOR_LIST]);
  const [subSectorFilter, setSubSectorFilter] = useState(ALL);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("table");
  const [run, setRun] = useState<ReportRun | null>(null);
  const [gridRows, setGridRows] = useState<SummaryRow[]>([]);
  const [modalRow, setModalRow] = useState<SummaryRow | null>(null);
  const [modalData, setModalData] = useState<RunDataRow[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mainGridRef = useRef<AgGridReact<SummaryRow>>(null);
  const modalGridRef = useRef<AgGridReact<RunDataRow>>(null);

  // ── Load reports on mount ──
  useEffect(() => {
    climateImpactReports().then((r) => {
      setReports(r);
      if (r.length > 0) setReportId(r[0].id);
    });
  }, []);

  // ── Derived report list ──
  const availableReports = reports.filter((r) => (published ? r.published : true));
  const activeReport = availableReports.find((r) => r.id === reportId);
  if (!activeReport && availableReports.length > 0 && reportId !== availableReports[0].id) {
    setReportId(availableReports[0].id);
  }
  const report = activeReport ?? availableReports[0];

  // ── Derived subsector options ──
  const availableSubSectors = useMemo(() => {
    const all = new Set<string>();
    for (const sec of sectors) {
      const subs = SUB_SECTORS_BY_SECTOR.get(sec);
      if (subs) subs.forEach((s) => all.add(s));
    }
    return [ALL, ...all];
  }, [sectors]);

  if (subSectorFilter !== ALL && !availableSubSectors.includes(subSectorFilter)) {
    setSubSectorFilter(ALL);
  }

  // ── Load grid data when filters change ──
  useEffect(() => {
    if (!report) return;
    const currentReportId = report.id;
    let cancelled = false;

    const sectorsParam = sectors.length < SECTOR_LIST.length ? sectors : undefined;

    const load = async () => {
      let response;
      if (grouping === "total") {
        response = await climateImpactScenarioSummary({
          reportId: currentReportId,
          scenarios,
          metrics,
        });
      } else if (grouping === "sector") {
        response = await climateImpactSectorSummary({
          reportId: currentReportId,
          scenarios,
          metrics,
          sectors: sectorsParam,
        });
      } else {
        response = await climateImpactSubSectorSummary({
          reportId: currentReportId,
          scenarios,
          metrics,
          sectors: sectorsParam,
          subSector: subSectorFilter !== ALL ? subSectorFilter : undefined,
        });
      }
      if (!cancelled) {
        setRun(response.run);
        setGridRows(response.rows);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [report, scenarios, metrics, grouping, sectors, subSectorFilter]);

  // ── Column definitions ──
  const columnDefs = useMemo<ColDef<SummaryRow>[]>(() => {
    const cols: ColDef<SummaryRow>[] = [
      { field: "scenario", headerName: "Scenario", width: 140, sortable: true, filter: true },
      { field: "metric",   headerName: "Metric",   width: 130, sortable: true, filter: true },
      { field: "sector",   headerName: "Sector",   width: 150, sortable: true, filter: true },
    ];
    if (grouping === "subSector") {
      cols.push({ field: "subSector", headerName: "SubSector", width: 150, sortable: true, filter: true });
    }
    cols.push(
      { field: "currentValuation",   headerName: "Current Valuation",   width: 170, sortable: true, cellRenderer: CurrencyCellRenderer },
      { field: "projectedValuation", headerName: "Projected Valuation", width: 180, sortable: true, cellRenderer: CurrencyCellRenderer },
      { field: "pctChange",          headerName: "% Change",            width: 120, sortable: true, cellRenderer: PctChangeCellRenderer },
    );
    return cols;
  }, [grouping]);

  // ── Row double-click → fetch detail and open modal ──
  const onRowDoubleClicked = useCallback(
    async (event: RowDoubleClickedEvent<SummaryRow>) => {
      if (!event.data || !report) return;
      const row = event.data;
      setModalRow(row);

      const params: RunDataParams = {
        reportId: report.id,
        scenarios: [row.scenario],
        metrics: [row.metric],
      };
      if (row.sector && row.sector !== "All Sectors") {
        params.sectors = [row.sector];
      }
      if (row.subSector) {
        params.subSectors = [row.subSector];
      }

      const { rows } = await climateImpactRunData(params);
      setModalData(rows);
      dialogRef.current?.showModal();
    },
    [report]
  );

  const closeModal = useCallback(() => {
    dialogRef.current?.close();
    setModalRow(null);
    setModalData([]);
  }, []);

  const modalDetailCols = useMemo<ColDef<RunDataRow>[]>(
    () => [
      { field: "asset",               headerName: "Asset",               flex: 1, minWidth: 160, sortable: true },
      { field: "sector",              headerName: "Sector",              width: 130, sortable: true },
      { field: "subSector",           headerName: "SubSector",           width: 130, sortable: true },
      { field: "currentValuation",    headerName: "Current Valuation",   width: 160, sortable: true, cellRenderer: CurrencyCellRenderer },
      { field: "projectedValuation",  headerName: "Projected Valuation", width: 170, sortable: true, cellRenderer: CurrencyCellRenderer },
      { field: "pctChange",           headerName: "% Change",            width: 110, sortable: true, cellRenderer: PctChangeCellRenderer },
    ],
    []
  );

  if (!report) return null;

  return (
    <div className={styles.wrapper}>
      {/* ── Card 1: Status + Report + Grouping ── */}
      <div className={styles.toolbar}>
        <div className={styles.controlGroup}>
          <label className={styles.label}>Status</label>
          <div className={styles.segmentedToggle}>
            <button
              type="button"
              className={`${styles.segBtn} ${published ? styles.segBtnActive : ""}`}
              onClick={() => setPublished(true)}
            >
              Published
            </button>
            <button
              type="button"
              className={`${styles.segBtn} ${!published ? styles.segBtnActive : ""}`}
              onClick={() => setPublished(false)}
            >
              Draft
            </button>
          </div>
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label} htmlFor="report-select">
            Report
          </label>
          <select
            id="report-select"
            className={styles.select}
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
          >
            {availableReports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label}>Grouping</label>
          <div className={styles.segmentedToggle}>
            {GROUPINGS.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`${styles.segBtn} ${grouping === g.id ? styles.segBtnActive : ""}`}
                onClick={() => setGrouping(g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label}>Display</label>
          <div className={styles.segmentedToggle}>
            {DISPLAY_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`${styles.segBtn} ${displayMode === m.id ? styles.segBtnActive : ""}`}
                onClick={() => setDisplayMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <p className={styles.reportDescription}>{report.description}</p>
      </div>

      {/* ── Card 2: Scenario + Metric + Sector/SubSector filters ── */}
      <div className={styles.toolbar}>
        <MultiSelect
          label="Scenario"
          options={SCENARIOS}
          selected={scenarios}
          onChange={setScenarios}
        />

        <MultiSelect
          label="Metric"
          options={METRICS}
          selected={metrics}
          onChange={setMetrics}
        />

        {grouping !== "total" && (
          <MultiSelect
            label="Sector"
            options={SECTOR_LIST}
            selected={sectors}
            onChange={setSectors}
          />
        )}

        {grouping === "subSector" && (
          <div className={styles.controlGroup}>
            <label className={styles.label} htmlFor="subsector-filter">
              SubSector
            </label>
            <select
              id="subsector-filter"
              className={styles.select}
              value={subSectorFilter}
              onChange={(e) => setSubSectorFilter(e.target.value)}
            >
              {availableSubSectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Grid card ── */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>
              {report.name}
            </h2>
            <p className={styles.cardMeta}>
              {run && (
                <>Run {run.id} &middot; {new Date(run.createdAt).toLocaleDateString()} &nbsp;&middot; </>
              )}
              {displayMode === "table" && "Double-click a row to view details"}
            </p>
          </div>
          <div className={styles.gridActions}>
            {displayMode === "table" && (
              <>
                <button type="button" className={styles.actionBtn} onClick={() => downloadCsv(mainGridRef, columnDefs, `${report.name}.csv`)}>
                  CSV
                </button>
                <button type="button" className={styles.actionBtn} onClick={() => copyToClipboard(mainGridRef, columnDefs)}>
                  Copy
                </button>
              </>
            )}
            <span className={styles.badge}>
              {published ? "Published" : "Draft"}
            </span>
          </div>
        </div>
        <div className={styles.gridContainer}>
          {displayMode === "table" && (
            <div className="ag-theme-alpine" style={{ width: '100%', height: '100%' }}>
              <AgGridReact<SummaryRow>
                ref={mainGridRef}
                rowData={gridRows}
                columnDefs={columnDefs}
                defaultColDef={{ resizable: true }}
                animateRows={true}
                pagination={true}
                paginationPageSize={18}
                paginationPageSizeSelector={[6, 12, 18]}
                onRowDoubleClicked={onRowDoubleClicked}
              />
            </div>
          )}
          {displayMode === "chart" && (
            <BarChart rows={gridRows} />
          )}
          {displayMode === "heatmap" && (
            <HeatMap rows={gridRows} />
          )}
        </div>
      </div>

      {/* ── Detail modal ── */}
      <dialog ref={dialogRef} className={styles.dialog} onClick={(e) => { if (e.target === dialogRef.current) closeModal(); }}>
        <div className={styles.dialogPanel}>
          <div className={styles.dialogHeader}>
            <h3 className={styles.dialogTitle}>
              {modalRow
                ? grouping === "total"
                  ? "All Sectors — Underlying Assets"
                  : grouping === "sector"
                    ? `${modalRow.sector} — Underlying Assets`
                    : `${modalRow.sector} / ${modalRow.subSector} — Underlying Assets`
                : "Detail"}
            </h3>
            <div className={styles.gridActions}>
              <button type="button" className={styles.actionBtn} onClick={() => downloadCsv(modalGridRef, modalDetailCols, "detail.csv")}>
                CSV
              </button>
              <button type="button" className={styles.actionBtn} onClick={() => copyToClipboard(modalGridRef, modalDetailCols)}>
                Copy
              </button>
              <button type="button" className={styles.dialogClose} onClick={closeModal}>
                &times;
              </button>
            </div>
          </div>
          <div className={styles.dialogBody}>
            {modalData.length > 0 && (
              <div className={styles.dialogGrid}>
                <div className="ag-theme-alpine" style={{ width: '100%', height: '100%' }}>
                  <AgGridReact<RunDataRow>
                    ref={modalGridRef}
                    rowData={modalData}
                    columnDefs={modalDetailCols}
                    defaultColDef={{ resizable: true }}
                    animateRows={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
