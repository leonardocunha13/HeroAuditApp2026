import { useState, useEffect } from "react";
import { FormElementInstance } from "./FormElements";
import PDFDocument from "./PDFComponent";
import { pdf } from "@react-pdf/renderer";
import { prepareResolvedElements } from "./prepareResolvedElements";

interface Props {
  elements: FormElementInstance[];
  formName: string;
  revision: number | string;
  pageSize?: "A4" | "A3";
  orientation?: "portrait" | "landscape";
  responses: { [key: string]: unknown };
  stamp?: {
    issuedDate: string;
    to: string;
    status: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Generates a preview URL for the first page of a submission PDF.
 */
export default function PreviewFirstPage({
  elements,
  formName,
  revision,
  pageSize = "A4",
  orientation = "portrait",
  responses,
  stamp,
}: Props) {
  const [pdfUrl, setPdfUrl] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const generateFirstPage = async () => {
      if (!elements || elements.length === 0) return;

      // --- group elements into pages like your SubmissionRenderer ---
      const groups: FormElementInstance[][] = [];
      const repeatables: FormElementInstance[] = [];
      let current: FormElementInstance[] = [];
      let firstPage = true;

      elements.forEach((el) => {
        if (el.type === "PageBreakField") {
          if (current.length > 0) {
            groups.push(firstPage ? [...current] : [...repeatables, ...current]);
            current = [];
            firstPage = false;
          }
        } else {
          if (el.extraAttributes?.repeatOnPageBreak && firstPage) repeatables.push(el);
          current.push(el);
        }
      });

      if (current.length > 0) {
        groups.push(firstPage ? [...current] : [...repeatables, ...current]);
      }

      // only the first page
      const firstPageGroup = [groups[0]];

      const resolvedGroups = await prepareResolvedElements(firstPageGroup);

      const blob = await pdf(
        <PDFDocument
          elements={resolvedGroups}
          responses={responses}
          formName={formName}
          revision={revision}
          orientation={orientation}
          pageSize={pageSize}
          stamp={stamp}
        />
      ).toBlob();

      if (!cancelled) {
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      }
    };

    generateFirstPage();

    return () => {
      cancelled = true;
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [elements, formName, revision, pageSize, orientation, responses, stamp]);

  return pdfUrl; // can be used as <iframe src={pdfUrl} /> or <img src={pdfUrl} />
}
