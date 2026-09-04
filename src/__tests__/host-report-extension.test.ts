// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
// ORALLIX host-report extension: verifies that external clinical sections are
// rendered by the existing PDF assembler without entering odontogram state.
import { afterEach, describe, expect, it } from "vitest";
import {
  assemblePdf,
  PDF_PALETTES,
  setPdfHostReportData,
} from "../perioPdf";

function fakeDoc() {
  const calls: string[] = [];
  const doc: any = {
    calls,
    text: (...a: any[]) => { calls.push("text:" + String(a[0]).slice(0, 120)); return doc; },
    addImage: () => { calls.push("addImage"); return doc; },
    addPage: () => { calls.push("addPage"); return doc; },
    setFontSize: () => doc,
    setFont: () => doc,
    setTextColor: () => doc,
    setFillColor: () => doc,
    setDrawColor: () => doc,
    setLineWidth: () => doc,
    rect: () => { calls.push("rect"); return doc; },
    line: () => { calls.push("line"); return doc; },
    save: () => { calls.push("save"); },
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
  };
  return doc;
}

const data = {
  hasPerio: false,
  reportTitle: "Odontogram Report",
  footer: { disclaimer: "", generated: "", repoUrl: "", doi: "" },
  palette: PDF_PALETTES.blue,
  patient: [{ label: "Name", value: "Engine placeholder" }],
  odontogramPng: "",
  odontogramCaption: "",
  odontogramFindings: [] as { label: string; value: string }[],
  individualNotes: [] as { label: string; value: string }[],
  perioPng: "",
  perioMetrics: [] as { label: string; value: string }[],
  abbreviations: [] as { term: string; desc: string }[],
};

const IDENTITY_ONLY = {
  patientData: true,
  odontogramChart: false,
  odontogramDescription: false,
  individualNotes: false,
  perioStatus: false,
  perioDescription: false,
};

afterEach(() => setPdfHostReportData(null));

describe("host clinical report extension", () => {
  it("uses host title/patient rows and renders host sections in the native assembler", () => {
    setPdfHostReportData({
      reportTitle: "ORALLIX Clinical Record Report",
      patient: [
        { label: "Patient name", value: "Dr Test Patient" },
        { label: "Record number", value: "ORX-00042" },
      ],
      sections: [
        {
          title: "Medical & Dental History",
          rows: [
            { label: "Medical history", value: "Hypertension" },
            { label: "Dental history", value: "Not recorded" },
          ],
        },
        {
          title: "Periodontal assessment",
          rows: [
            { label: "Status", value: "Not recorded — no periodontal charting data entered." },
          ],
        },
      ],
    });

    const doc = fakeDoc();
    assemblePdf(IDENTITY_ONLY, data, () => doc);

    expect(doc.calls.some((c: string) => c.includes("ORALLIX Clinical Record Report"))).toBe(true);
    expect(doc.calls.some((c: string) => c.includes("Dr Test Patient"))).toBe(true);
    expect(doc.calls.some((c: string) => c.includes("ORX-00042"))).toBe(true);
    expect(doc.calls.some((c: string) => c.includes("Medical & Dental History"))).toBe(true);
    expect(doc.calls.some((c: string) => c.includes("Hypertension"))).toBe(true);
    expect(doc.calls.some((c: string) => c.includes("Periodontal assessment"))).toBe(true);
    expect(doc.calls.some((c: string) => c.includes("Not recorded"))).toBe(true);
    expect(doc.calls.some((c: string) => c.includes("Engine placeholder"))).toBe(false);
  });

  it("preserves the standalone report when no host data is supplied", () => {
    const doc = fakeDoc();
    assemblePdf(IDENTITY_ONLY, data, () => doc);

    expect(doc.calls.some((c: string) => c.includes("Odontogram Report"))).toBe(true);
    expect(doc.calls.some((c: string) => c.includes("Engine placeholder"))).toBe(true);
    expect(doc.calls.some((c: string) => c.includes("ORALLIX Clinical Record Report"))).toBe(false);
  });
});
