// Part of React Advanced Odontogram - ORALLIX report-only composition.
// Presentation-only: all metrics/classification are read from the native
// periodontal engine. No periodontal calculation or mutation path is duplicated.

import { useEffect, useState } from "react";
import { t } from "../i18n/useI18n";
import {
  formatToothLabel,
  getPerioClassification,
  getPerioIndexNameMode,
  getPerioSummary,
  onStateChange,
} from "../odontogram";
import { indexName } from "../perioIndexNames";

type PerioSummaryData = ReturnType<typeof getPerioSummary>;
type ClassificationData = ReturnType<typeof getPerioClassification>;

const EMPTY_SUMMARY: PerioSummaryData = {
  chartedSites: 0,
  bleedingSites: 0,
  bopPercent: 0,
  worstCal: null,
  worstCalTooth: null,
  maxPd: null,
  avgPd: null,
  avgCal: null,
  maxFurcation: null,
  plaquePercent: 0,
  piScore: null,
  giScore: null,
  kgDeficientTeeth: 0,
  gtDistribution: { thin: 0, medium: 0, thick: 0 },
  millerDistribution: { i: 0, ii: 0, iii: 0, iv: 0 },
  mpiScore: null,
  mbiScore: null,
};

const EMPTY_CLASSIFICATION: ClassificationData = {
  diagnosis: "health",
  stage: "na",
  grade: "indeterminate",
  extent: "na",
  derived: {
    diagnosis: "health",
    stage: "na",
    grade: "indeterminate",
    extent: "na",
    buckets: { smoking: "A", diabetes: "A", direct: null },
  },
  overridden: { diagnosis: false, stage: false, grade: false, extent: false },
};

const FURCATION_ROMAN = ["–", "I", "II", "III", "IV"];

function diagnosisLabel(v: string): string {
  return t(`perio.class.dx.${v}`);
}
function stageLabel(v: string): string {
  if (v === "na") return t("perio.class.stage.na");
  if (v === "indeterminate") return t("perio.class.stage.indeterminate");
  return t(`perio.class.stage.${v}`);
}
function gradeLabel(v: string): string {
  if (v === "indeterminate") return t("perio.class.grade.indeterminate");
  return t(`perio.class.grade.${v}`);
}
function extentLabel(v: string): string {
  if (v === "na") return t("perio.class.extent.na");
  if (v === "molar-incisor") return t("perio.class.extent.molarIncisor");
  return t(`perio.class.extent.${v}`);
}

/**
 * Read-only periodontal report surface.
 *
 * Reuses the exact getPerioSummary()/getPerioClassification() outputs used by
 * PerioSidebar, but intentionally omits the 32-tooth data-entry grid and the
 * editable Patient Data / override controls. It is therefore suitable for a
 * clinical report while preserving one periodontal calculation authority.
 */
export default function PeriodontalReportSurface() {
  const [summary, setSummary] = useState<PerioSummaryData>(EMPTY_SUMMARY);
  const [classification, setClassification] = useState<ClassificationData>(EMPTY_CLASSIFICATION);

  useEffect(() => {
    const sync = () => {
      setSummary(getPerioSummary());
      setClassification(getPerioClassification());
    };
    sync();
    return onStateChange(sync);
  }, []);

  const canonicalNames = getPerioIndexNameMode() === "canonical";
  const avgPdLabel = canonicalNames ? `Avg ${indexName("pd")}` : t("perio.summary.avgPd");
  const avgCalLabel = canonicalNames ? `Avg ${indexName("cal")}` : t("perio.summary.avgCal");
  const bopLabel = canonicalNames ? `${indexName("bop")}%` : t("perio.bopPercent");
  const worstCalLabel = canonicalNames ? `Worst ${indexName("cal")}` : t("perio.summary.worstCal");
  const maxPdLabel = canonicalNames ? `Max ${indexName("pd")}` : t("perio.summary.maxPd");
  const maxFurcationLabel = canonicalNames ? `Max ${indexName("furcation")}` : t("perio.summary.maxFurcation");
  const plaqueLabel = canonicalNames ? `${indexName("plaque")}%` : t("plaque.percent");
  const worstCalText = summary.worstCal === null
    ? "–"
    : `${summary.worstCal}${summary.worstCalTooth !== null ? ` (${formatToothLabel(summary.worstCalTooth)})` : ""}`;

  const summaryItems = [
    [avgPdLabel, summary.avgPd === null ? "–" : String(summary.avgPd)],
    [avgCalLabel, summary.avgCal === null ? "–" : String(summary.avgCal)],
    [bopLabel, `${summary.bopPercent}%`],
    [t("perio.summary.charted"), String(summary.chartedSites)],
    [worstCalLabel, worstCalText],
    [maxPdLabel, summary.maxPd === null ? "–" : String(summary.maxPd)],
    [maxFurcationLabel, summary.maxFurcation === null ? "–" : FURCATION_ROMAN[summary.maxFurcation]],
    [plaqueLabel, `${summary.plaquePercent}%`],
  ] as const;

  const classificationItems = [
    [t("perio.class.diagnosis"), diagnosisLabel(classification.diagnosis)],
    [t("perio.class.stage"), stageLabel(classification.stage)],
    [t("perio.class.grade"), gradeLabel(classification.grade)],
    [t("perio.class.extent"), extentLabel(classification.extent)],
  ] as const;

  return (
    <div className="periodontal-report-surface panel-body">
      <div className="perio-summary-card">
        <div className="perio-summary-card-title">{t("perio.summary.title")}</div>
        <div className="perio-fullgrid-summary" role="status">
          {summaryItems.map(([label, value]) => (
            <span className="perio-fullgrid-summary-item" key={label}>
              <span className="perio-fullgrid-summary-label">{label}</span>
              <span className="perio-fullgrid-summary-value">{value}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="perio-summary-card" aria-label={t("perio.class.title")}>
        <div className="perio-summary-card-title">{t("perio.class.title")}</div>
        <div className="perio-fullgrid-summary">
          {classificationItems.map(([label, value]) => (
            <span className="perio-fullgrid-summary-item" key={label}>
              <span className="perio-fullgrid-summary-label">{label}</span>
              <span className="perio-fullgrid-summary-value">{value}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
