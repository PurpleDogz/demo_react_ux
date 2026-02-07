"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, ColDef, RowDoubleClickedEvent } from "ag-grid-community";
import styles from "./ReportExplorer.module.css";

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

// ── Data model ──────────────────────────────────────────────────────────

interface Report {
  id: string;
  name: string;
  description: string;
  published: boolean;
  runId: string; // FK → ReportRun.id
}

interface ReportRun {
  id: string; // GUID
  reportId: string;
  createdAt: string;
  scenario: string;
  metric: string;
}

interface RunDataRow {
  id: string; // GUID
  runId: string; // FK → ReportRun.id
  scenario: string;
  metric: string;
  sector: string;
  subSector: string;
  asset: string;
  currentValuation: number;
  projectedValuation: number;
  pctChange: number;
}

/** Aggregated row shown in the grid (may represent total, sector, or full detail). */
interface GridRow {
  scenario: string;
  metric: string;
  sector: string;
  subSector: string;
  asset: string;
  currentValuation: number;
  projectedValuation: number;
  pctChange: number;
  /** Underlying detail rows for drill-down */
  _children: RunDataRow[];
}

type Grouping = "total" | "sector" | "subSector";

// ── Mock data ───────────────────────────────────────────────────────────

const REPORTS: Report[] = [
  { id: "rpt-001", name: "Q4 2025 Revenue",        description: "Final quarter revenue actuals across all business lines and geographies.",                    published: true,  runId: "run-a1b2c3d4" },
  { id: "rpt-002", name: "Annual Performance",      description: "Year-end performance review covering profitability, growth, and key operational metrics.",    published: true,  runId: "run-e5f6a7b8" },
  { id: "rpt-003", name: "Market Analysis 2025",    description: "Competitive landscape and market-share analysis for FY2025.",                                published: true,  runId: "run-c9d0e1f2" },
  { id: "rpt-004", name: "Q1 2026 Forecast",        description: "Forward-looking projections for Q1 2026 using latest macro assumptions.",                    published: false, runId: "run-a3b4c5d6" },
  { id: "rpt-005", name: "Budget Proposal",          description: "Draft departmental budget allocations for the upcoming fiscal year.",                        published: false, runId: "run-e7f8a9b0" },
  { id: "rpt-006", name: "Headcount Plan",           description: "Workforce planning model with hiring targets and attrition estimates.",                      published: false, runId: "run-c1d2e3f4" },
  { id: "rpt-007", name: "Customer Churn Analysis",  description: "Cohort-level churn rates and retention driver analysis.",                                    published: false, runId: "run-a5b6c7d8" },
  { id: "rpt-008", name: "New Market Entry Study",   description: "Feasibility assessment for expansion into three target markets.",                            published: false, runId: "run-e9f0a1b2" },
  { id: "rpt-009", name: "Cost Optimisation Draft",  description: "Preliminary cost-reduction scenarios across supply chain and G&A.",                          published: false, runId: "run-c3d4e5f6" },
];

const SCENARIOS = ["Base Case", "Optimistic", "Pessimistic", "Stress Test"];
const METRICS = ["Revenue", "EBITDA", "Net Income", "Cash Flow", "Headcount"];

interface AssetDef {
  sector: string;
  subSector: string;
  asset: string;
}

const ASSET_DEFS: AssetDef[] = [
  // Equities — Developed (6)
  { sector: "Equities",     subSector: "Developed",    asset: "US Large Cap" },
  { sector: "Equities",     subSector: "Developed",    asset: "US Mid Cap" },
  { sector: "Equities",     subSector: "Developed",    asset: "US Small Cap" },
  { sector: "Equities",     subSector: "Developed",    asset: "European Equities" },
  { sector: "Equities",     subSector: "Developed",    asset: "Japan Equities" },
  { sector: "Equities",     subSector: "Developed",    asset: "Australia / NZ Equities" },
  // Equities — Emerging (5)
  { sector: "Equities",     subSector: "Emerging",     asset: "EM Asia" },
  { sector: "Equities",     subSector: "Emerging",     asset: "EM Latin America" },
  { sector: "Equities",     subSector: "Emerging",     asset: "EM EMEA" },
  { sector: "Equities",     subSector: "Emerging",     asset: "Frontier Markets" },
  { sector: "Equities",     subSector: "Emerging",     asset: "China A-Shares" },
  // Fixed Income — Government (4)
  { sector: "Fixed Income", subSector: "Government",   asset: "US Treasuries" },
  { sector: "Fixed Income", subSector: "Government",   asset: "Sovereign Debt (ex-US)" },
  { sector: "Fixed Income", subSector: "Government",   asset: "TIPS / Inflation-Linked" },
  { sector: "Fixed Income", subSector: "Government",   asset: "Agency Bonds" },
  // Fixed Income — Corporate (3)
  { sector: "Fixed Income", subSector: "Corporate",    asset: "Investment Grade" },
  { sector: "Fixed Income", subSector: "Corporate",    asset: "High Yield" },
  { sector: "Fixed Income", subSector: "Corporate",    asset: "Convertible Bonds" },
  // Fixed Income — Structured (3)
  { sector: "Fixed Income", subSector: "Structured",   asset: "MBS / Agency" },
  { sector: "Fixed Income", subSector: "Structured",   asset: "ABS / Consumer" },
  { sector: "Fixed Income", subSector: "Structured",   asset: "CLOs" },
  // Alternatives — Real Assets (4)
  { sector: "Alternatives", subSector: "Real Assets",  asset: "Real Estate (REIT)" },
  { sector: "Alternatives", subSector: "Real Assets",  asset: "Infrastructure" },
  { sector: "Alternatives", subSector: "Real Assets",  asset: "Commodities" },
  { sector: "Alternatives", subSector: "Real Assets",  asset: "Timberland / Farmland" },
  // Alternatives — Private (4)
  { sector: "Alternatives", subSector: "Private",      asset: "Private Equity — Buyout" },
  { sector: "Alternatives", subSector: "Private",      asset: "Private Equity — Growth" },
  { sector: "Alternatives", subSector: "Private",      asset: "Venture Capital" },
  { sector: "Alternatives", subSector: "Private",      asset: "Private Credit" },
  // Alternatives — Hedge Funds (3)
  { sector: "Alternatives", subSector: "Hedge Funds",  asset: "Long / Short Equity" },
  { sector: "Alternatives", subSector: "Hedge Funds",  asset: "Global Macro" },
  { sector: "Alternatives", subSector: "Hedge Funds",  asset: "Event Driven" },
  // Cash — Liquid (2)
  { sector: "Cash",         subSector: "Liquid",       asset: "Cash & Equivalents" },
  { sector: "Cash",         subSector: "Liquid",       asset: "Money Market Funds" },
];

/** Deterministic GUID-like string from seed inputs. */
function makeGuid(a: string, b: string, c: string, idx: number): string {
  const hash = (a + b + c + idx)
    .split("")
    .reduce((h, ch) => ((h << 5) - h + ch.charCodeAt(0)) | 0, 0);
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-a${hex.slice(2, 5)}-${hex.padEnd(12, "0").slice(0, 12)}`;
}

/** Build a ReportRun + its RunDataRows for a given filter combination. */
function buildRunData(
  report: Report,
  scenario: string,
  metric: string
): { run: ReportRun; rows: RunDataRow[] } {
  const runId = report.runId;

  const seed =
    (report.id + scenario + metric)
      .split("")
      .reduce((a, c) => a + c.charCodeAt(0), 0) % 100;

  const scenarioFactor =
    scenario === "Optimistic"
      ? 1.12
      : scenario === "Pessimistic"
        ? 0.88
        : scenario === "Stress Test"
          ? 0.72
          : 1;

  const run: ReportRun = {
    id: runId,
    reportId: report.id,
    createdAt: new Date(2025, 0, 1 + seed).toISOString(),
    scenario,
    metric,
  };

  const rows: RunDataRow[] = ASSET_DEFS.map((def, i) => {
    const assetFactor = 1 - i * 0.02;
    const base = (500 + seed * 30 + i * 80) * 1000;
    const currentValuation = Math.round(base * assetFactor);
    const projected = Math.round(
      currentValuation * scenarioFactor * (1 + (seed % 7) * 0.008 - i * 0.003)
    );
    const pctChange = parseFloat(
      (((projected - currentValuation) / currentValuation) * 100).toFixed(2)
    );

    return {
      id: makeGuid(report.id, scenario + metric, def.asset, i),
      runId,
      scenario,
      metric,
      sector: def.sector,
      subSector: def.subSector,
      asset: def.asset,
      currentValuation,
      projectedValuation: projected,
      pctChange,
    };
  });

  return { run, rows };
}

/** Aggregate a single scenario's rows by grouping mode. */
function aggregateScenario(rows: RunDataRow[], grouping: Grouping): GridRow[] {
  if (rows.length === 0) return [];
  const { scenario, metric } = rows[0];

  if (grouping === "subSector") {
    const groups = new Map<string, RunDataRow[]>();
    for (const r of rows) {
      const key = `${r.sector}|${r.subSector}`;
      const arr = groups.get(key) || [];
      arr.push(r);
      groups.set(key, arr);
    }
    return Array.from(groups.values()).map((children) => {
      const cur = children.reduce((s, r) => s + r.currentValuation, 0);
      const proj = children.reduce((s, r) => s + r.projectedValuation, 0);
      return {
        scenario,
        metric,
        sector: children[0].sector,
        subSector: children[0].subSector,
        asset: "",
        currentValuation: cur,
        projectedValuation: proj,
        pctChange: parseFloat((((proj - cur) / cur) * 100).toFixed(2)),
        _children: children,
      };
    });
  }

  if (grouping === "sector") {
    const groups = new Map<string, RunDataRow[]>();
    for (const r of rows) {
      const arr = groups.get(r.sector) || [];
      arr.push(r);
      groups.set(r.sector, arr);
    }
    return Array.from(groups.entries()).map(([sector, children]) => {
      const cur = children.reduce((s, r) => s + r.currentValuation, 0);
      const proj = children.reduce((s, r) => s + r.projectedValuation, 0);
      return {
        scenario,
        metric,
        sector,
        subSector: "",
        asset: "",
        currentValuation: cur,
        projectedValuation: proj,
        pctChange: parseFloat((((proj - cur) / cur) * 100).toFixed(2)),
        _children: children,
      };
    });
  }

  // total
  const cur = rows.reduce((s, r) => s + r.currentValuation, 0);
  const proj = rows.reduce((s, r) => s + r.projectedValuation, 0);
  return [
    {
      scenario,
      metric,
      sector: "All Sectors",
      subSector: "",
      asset: "",
      currentValuation: cur,
      projectedValuation: proj,
      pctChange: parseFloat((((proj - cur) / cur) * 100).toFixed(2)),
      _children: rows,
    },
  ];
}

/** Aggregate rows per scenario, keeping each scenario as separate rows. */
function aggregateRows(rows: RunDataRow[], grouping: Grouping): GridRow[] {
  const byScenario = new Map<string, RunDataRow[]>();
  for (const r of rows) {
    const arr = byScenario.get(r.scenario) || [];
    arr.push(r);
    byScenario.set(r.scenario, arr);
  }
  const result: GridRow[] = [];
  for (const scenarioRows of byScenario.values()) {
    result.push(...aggregateScenario(scenarioRows, grouping));
  }
  return result;
}

// ── Cell renderers ──────────────────────────────────────────────────────

function CurrencyCellRenderer(params: { value: number }) {
  return <span>${params.value.toLocaleString()}</span>;
}

function PctChangeCellRenderer(params: { value: number }) {
  const cls = params.value >= 0 ? styles.positive : styles.negative;
  return <span className={cls}>{params.value >= 0 ? "+" : ""}{params.value.toFixed(2)}%</span>;
}

// ── Grid export helpers ──────────────────────────────────────────────────

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

const GROUPINGS: { id: Grouping; label: string }[] = [
  { id: "total", label: "Total" },
  { id: "sector", label: "By Sector" },
  { id: "subSector", label: "By SubSector" },
];

const ALL = "All";
const SECTORS = [ALL, ...Array.from(new Set(ASSET_DEFS.map((a) => a.sector)))];
const SUB_SECTORS_BY_SECTOR = new Map<string, string[]>();
for (const a of ASSET_DEFS) {
  const list = SUB_SECTORS_BY_SECTOR.get(a.sector) || [];
  if (!list.includes(a.subSector)) list.push(a.subSector);
  SUB_SECTORS_BY_SECTOR.set(a.sector, list);
}

export default function ReportExplorer() {
  const [published, setPublished] = useState(true);
  const [reportId, setReportId] = useState(REPORTS[0].id);
  const [scenarios, setScenarios] = useState<string[]>([SCENARIOS[0]]);
  const [metric, setMetric] = useState(METRICS[0]);
  const [grouping, setGrouping] = useState<Grouping>("subSector");
  const [sectorFilter, setSectorFilter] = useState(ALL);
  const [subSectorFilter, setSubSectorFilter] = useState(ALL);
  const [modalRow, setModalRow] = useState<GridRow | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mainGridRef = useRef<AgGridReact<GridRow>>(null);
  const modalGridRef = useRef<AgGridReact<RunDataRow>>(null);

  const availableReports = REPORTS.filter((r) =>
    published ? r.published : true
  );

  // Reset selection when the current report falls out of the filtered list
  const activeReport = availableReports.find((r) => r.id === reportId);
  if (!activeReport && availableReports.length > 0) {
    setReportId(availableReports[0].id);
  }

  const report = activeReport ?? availableReports[0];

  const { run, rows: rawRows } = useMemo(() => {
    const allRows: RunDataRow[] = [];
    let latestRun: ReportRun | null = null;
    for (const sc of scenarios) {
      const result = buildRunData(report, sc, metric);
      allRows.push(...result.rows);
      latestRun = result.run;
    }
    return { run: latestRun!, rows: allRows };
  }, [report, scenarios, metric]);

  // Derive available subsectors based on selected sector filter
  const availableSubSectors = useMemo(() => {
    if (sectorFilter === ALL) {
      return [ALL, ...Array.from(new Set(ASSET_DEFS.map((a) => a.subSector)))];
    }
    return [ALL, ...(SUB_SECTORS_BY_SECTOR.get(sectorFilter) || [])];
  }, [sectorFilter]);

  // Reset subSector filter when sector changes and current value is no longer valid
  if (subSectorFilter !== ALL && !availableSubSectors.includes(subSectorFilter)) {
    setSubSectorFilter(ALL);
  }

  // Filter raw rows by sector/subSector before aggregation
  const filteredRows = useMemo(() => {
    let rows = rawRows;
    if (sectorFilter !== ALL) {
      rows = rows.filter((r) => r.sector === sectorFilter);
    }
    if (subSectorFilter !== ALL) {
      rows = rows.filter((r) => r.subSector === subSectorFilter);
    }
    return rows;
  }, [rawRows, sectorFilter, subSectorFilter]);

  const gridRows = useMemo(
    () => aggregateRows(filteredRows, grouping),
    [filteredRows, grouping]
  );

  const columnDefs = useMemo<ColDef<GridRow>[]>(() => {
    const cols: ColDef<GridRow>[] = [
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

  const onRowDoubleClicked = useCallback((event: RowDoubleClickedEvent<GridRow>) => {
    if (event.data) {
      setModalRow(event.data);
      dialogRef.current?.showModal();
    }
  }, []);

  const closeModal = useCallback(() => {
    dialogRef.current?.close();
    setModalRow(null);
  }, []);

  const modalDetailCols = useMemo<ColDef<RunDataRow>[]>(
    () => [
      { field: "id",                  headerName: "Row ID",              flex: 1.5, minWidth: 200 },
      { field: "sector",              headerName: "Sector",              width: 130, sortable: true },
      { field: "subSector",           headerName: "SubSector",           width: 130, sortable: true },
      { field: "asset",               headerName: "Asset",               flex: 1, minWidth: 160, sortable: true },
      { field: "currentValuation",    headerName: "Current Valuation",   width: 160, sortable: true, cellRenderer: CurrencyCellRenderer },
      { field: "projectedValuation",  headerName: "Projected Valuation", width: 170, sortable: true, cellRenderer: CurrencyCellRenderer },
      { field: "pctChange",           headerName: "% Change",            width: 110, sortable: true, cellRenderer: PctChangeCellRenderer },
    ],
    []
  );

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

        <div className={styles.controlGroup}>
          <label className={styles.label} htmlFor="metric-select">
            Metric
          </label>
          <select
            id="metric-select"
            className={styles.select}
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            {METRICS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {grouping !== "total" && (
          <div className={styles.controlGroup}>
            <label className={styles.label} htmlFor="sector-filter">
              Sector
            </label>
            <select
              id="sector-filter"
              className={styles.select}
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
            >
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
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
              {report.name} &mdash; {scenarios.join(", ")} &mdash; {metric}
            </h2>
            <p className={styles.cardMeta}>
              Run {run.id} &middot;{" "}
              {new Date(run.createdAt).toLocaleDateString()}
              &nbsp;&middot; Double-click a row to view details
            </p>
          </div>
          <div className={styles.gridActions}>
            <button type="button" className={styles.actionBtn} onClick={() => downloadCsv(mainGridRef, columnDefs, `${report.name}.csv`)}>
              CSV
            </button>
            <button type="button" className={styles.actionBtn} onClick={() => copyToClipboard(mainGridRef, columnDefs)}>
              Copy
            </button>
            <span className={styles.badge}>
              {published ? "Published" : "Draft"}
            </span>
          </div>
        </div>
        <div className={styles.gridContainer}>
          <AgGridReact<GridRow>
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
            {modalRow && (
              <div className={styles.dialogGrid}>
                <AgGridReact<RunDataRow>
                  ref={modalGridRef}
                  rowData={modalRow._children}
                  columnDefs={modalDetailCols}
                  defaultColDef={{ resizable: true }}
                  animateRows={true}
                />
              </div>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
