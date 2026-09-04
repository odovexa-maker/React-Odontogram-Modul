// Part of React Advanced Odontogram - ORALLIX report-only composition.
// Presentation-only: this surface reads the native periodontal engine state
// and reuses the same perioGraphic render primitives used by PerioChart.
// It introduces no persistence, mutation path, clinical calculation, or
// second source of truth.

import { useEffect, useRef } from "react";
import {
  getPerioToothKind,
  getToothPerio,
  isToothImplant,
  onStateChange,
  type PerioSite,
} from "../odontogram";
import {
  PERIO_MM_PX,
  archToothLayout,
  buildBuccalArchSvg,
  buildPalatalArchSvg,
  buildPerioCurveLayer,
  buildPerioOverlayLayer,
  loadTemplateCache,
  perioCurve,
  perioOverlayMarks,
  type ArchLayout,
  type PerioCurveSite,
  type PerioOverlaySite,
  type TemplateDocCache,
} from "../perioGraphic";

const UPPER_ARCH: readonly number[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_ARCH: readonly number[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const BUCCAL_SITES: readonly PerioSite[] = ["MB", "B", "DB"];
const LINGUAL_SITES: readonly PerioSite[] = ["ML", "L", "DL"];

function collectCurveInput(
  layout: ArchLayout,
  siteKeys: readonly PerioSite[],
): { sites: PerioCurveSite[]; xs: number[] } {
  const sites: PerioCurveSite[] = [];
  const xs: number[] = [];
  for (const tooth of layout.teeth) {
    const perio = getToothPerio(tooth.toothNo);
    const anyCharted = siteKeys.some((site) => Object.prototype.hasOwnProperty.call(perio.pd, site));
    siteKeys.forEach((site, index) => {
      const charted = Object.prototype.hasOwnProperty.call(perio.pd, site);
      const pd = charted ? perio.pd[site] : anyCharted ? 0 : undefined;
      const gm = pd === undefined
        ? undefined
        : Object.prototype.hasOwnProperty.call(perio.gm, site)
          ? perio.gm[site]
          : 0;
      sites.push({ site, pd, gm });
      xs.push(tooth.x + (tooth.width * (index + 0.5)) / 3);
    });
  }
  return { sites, xs };
}

function collectBopInput(layout: ArchLayout, siteKeys: readonly PerioSite[]): PerioOverlaySite[] {
  const out: PerioOverlaySite[] = [];
  for (const tooth of layout.teeth) {
    const perio = getToothPerio(tooth.toothNo);
    siteKeys.forEach((site, index) => {
      const charted = Object.prototype.hasOwnProperty.call(perio.pd, site);
      out.push({
        x: tooth.x + (tooth.width * (index + 0.5)) / 3,
        pd: charted ? perio.pd[site] : undefined,
        gm: Object.prototype.hasOwnProperty.call(perio.gm, site) ? perio.gm[site] : undefined,
        bop: perio.bop.includes(site),
      });
    });
  }
  return out;
}

function styleSvg(svg: SVGSVGElement): SVGSVGElement {
  svg.style.width = "100%";
  svg.style.height = "auto";
  svg.style.display = "block";
  svg.style.overflow = "visible";
  return svg;
}

function drawCurvesAndBop(container: HTMLElement, cache: TemplateDocCache, teeth: readonly number[]): void {
  container.querySelectorAll(".perio-curve, .perio-report-bop-layer").forEach((node) => node.remove());
  const layout = archToothLayout(cache, teeth);
  const opts = { cejY: layout.cejY, mmPx: PERIO_MM_PX };

  const buccalSvg = container.querySelector("svg.perio-tooth-arch-buccal");
  if (buccalSvg) {
    const parent = (buccalSvg.querySelector(".perio-tooth-row-buccal") as SVGGElement | null) ?? buccalSvg;
    const input = collectCurveInput(layout, BUCCAL_SITES);
    const curve = perioCurve(input.sites, { ...opts, siteX: (index) => input.xs[index] });
    parent.appendChild(
      buildPerioCurveLayer(curve, {
        width: layout.totalWidth,
        className: "perio-curve perio-curve-buccal",
      }),
    );
    parent.appendChild(
      buildPerioOverlayLayer(perioOverlayMarks("bop", collectBopInput(layout, BUCCAL_SITES), opts), {
        width: layout.totalWidth,
        className: "perio-report-bop-layer",
      }),
    );
  }

  const palatalSvg = container.querySelector("svg.perio-tooth-arch-palatal");
  if (palatalSvg) {
    const parent = (palatalSvg.querySelector(".perio-tooth-row-palatal-inner") as SVGGElement | null) ?? palatalSvg;
    const input = collectCurveInput(layout, LINGUAL_SITES);
    const curve = perioCurve(input.sites, { ...opts, siteX: (index) => input.xs[index] });
    parent.appendChild(
      buildPerioCurveLayer(curve, {
        width: layout.totalWidth,
        className: "perio-curve perio-curve-palatal",
      }),
    );
    parent.appendChild(
      buildPerioOverlayLayer(perioOverlayMarks("bop", collectBopInput(layout, LINGUAL_SITES), opts), {
        width: layout.totalWidth,
        className: "perio-report-bop-layer",
      }),
    );
  }
}

function renderArch(container: HTMLElement, cache: TemplateDocCache, teeth: readonly number[]): void {
  const buccal = container.querySelector<HTMLElement>("[data-perio-report-aspect='buccal']");
  const palatal = container.querySelector<HTMLElement>("[data-perio-report-aspect='palatal']");
  if (!buccal || !palatal) return;

  buccal.innerHTML = "";
  palatal.innerHTML = "";
  buccal.appendChild(styleSvg(buildBuccalArchSvg(cache, teeth, isToothImplant, undefined, getPerioToothKind)));
  palatal.appendChild(styleSvg(buildPalatalArchSvg(cache, teeth, isToothImplant, undefined, getPerioToothKind)));
  drawCurvesAndBop(container, cache, teeth);
}

function ArchDiagram({
  title,
  buccalLabel,
  palatalLabel,
  containerRef,
}: {
  title: string;
  buccalLabel: string;
  palatalLabel: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section
      ref={containerRef}
      className="periodontal-report-diagram-arch"
      aria-label={`${title} periodontal diagram`}
      style={{
        border: "1px solid var(--border, #d8e0ea)",
        borderRadius: 18,
        background: "var(--panel, #fff)",
        padding: 14,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.68, marginBottom: 5 }}>{buccalLabel}</div>
          <div data-perio-report-aspect="buccal" />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.68, marginBottom: 5 }}>{palatalLabel}</div>
          <div data-perio-report-aspect="palatal" />
        </div>
      </div>
    </section>
  );
}

function DiagramLegend() {
  const itemStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  } as const;
  const lineStyle = (color: string) => ({
    display: "inline-block",
    width: 18,
    height: 0,
    borderTop: `2px solid ${color}`,
    borderRadius: 999,
    flex: "0 0 auto",
  }) as const;

  return (
    <div
      aria-label="Periodontal diagram legend"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "8px 16px",
        padding: "2px 2px 0",
        color: "var(--text-muted, #64748b)",
        fontSize: 11,
        lineHeight: 1.4,
      }}
    >
      <span style={itemStyle}>
        <span aria-hidden="true" style={lineStyle("#2563eb")} />
        <span><strong>PD</strong> · Probing depth</span>
      </span>
      <span style={itemStyle}>
        <span aria-hidden="true" style={lineStyle("#e85d8a")} />
        <span><strong>GM</strong> · Gingival margin</span>
      </span>
      <span style={itemStyle}>
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: 999,
            background: "#ef4444",
            flex: "0 0 auto",
          }}
        />
        <span><strong>BOP</strong> · Bleeding on probing</span>
      </span>
    </div>
  );
}

/**
 * Read-only periodontal diagram for reports.
 *
 * Uses the same tooth templates, PD/GM curve renderer, BOP overlay renderer,
 * implant/tooth-kind resolution and live engine state as PerioChart. There are
 * no inputs, controls, setters, or persistence hooks on this surface.
 */
export default function PeriodontalDiagramSurface() {
  const upperRef = useRef<HTMLDivElement>(null);
  const lowerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let cache: TemplateDocCache | null = null;

    const render = () => {
      if (cancelled || !cache) return;
      if (upperRef.current) renderArch(upperRef.current, cache, UPPER_ARCH);
      if (lowerRef.current) renderArch(lowerRef.current, cache, LOWER_ARCH);
    };

    loadTemplateCache()
      .then((loaded) => {
        if (cancelled) return;
        cache = loaded;
        render();
      })
      .catch((error) => {
        console.error("periodontal report diagram: failed to load tooth templates", error);
      });

    const unsubscribe = onStateChange(render);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return (
    <div className="periodontal-report-diagram" style={{ display: "grid", gap: 14 }}>
      <ArchDiagram
        title="Upper arch"
        buccalLabel="Buccal"
        palatalLabel="Palatal"
        containerRef={upperRef}
      />
      <ArchDiagram
        title="Lower arch"
        buccalLabel="Buccal"
        palatalLabel="Lingual"
        containerRef={lowerRef}
      />
      <DiagramLegend />
    </div>
  );
}
