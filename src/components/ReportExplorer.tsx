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

const GROUPINGS: { id: Grouping; label: string }[] = [
  { id: "total", label: "Total" },
  { id: "sector", label: "By Sector" },
  { id: "subSector", label: "By SubSector" },
];

const ALL = "All";

export default function ReportExplorer() {
  const [reports, setReports] = useState<Report[]>([]);
  const [published, setPublished] = useState(true);
  const [reportId, setReportId] = useState("");
  const [scenarios, setScenarios] = useState<string[]>([SCENARIOS[0]]);
  const [metrics, setMetrics] = useState<string[]>([METRICS[0]]);
  const [grouping, setGrouping] = useState<Grouping>("subSector");
  const [sectors, setSectors] = useState<string[]>([...SECTOR_LIST]);
  const [subSectorFilter, setSubSectorFilter] = useState(ALL);
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
              Double-click a row to view details
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
