/**
 * Climate Impact Reports — mock API wrapper.
 *
 * Each exported async function mirrors a REST endpoint.  The implementations
 * use deterministic in-memory data; replace with fetch() calls when a
 * backend is available.
 */

// ── Exported types ─────────────────────────────────────────────────────

export interface Report {
  id: string;
  name: string;
  description: string;
  published: boolean;
  runId: string;
}

export interface ReportRun {
  id: string;
  reportId: string;
  createdAt: string;
}

export interface SummaryRow {
  scenario: string;
  metric: string;
  sector: string;
  subSector: string;
  currentValuation: number;
  projectedValuation: number;
}

export interface RunDataRow {
  runId: string;
  scenario: string;
  metric: string;
  sector: string;
  subSector: string;
  asset: string;
  currentValuation: number;
  projectedValuation: number;
  metricValue: number;
}

// ── Request / response shapes ──────────────────────────────────────────

export interface ScenarioSummaryParams {
  reportId: string;
  scenarios: string[];
  metrics: string[];
}

export interface SectorSummaryParams {
  reportId: string;
  scenarios: string[];
  metrics: string[];
  sectors?: string[];
}

export interface SubSectorSummaryParams {
  reportId: string;
  scenarios: string[];
  metrics: string[];
  sectors?: string[];
  subSector?: string;
}

export interface RunDataParams {
  reportId: string;
  scenarios?: string[];
  metrics?: string[];
  sectors?: string[];
  subSectors?: string[];
  assets?: string[];
}

export interface SummaryResponse {
  run: ReportRun;
  rows: SummaryRow[];
}

export interface RunDataResponse {
  run: ReportRun;
  rows: RunDataRow[];
}

export interface FiltersResponse {
  scenarios: string[];
  metrics: string[];
  sectors: string[];
  subSectorsBySector: Record<string, string[]>;
}

// ── Constants (for UI drop-downs) ──────────────────────────────────────

export const SCENARIOS = ["Base Case", "Optimistic", "Pessimistic", "Stress Test"];
export const METRICS = ["Revenue", "EBITDA", "Net Income", "Cash Flow", "Headcount"];

// ── Internal mock data ─────────────────────────────────────────────────

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

export const SECTOR_LIST: string[] = Array.from(new Set(ASSET_DEFS.map((a) => a.sector)));

export const SUB_SECTORS_BY_SECTOR: ReadonlyMap<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const a of ASSET_DEFS) {
    const list = m.get(a.sector) || [];
    if (!list.includes(a.subSector)) list.push(a.subSector);
    m.set(a.sector, list);
  }
  return m;
})();

const REPORTS_DATA: Report[] = [
  { id: "rpt-001", name: "Q4 2025 Revenue",        description: "Final quarter revenue actuals across all business lines and geographies.",                 published: true,  runId: "run-a1b2c3d4" },
  { id: "rpt-002", name: "Annual Performance",      description: "Year-end performance review covering profitability, growth, and key operational metrics.", published: true,  runId: "run-e5f6a7b8" },
  { id: "rpt-003", name: "Market Analysis 2025",    description: "Competitive landscape and market-share analysis for FY2025.",                             published: true,  runId: "run-c9d0e1f2" },
  { id: "rpt-004", name: "Q1 2026 Forecast",        description: "Forward-looking projections for Q1 2026 using latest macro assumptions.",                 published: false, runId: "run-a3b4c5d6" },
  { id: "rpt-005", name: "Budget Proposal",          description: "Draft departmental budget allocations for the upcoming fiscal year.",                     published: false, runId: "run-e7f8a9b0" },
  { id: "rpt-006", name: "Headcount Plan",           description: "Workforce planning model with hiring targets and attrition estimates.",                   published: false, runId: "run-c1d2e3f4" },
  { id: "rpt-007", name: "Customer Churn Analysis",  description: "Cohort-level churn rates and retention driver analysis.",                                 published: false, runId: "run-a5b6c7d8" },
  { id: "rpt-008", name: "New Market Entry Study",   description: "Feasibility assessment for expansion into three target markets.",                         published: false, runId: "run-e9f0a1b2" },
  { id: "rpt-009", name: "Cost Optimisation Draft",  description: "Preliminary cost-reduction scenarios across supply chain and G&A.",                       published: false, runId: "run-c3d4e5f6" },
];

// ── Internal helpers ───────────────────────────────────────────────────

function findReport(reportId: string): Report {
  const r = REPORTS_DATA.find((r) => r.id === reportId);
  if (!r) throw new Error(`Report not found: ${reportId}`);
  return r;
}

function makeRun(report: Report): ReportRun {
  const seed = report.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 100;
  return {
    id: report.runId,
    reportId: report.id,
    createdAt: new Date(2025, 0, 1 + seed).toISOString(),
  };
}

function generateRawRows(report: Report, scenario: string, metric: string): RunDataRow[] {
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

  return ASSET_DEFS.map((def, i) => {
    const assetFactor = 1 - i * 0.02;
    const base = (500 + seed * 30 + i * 80) * 1000;
    const currentValuation = Math.round(base * assetFactor);
    const projected = Math.round(
      currentValuation * scenarioFactor * (1 + (seed % 7) * 0.008 - i * 0.003)
    );
    // metricValue is the percentage change
    const metricValue = parseFloat(
      (((projected - currentValuation) / currentValuation) * 100).toFixed(2)
    );

    return {
      runId,
      scenario,
      metric,
      sector: def.sector,
      subSector: def.subSector,
      asset: def.asset,
      currentValuation,
      projectedValuation: projected,
      metricValue,
    };
  });
}

// ── API methods ────────────────────────────────────────────────────────

/** GET /climate_impact_reports */
export async function climateImpactReports(): Promise<Report[]> {
  return REPORTS_DATA;
}

/** GET /climate_impact_filters */
export async function climateImpactFilters(reportId: string): Promise<FiltersResponse> {
  // Validate report exists
  findReport(reportId);

  // In a real implementation, these would be derived from the report's actual data
  // For now, return the same filters for all reports
  const sectors = Array.from(new Set(ASSET_DEFS.map((a) => a.sector)));
  const subSectorsBySector: Record<string, string[]> = {};

  for (const a of ASSET_DEFS) {
    if (!subSectorsBySector[a.sector]) {
      subSectorsBySector[a.sector] = [];
    }
    if (!subSectorsBySector[a.sector].includes(a.subSector)) {
      subSectorsBySector[a.sector].push(a.subSector);
    }
  }

  return {
    scenarios: [...SCENARIOS],
    metrics: [...METRICS],
    sectors,
    subSectorsBySector,
  };
}

/** GET /climate_impact_scenario_summary */
export async function climateImpactScenarioSummary(
  params: ScenarioSummaryParams
): Promise<SummaryResponse> {
  const report = findReport(params.reportId);
  const run = makeRun(report);
  const rows: SummaryRow[] = [];

  for (const scenario of params.scenarios) {
    for (const metric of params.metrics) {
      const raw = generateRawRows(report, scenario, metric);
      const cur = raw.reduce((s, r) => s + r.currentValuation, 0);
      const proj = raw.reduce((s, r) => s + r.projectedValuation, 0);
      rows.push({
        scenario,
        metric,
        sector: "All Sectors",
        subSector: "",
        currentValuation: cur,
        projectedValuation: proj,
      });
    }
  }

  return { run, rows };
}

/** GET /climate_impact_sector_summary */
export async function climateImpactSectorSummary(
  params: SectorSummaryParams
): Promise<SummaryResponse> {
  const report = findReport(params.reportId);
  const run = makeRun(report);
  const rows: SummaryRow[] = [];

  for (const scenario of params.scenarios) {
    for (const metric of params.metrics) {
      let raw = generateRawRows(report, scenario, metric);
      if (params.sectors) raw = raw.filter((r) => params.sectors!.includes(r.sector));

      const groups = new Map<string, RunDataRow[]>();
      for (const r of raw) {
        const arr = groups.get(r.sector) || [];
        arr.push(r);
        groups.set(r.sector, arr);
      }

      for (const [sector, children] of groups) {
        const cur = children.reduce((s, r) => s + r.currentValuation, 0);
        const proj = children.reduce((s, r) => s + r.projectedValuation, 0);
        rows.push({
          scenario,
          metric,
          sector,
          subSector: "",
          currentValuation: cur,
          projectedValuation: proj,
        });
      }
    }
  }

  return { run, rows };
}

/** GET /climate_impact_subsector_summary */
export async function climateImpactSubSectorSummary(
  params: SubSectorSummaryParams
): Promise<SummaryResponse> {
  const report = findReport(params.reportId);
  const run = makeRun(report);
  const rows: SummaryRow[] = [];

  for (const scenario of params.scenarios) {
    for (const metric of params.metrics) {
      let raw = generateRawRows(report, scenario, metric);
      if (params.sectors) raw = raw.filter((r) => params.sectors!.includes(r.sector));
      if (params.subSector) raw = raw.filter((r) => r.subSector === params.subSector);

      const groups = new Map<string, RunDataRow[]>();
      for (const r of raw) {
        const key = `${r.sector}|${r.subSector}`;
        const arr = groups.get(key) || [];
        arr.push(r);
        groups.set(key, arr);
      }

      for (const children of groups.values()) {
        const cur = children.reduce((s, r) => s + r.currentValuation, 0);
        const proj = children.reduce((s, r) => s + r.projectedValuation, 0);
        rows.push({
          scenario,
          metric,
          sector: children[0].sector,
          subSector: children[0].subSector,
          currentValuation: cur,
          projectedValuation: proj,
        });
      }
    }
  }

  return { run, rows };
}

/** GET /climate_impact_run_data */
export async function climateImpactRunData(
  params: RunDataParams
): Promise<RunDataResponse> {
  const report = findReport(params.reportId);
  const run = makeRun(report);

  const scenariosToLoad = params.scenarios ?? SCENARIOS;
  const metricsToLoad = params.metrics ?? METRICS;

  let rows: RunDataRow[] = [];
  for (const scenario of scenariosToLoad) {
    for (const metric of metricsToLoad) {
      rows.push(...generateRawRows(report, scenario, metric));
    }
  }

  if (params.sectors) rows = rows.filter((r) => params.sectors!.includes(r.sector));
  if (params.subSectors) rows = rows.filter((r) => params.subSectors!.includes(r.subSector));
  if (params.assets) rows = rows.filter((r) => params.assets!.includes(r.asset));

  return { run, rows };
}
