// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// Created by Zoltan Dul (https://github.com/ZoliQua) 2025-2026
//
// Public library entry point (the npm package's JS + types entry).
//
// Imports the global stylesheet as a side effect so the library build extracts
// it to a single `dist/style.css` (consumers import it once — see the README).
// The bundled type declaration (`dist/index.d.ts`, produced by vite-plugin-dts
// with `rollupTypes`) strips this CSS side-effect import, so a consumer's `tsc`
// never sees an unresolved `./index.css`. The demo/dev app boots from
// `src/main.tsx` instead.
//
// Re-exports the full public API that already lives on `src/App.tsx` (the
// `OdontogramShell` component + the imperative state functions, `PerioChart`,
// `startIntroTour`, and all public types).
import "./index.css";

import App, { exportPdf as exportOdontogramPdf } from "./App";
import { setPdfHostReportData } from "./perioPdf";
import type { PdfExportOptions, PdfHostReportData } from "./perioPdf";

// The main component, exported both as a default and under an explicit,
// self-documenting name.
export default App;
export { App as OdontogramShell };

/**
 * Host-aware PDF export. Existing callers can keep using `exportPdf(opts)`
 * unchanged. Embedding clinical applications may pass a second, presentation-
 * only object containing patient rows and additional report sections; that data
 * is handed to the existing PDF assembler for this export only and is never
 * written into odontogram status/plan/FHIR state.
 */
let hostPdfExportInProgress = false;
export async function exportPdf(
  opts: PdfExportOptions,
  hostReportData?: PdfHostReportData,
): Promise<void> {
  // Match the engine's existing one-export-at-a-time behavior while protecting
  // the scoped host-data handoff from a concurrent wrapper call.
  if(hostPdfExportInProgress) return;
  hostPdfExportInProgress = true;
  setPdfHostReportData(hostReportData ?? null);
  try {
    await exportOdontogramPdf(opts);
  } finally {
    setPdfHostReportData(null);
    hostPdfExportInProgress = false;
  }
}

export type { PdfExportOptions, PdfHostReportData, PdfHostReportSection, PdfRow } from "./perioPdf";

// Host/report-only composable surfaces. They read the same live engine state as
// the editor but do not mount editor controls or create another source of truth.
export { default as OdontogramReportSurface } from "./surfaces/OdontogramReportSurface";
export { default as PeriodontalReportSurface } from "./surfaces/PeriodontalReportSurface";

// Everything else already surfaced by App.tsx (state functions, PerioChart,
// startIntroTour, and the public types). The explicit `exportPdf` above takes
// precedence over the same name from this star export, preserving the old API
// while adding the optional host-report argument at the package root.
export * from "./App";
