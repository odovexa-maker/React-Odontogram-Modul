// Part of React Advanced Odontogram - ORALLIX report-only composition.
// Presentation-only: reuses the native chart renderer + Tooth Information
// summary without exposing editor controls, chart-mode toggles or action bars.

import { type CSSProperties, useEffect } from "react";
import { useOdontogramUi } from "../OdontogramContext";
import { rebuildGrid } from "../odontogram";
import ToothInfoSurface from "./ToothInfoSurface";

function hexToRgbCss(hex: string): string {
  let h = (hex || "").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (h.length !== 6 || !Number.isFinite(n)) return "59,123,255";
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/**
 * Read-only Dental Status report surface.
 *
 * Must be mounted under OdontogramProvider. It intentionally renders only the
 * native tooth-grid graphic and the existing ToothInfoSurface. The editor-only
 * chart header, Status/Plan controls, arch/action buttons and hint text are not
 * mounted at all, so host apps do not need brittle CSS hiding.
 */
export default function OdontogramReportSurface() {
  const {
    t,
    screenSpacing,
    screenNumberSize,
    selectionColor,
    selectionBorderStyle,
    toothAnatomy,
  } = useOdontogramUi();

  useEffect(() => {
    void rebuildGrid();
  }, []);

  return (
    <div className="odontogram-report-surface">
      <section className="chart odontogram-report-chart" aria-label={t("chart.title")}>
        <div
          id="toothGrid"
          className="tooth-grid odontogram-report-grid"
          dir="ltr"
          data-screen-spacing={screenSpacing}
          data-tooth-num={screenNumberSize}
          data-anatomy={toothAnatomy === "measured" ? "measured" : undefined}
          style={{
            "--odon-select-rgb": hexToRgbCss(selectionColor),
            "--odon-select-border-style": selectionBorderStyle,
            pointerEvents: "none",
          } as CSSProperties}
          aria-label={t("chart.aria.toothGrid")}
        />
      </section>
      <ToothInfoSurface />
    </div>
  );
}
