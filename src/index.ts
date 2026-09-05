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

import App, {
  exportPdf as exportOdontogramPdf,
  getPdfSettings,
  setPdfSettings,
} from "./App";
import { setPdfHostReportData } from "./perioPdf";
import type { PdfExportOptions, PdfHostReportData } from "./perioPdf";

// The main component, exported both as a default and under an explicit,
// self-documenting name.
export default App;
export { App as OdontogramShell };

const ORALLIX_CLINICAL_REPORT_TITLE = "ORALLIX Clinical Record Report";

async function loadOrallixLogoDataUrl(): Promise<string | undefined> {
  if (typeof window === "undefined" || typeof FileReader === "undefined") {
    return undefined;
  }

  try {
    const response = await fetch("/brand/orallix-logo-footer-v13.png", {
      cache: "force-cache",
    });
    if (!response.ok) return undefined;
    const blob = await response.blob();

    return await new Promise<string | undefined>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.onerror = () =>
        reject(reader.error ?? new Error("ORALLIX logo could not be loaded."));
      reader.readAsDataURL(blob);
    });
  } catch {
    // The stationery renderer falls back to the ORALLIX wordmark text, so a
    // transient asset failure must never block a clinical PDF export.
    return undefined;
  }
}

/**
 * Host-aware PDF export. Existing callers can keep using `exportPdf(opts)`
 * unchanged. Embedding clinical applications may pass a second, presentation-
 * only object containing patient rows and additional report sections; that data
 * is handed to the existing PDF assembler for this export only and is never
 * written into odontogram status/plan/FHIR state.
 *
 * The ORALLIX clinical-record host report is additionally branded here so the
 * application does not need a second PDF engine. The scope is deliberately
 * exact-title gated: all other consumers retain their existing PDF settings and
 * native footer behavior unchanged.
 */
let hostPdfExportInProgress = false;
export async function exportPdf(
  opts: PdfExportOptions,
  hostReportData?: PdfHostReportData,
): Promise<void> {
  // Match the engine's existing one-export-at-a-time behavior while protecting
  // the scoped host-data handoff from a concurrent wrapper call.
  if (hostPdfExportInProgress) return;
  hostPdfExportInProgress = true;

  const isOrallixClinicalReport =
    hostReportData?.reportTitle?.trim() === ORALLIX_CLINICAL_REPORT_TITLE;
  const previousPdfSettings = isOrallixClinicalReport
    ? getPdfSettings()
    : null;

  try {
    let scopedHostReportData = hostReportData;

    if (isOrallixClinicalReport && hostReportData) {
      // Report-only override. Restore the caller's session settings in finally.
      setPdfSettings({
        toothNumberSize: "small",
        showDisclaimer: false,
        showGenerator: false,
      });

      const logoPng = await loadOrallixLogoDataUrl();
      scopedHostReportData = {
        ...hostReportData,
        stationery: hostReportData.stationery ?? {
          brandName: "ORALLIX",
          documentLabel: "Clinical Record Report",
          metaLabel: "Record number",
          metaValue:
            hostReportData.patient?.find(
              (row) => row.label.trim().toLowerCase() === "record number",
            )?.value ?? "",
          website: "orallix.com",
          footerText:
            "Confidential clinical record · Authorized clinical use only",
          logoPng,
          headerColor: [0, 29, 60],
          accentColor: [2, 114, 234],
        },
      };
    }

    setPdfHostReportData(scopedHostReportData ?? null);
    await exportOdontogramPdf(opts);
  } finally {
    setPdfHostReportData(null);
    if (previousPdfSettings) setPdfSettings(previousPdfSettings);
    hostPdfExportInProgress = false;
  }
}

export type {
  PdfExportOptions,
  PdfHostReportData,
  PdfHostReportSection,
  PdfHostReportStationery,
  PdfRow,
} from "./perioPdf";

// Host/report-only composable surfaces. They read the same live engine state as
// the editor but do not mount editor controls or create another source of truth.
export { default as OdontogramReportSurface } from "./surfaces/OdontogramReportSurface";
export { default as PeriodontalReportSurface } from "./surfaces/PeriodontalReportSurface";

// Everything else already surfaced by App.tsx (state functions, PerioChart,
// startIntroTour, and the public types). The explicit `exportPdf` above takes
// precedence over the same name from this star export, preserving the old API
// while adding the optional host-report argument at the package root.
export * from "./App";
