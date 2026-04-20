// components/PDFComponent.tsx
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { FormElementInstance } from "./FormElements";
import { renderHtmlToPDFElements } from "./converthtmlreact";
const STAMP_SRC = "/Stamp.png";

Font.register({
  family: "DejaVuSans",
  src: "/fonts/DejaVuSans.ttf",
});

Font.registerHyphenationCallback((word) => {
  return word.split(/(?=[_-])|(?<=[_-])/g);
});

interface Props {
  elements: FormElementInstance[];
  responses: { [key: string]: unknown };
  formName: string;
  revision: number | string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A3' | 'A4';
  docNumber?: string;
  docNumberRevision?: number | string;
  equipmentName?: string;
  equipmentTag?: string;
  stamp?: {
    x: number;
    width: number;
    height: number;
    y: number;
    issuedDate: string;
    status: string;
    signedDate: string;
    signed: string;
    reviewer: string;
    reviewerRole: string;
  };
}

const styles = StyleSheet.create({
  page: {
    wrap: true,
    paddingTop: 10,
    paddingBottom: 40,
    paddingHorizontal: 30,
    fontSize: 10,
  },
  fieldContainer: {
    marginBottom: 10,
    breakInside: 'avoid',
  },
  fieldTitle: { fontWeight: "bold", marginBottom: 4 },
  image: { width: 200, height: 150, marginTop: 5 },
  table: { borderColor: "#000", width: "100%" },
  tableCell: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 4,
    flexShrink: 0,
  },
  tableRow: {
    flexDirection: "row",
  },
  header: {
    paddingBottom: 10,
  },
  headerImage: {
    width: "100%",
    //maxHeight: 200,
    objectFit: "contain",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 10,
    color: "grey",
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    width: "100%",
    marginTop: 5,
  },
  separatorText: {
    fontSize: 10,
    fontStyle: "italic",
    color: "#666",
  }, footerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  footerLine: {
    height: 1,
    backgroundColor: 'grey',
    marginBottom: 5,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 10,
    color: 'grey',
  },
  headerContainer: {
    position: 'absolute',
    top: 5,
    left: 20,
    right: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    fontSize: 8,
    color: 'grey',
  },


});
const stylesStamp = StyleSheet.create({
  stampWrapper: {
    position: "relative",
    width: 200,
    height: 100,
    marginTop: 20,
    zIndex: 999,
  },
  stampImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  stampText: {
    position: "absolute",
    fontSize: 10,
    fontWeight: "bold",
    color: "#000",
  },
  stampDate: {
    top: 38.8,
    left: 70,
  },
  stampTo: {
    top: 48,
    left: 45,
  },
});


function renderFieldValue(
  element: FormElementInstance,
  value: unknown,
  allValues: Record<string, unknown>,
  pageContext?: {
    pageSize: "A3" | "A4";
    orientation: "portrait" | "landscape";
    isFirstPage?: boolean;
    stampHeight?: number;
    containerWidthPercent?: number;
  }
) {

  switch (element.type) {
    case "ImageField": {
      const imageUrl =
        typeof value === "string" ? value : element.extraAttributes?.imageUrl;

      if (!imageUrl) return <Text>[Invalid image]</Text>;

      const alignment = element.extraAttributes?.position ?? "left";

      let alignStyle = {};
      if (alignment === "center") {
        alignStyle = { alignSelf: "center" };
      } else if (alignment === "right") {
        alignStyle = { alignSelf: "flex-end" };
      } else {
        alignStyle = { alignSelf: "flex-start" };
      }

      const baseWidth = Number(element.extraAttributes?.width ?? 200);
      const baseHeight = Number(
        element.extraAttributes?.height ?? Math.round(baseWidth * 0.6)
      );

      const pageWidth =
        pageContext?.pageSize === "A3"
          ? pageContext?.orientation === "landscape"
            ? 1190.55
            : 841.89
          : pageContext?.orientation === "landscape"
            ? 841.89
            : 595.28;

      // same page padding logic as the rest of your PDF
      const usablePageWidth = pageWidth - 90;

      // element.width is your form field width in %
      const fieldPercent = Number(element.width ?? 100) / 100;
      const availableFieldWidth = usablePageWidth * fieldPercent;

      // page factor
      let pageFactor = 1;

      if (pageContext?.pageSize === "A3") pageFactor += 0.15;
      if (pageContext?.orientation === "landscape") pageFactor += 0.1;

      // start from designer width and scale by page config
      let scaledWidth = baseWidth * pageFactor;
      let scaledHeight = baseHeight * pageFactor;

      // prevent image from overflowing its field
      const maxAllowedWidth = availableFieldWidth - 10;

      if (scaledWidth > maxAllowedWidth) {
        const ratio = maxAllowedWidth / scaledWidth;
        scaledWidth = maxAllowedWidth;
        scaledHeight = scaledHeight * ratio;
      }

      // optional cap so huge single images don't dominate the page
      const absoluteMaxWidth =
        pageContext?.pageSize === "A3"
          ? pageContext?.orientation === "landscape"
            ? 700
            : 520
          : pageContext?.orientation === "landscape"
            ? 500
            : 420;

      if (scaledWidth > absoluteMaxWidth) {
        const ratio = absoluteMaxWidth / scaledWidth;
        scaledWidth = absoluteMaxWidth;
        scaledHeight = scaledHeight * ratio;
      }

      const imageStyle = {
        objectFit: "contain" as const,
        width: scaledWidth,
        height: scaledHeight,
        ...alignStyle,
      };

      return <Image src={imageUrl} style={imageStyle} />;
    }

    case "TableField": {
      const headerRowIndexes: number[] = element.extraAttributes?.headerRowIndexes || [];
      const getCellNumericValuePdf = (raw: unknown): number => {
        if (raw === null || raw === undefined) return 0;
        const s = String(raw).trim();
        if (!s) return 0;

        // If still a formula string, treat as 0 here (we evaluate formulas separately)
        if (s.startsWith("=")) return 0;

        const m = s.match(/\[number:\s*([-+]?\d*\.?\d+)\s*\]/i);
        if (m) {
          const n = Number(m[1]);
          return Number.isFinite(n) ? n : 0;
        }

        // other tags
        if (s.startsWith("[")) return 0;

        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
      };

      const cellRefToIndexesPdf = (ref: string) => {
        const match = ref.match(/^([A-Z]+)(\d+)$/i);
        if (!match) return null;
        const letters = match[1].toUpperCase();
        const row = Number(match[2]) - 1;

        let col = 0;
        for (let i = 0; i < letters.length; i++) col = col * 26 + (letters.charCodeAt(i) - 64);
        col -= 1;

        return { row, col };
      };

      const evalCellPdf = (
        table: string[][],
        row: number,
        col: number,
        allValues: Record<string, unknown>,
        visited: Set<string>
      ): string => {
        const key = `self:${row}:${col}`;
        if (visited.has(key)) return "CIRC";

        const raw = (table[row]?.[col] ?? "").toString().trim();
        if (!raw) return "0";

        // strip merge prefix if present
        const cleaned = raw.replace(/^\[merge:(right|down):\d+\]/, "").trim();

        if (cleaned.startsWith("=")) {
          const next = new Set(visited);
          next.add(key);
          return evaluateTableFormulaPdf(cleaned, table, allValues, next);
        }

        return String(getCellNumericValuePdf(cleaned));
      };

      const evaluateTableFormulaPdf = (
        formula: string,
        currentTable: string[][],
        allValues: Record<string, unknown>,
        visited = new Set<string>()
      ): string => {
        if (!formula.startsWith("=")) return formula;

        // use formula string as part of loop-break (good enough)
        const loopKey = `f:${formula}`;
        if (visited.has(loopKey)) return "CIRC";

        const nextVisited = new Set(visited);
        nextVisited.add(loopKey);

        let expression = formula.slice(1);

        // {fieldId} numeric fields only
        expression = expression.replace(/\{(\w+)\}(?!:)/g, (_, fieldId) => {
          const v = allValues[fieldId];
          const n = Number(String(v));
          return Number.isFinite(n) ? String(n) : "0";
        });

        // {TABLEID:A1}
        expression = expression.replace(/\{(\w+):([A-Z]+\d+)\}/g, (_, fieldId, cellRef) => {
          const tableValue = allValues[String(fieldId)];
          if (!tableValue) return "0";

          let table: string[][];
          try {
            table = typeof tableValue === "string" ? JSON.parse(tableValue) : (tableValue as string[][]);
          } catch {
            return "0";
          }
          if (!Array.isArray(table)) return "0";

          const pos = cellRefToIndexesPdf(cellRef);
          if (!pos) return "0";

          const raw = (table[pos.row]?.[pos.col] ?? "").toString().trim();
          const cleaned = raw.replace(/^\[merge:(right|down):\d+\]/, "").trim();

          if (cleaned.startsWith("=")) {
            return evaluateTableFormulaPdf(cleaned, table, allValues, nextVisited);
          }
          return String(getCellNumericValuePdf(cleaned));
        });

        // Same-table refs A1, B2, etc
        expression = expression.replace(/\b([A-Z]+\d+)\b/g, (_, cellRef) => {
          const pos = cellRefToIndexesPdf(cellRef);
          if (!pos) return "0";
          return evalCellPdf(currentTable, pos.row, pos.col, allValues, nextVisited);
        });

        expression = expression.replace(/\^/g, "**");

        try {
          const ROUND = (value: number, decimals = 0) => {
            const factor = Math.pow(10, decimals);
            return Math.round(value * factor) / factor;
          };
          const DEG = (rad: number) => (rad * 180) / Math.PI;
          const RAD = (deg: number) => (deg * Math.PI) / 180;

          const result = Function("Math", "ROUND", "DEG", "RAD", `"use strict"; return (${expression})`)(
            Math,
            ROUND,
            DEG,
            RAD
          );

          return String(result);
        } catch {
          return "ERR";
        }
      };
      const parseMaybeTable = (v: unknown): string[][] | null => {
        if (!v) return null;
        if (Array.isArray(v)) return v as string[][];
        if (typeof v === "string") {
          try {
            const parsed = JSON.parse(v);
            return Array.isArray(parsed) ? (parsed as string[][]) : null;
          } catch {
            return null;
          }
        }
        return null;
      };

      const tableData =
        parseMaybeTable(value) ??
        parseMaybeTable(element.extraAttributes?.data) ??
        null;

      if (!tableData) return <Text>[Invalid table]</Text>;


      const evaluatedTableData: string[][] = tableData.map((row) =>
        row.map((cell) => {
          const raw = (cell ?? "").toString();
          const trimmed = raw.trim();

          const mergePrefix = trimmed.match(/^\[merge:(right|down):\d+\]/)?.[0] ?? "";
          const cleaned = trimmed.replace(/^\[merge:(right|down):\d+\]/, "").trim();

          if (cleaned.startsWith("=")) {
            const evaluated = evaluateTableFormulaPdf(cleaned, tableData, allValues);
            // preserve merge prefix so your merge/border logic still works
            return mergePrefix ? `${mergePrefix}${evaluated}` : evaluated;
          }

          return raw;
        })
      );
      const rows = tableData.length;
      const columns = Math.max(...tableData.map((row: string[]) => row.length), 0);
      const columnHeaders = element.extraAttributes?.columnHeaders || [];
      const parseCell = (cellValue: string): string => {
        const trimmed = cellValue?.trim() || "";
        const withoutMerge = trimmed
          .replace(/^\[merge:(right|down):\d+\]/, "")
          .trim();

        if (trimmed === "[camera]") return "No picture was taken";
        if (withoutMerge.startsWith("[checkbox")) {
          if (withoutMerge === "[checkbox:true]") return "✔";
          if (withoutMerge === "[checkbox:false]") return "✖";
          return "☐";
        }
        if (trimmed.startsWith("[checkbox")) {
          if (trimmed === "[checkbox:true]") return "✔";
          if (trimmed === "[checkbox:false]") return "✖";
          return "☐";
        }
        if (trimmed === "[PASS]") return "PASS";
        if (trimmed === "[FAIL]") return "FAIL";
        if (trimmed === "[SUMMARY]") return "SUMMARY";

        if (trimmed.startsWith("[select")) {
          const match = trimmed.match(/^\[select:"(.*?)":/);
          return match?.[1] || "";
        }

        if (trimmed.startsWith("[number:")) {
          return trimmed.match(/^\[number:(.*?)\]$/)?.[1] || "";
        }

        if (trimmed.startsWith("[date:")) {
          const isoDate = trimmed.match(/^\[date:(.*?)\]$/)?.[1];
          if (!isoDate) return "";

          const dateObj = new Date(isoDate);
          if (isNaN(dateObj.getTime())) return " ";

          const day = String(dateObj.getDate()).padStart(2, "0");
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const year = dateObj.getFullYear();

          return `${day}.${month}.${year}`;
        }

        return withoutMerge || "";
      };

      const isMergedDown = (value: string) => /^\[merge:down:(\d+)\]/.test(value.trim());
      const getMergeDownSpan = (value: string) => {
        const match = value.trim().match(/^\[merge:down:(\d+)\]/);
        return match ? parseInt(match[1], 10) : 0;
      };
      const isMergedRight = (value: string) => /^\[merge:right:(\d+)\]/.test(value.trim());
      const getMergeRightSpan = (value: string) => {
        const match = value.trim().match(/^\[merge:right:(\d+)\]/);
        return match ? parseInt(match[1], 10) : 0;
      };

      const estimateColumnWidths = (
        tableData: string[][],
        columnCount: number,
        columnHeaders: string[] = [],
        headerFontSize = 9,
        bodyFontSize = 8
      ): number[] => {
        const widths = Array(columnCount).fill(0);
        const isDateColumn = Array(columnCount).fill(false);

        const getVisibleText = (raw: string) => parseCell(raw || "").trim();

        const getLongestWordLength = (text: string) => {
          return Math.max(
            ...text.split(/\s+/).map((w) => w.length),
            0
          );
        };

        const getTextScore = (text: string) => {
          const clean = text.trim();
          if (!clean) return 0;

          const totalLen = clean.length;
          const longestWord = getLongestWordLength(clean);

          // balance between full text size and difficult-to-wrap words
          return totalLen * 0.65 + longestWord * 1.1;
        };

        for (let colIndex = 0; colIndex < columnCount; colIndex++) {
          const headerText = getVisibleText(columnHeaders[colIndex] || "");
          const headerScore = Math.max(getTextScore(headerText), 6);

          // header contributes strongly
          widths[colIndex] = headerScore * (headerFontSize * 0.9) + 16;
        }

        tableData.forEach((row) => {
          row.forEach((cell, colIndex) => {
            const raw = String(cell || "").trim();
            const parsed = getVisibleText(raw);

            if (raw.startsWith("[date:")) {
              isDateColumn[colIndex] = true;
            }

            if (!parsed) return;

            const score = getTextScore(parsed);

            let charFactor = bodyFontSize * 0.72;

            if (raw.startsWith("[date:")) {
              charFactor = bodyFontSize * 0.95;
            } else if (!isNaN(Number(parsed))) {
              charFactor = bodyFontSize * 0.78;
            } else if (parsed.length <= 4) {
              charFactor = bodyFontSize * 0.85;
            }

            const estimated = score * charFactor + 14;
            widths[colIndex] = Math.max(widths[colIndex], estimated);
          });
        });

        const baseMinWidth =
          isA3 && isLandscape ? 55 :
            isA3 ? 48 :
              isLandscape ? 42 : 36;

        const dateMinWidth =
          isA3 && isLandscape ? 72 :
            isA3 ? 64 :
              isLandscape ? 58 : 52;

        const maxWidth =
          isA3 && isLandscape ? 260 :
            isA3 ? 220 :
              isLandscape ? 180 : 150;

        return widths.map((w, colIndex) =>
          Math.min(
            Math.max(w, isDateColumn[colIndex] ? dateMinWidth : baseMinWidth),
            maxWidth
          )
        );
      };


      const isA3 = pageContext?.pageSize === "A3";
      const isLandscape = pageContext?.orientation === "landscape";

      // base sizes by page setup
      let headerFontSize = isA3 ? 10 : 9;
      let bodyFontSize = isA3 ? 9 : 8;
      let cellPadding = isA3 ? 3.5 : 3;
      let minRowHeight = isA3 ? 20 : 18;

      // adjust by orientation
      if (isLandscape) {
        headerFontSize += 1;
        bodyFontSize += 1;
        cellPadding += 0.5;
      }

      const reductionStep =
        isA3 && isLandscape ? 0.6 :
          isA3 ? 0.8 :
            isLandscape ? 1.2 :
              1.4;

      const paddingReduction =
        isA3 && isLandscape ? 0.3 :
          isA3 ? 0.4 :
            isLandscape ? 0.6 :
              0.8;

      const rowReduction =
        isA3 && isLandscape ? 1 :
          isA3 ? 1.5 :
            isLandscape ? 2 :
              2.5;

      if (columns >= 9) {
        headerFontSize -= reductionStep;
        bodyFontSize -= reductionStep;
        cellPadding -= paddingReduction;
      }

      if (columns >= 12) {
        headerFontSize -= reductionStep;
        bodyFontSize -= reductionStep;
        cellPadding -= paddingReduction;
      }

      if (columns >= 15) {
        headerFontSize -= reductionStep;
        bodyFontSize -= reductionStep;
        minRowHeight -= rowReduction;
      }

      if (columns >= 18) {
        headerFontSize -= reductionStep;
        bodyFontSize -= reductionStep;
        minRowHeight -= rowReduction;
      }

      // safe minimums / safe maximums
      headerFontSize = Math.min(Math.max(headerFontSize, 5), 11);
      bodyFontSize = Math.min(Math.max(bodyFontSize, 4.5), 10);
      cellPadding = Math.min(Math.max(cellPadding, 1), 4);
      minRowHeight = Math.max(minRowHeight, 10);

      const { usableWidth: pageUsableWidth, usableHeight } = getUsablePageArea(
        pageContext?.pageSize || "A4",
        pageContext?.orientation || "portrait",
        !!element.extraAttributes?.label
      );

      const containerWidthPercent = (pageContext?.containerWidthPercent ?? element.width ?? 100) / 100;

      // match the same gutter/padding you use in the row item
      const horizontalGutter = 6;

      const usableWidth = Math.max(
        40,
        pageUsableWidth * containerWidthPercent - horizontalGutter
      );

      // first pass estimate
      const firstEstimatedWidths = estimateColumnWidths(
        evaluatedTableData,
        columns,
        columnHeaders,
        headerFontSize,
        bodyFontSize
      );

      const firstEstimatedTableWidth = firstEstimatedWidths.reduce((sum, w) => sum + w, 0);
      const widthScale =
        firstEstimatedTableWidth > usableWidth
          ? usableWidth / firstEstimatedTableWidth
          : 1;

      // scale typography first
      const scaledHeaderFontSize = Math.max(6.5, Math.min(12, headerFontSize * widthScale));
      const scaledBodyFontSize = Math.max(6, Math.min(11, bodyFontSize * widthScale));
      const scaledCellPadding = Math.max(1, Math.min(4, cellPadding * widthScale));
      const scaledMinRowHeight = Math.max(10, minRowHeight * widthScale);

      // second pass estimate using final font sizes
      const estimatedWidths = estimateColumnWidths(
        evaluatedTableData,
        columns,
        columnHeaders,
        scaledHeaderFontSize,
        scaledBodyFontSize
      );

      const totalEstimatedWidth = estimatedWidths.reduce((sum, w) => sum + w, 0);

      const finalColumnWidths =
        totalEstimatedWidth <= usableWidth
          ? estimatedWidths.map((w) => (w / totalEstimatedWidth) * usableWidth)
          : estimatedWidths.map((w) => w * (usableWidth / totalEstimatedWidth));

      const estimatedHeaderHeight =
        scaledHeaderFontSize * 1.6 + scaledCellPadding * 2 + 6;

      const firstPageExtraHeight =
        (pageContext?.isFirstPage ? 24 : 0) +
        (pageContext?.isFirstPage ? (pageContext?.stampHeight ?? 0) + 10 : 0);

      const estimateTextLines = (
        text: string,
        cellWidth: number,
        fontSize: number
      ) => {
        const clean = (text || "").trim();
        if (!clean) return 1;

        // rough average character width
        const avgCharWidth = fontSize * 0.55;
        const usableTextWidth = Math.max(10, cellWidth - scaledCellPadding * 2 - 4);

        // split by existing line breaks first
        const paragraphs = clean.split("\n");
        let totalLines = 0;

        for (const paragraph of paragraphs) {
          const words = paragraph.split(/\s+/).filter(Boolean);
          if (!words.length) {
            totalLines += 1;
            continue;
          }

          let currentLineWidth = 0;
          let lineCount = 1;

          for (const word of words) {
            const wordWidth = Math.max(word.length * avgCharWidth, avgCharWidth);
            const spaceWidth = avgCharWidth;

            if (currentLineWidth === 0) {
              currentLineWidth = wordWidth;
            } else if (currentLineWidth + spaceWidth + wordWidth <= usableTextWidth) {
              currentLineWidth += spaceWidth + wordWidth;
            } else {
              lineCount += 1;
              currentLineWidth = wordWidth;
            }

            // very long tokens like Waitsia_AI_MB or PV_WH_Lim
            if (wordWidth > usableTextWidth) {
              lineCount += Math.ceil(wordWidth / usableTextWidth) - 1;
              currentLineWidth = wordWidth % usableTextWidth;
            }
          }

          totalLines += lineCount;
        }

        return Math.max(1, totalLines);
      };

      const estimateRowHeight = (rowIndex: number, visibleColumns?: number[]) => {
        let maxHeight = scaledMinRowHeight;
        const colsToUse = visibleColumns ?? Array.from({ length: columns }, (_, i) => i);

        for (const colIndex of colsToUse) {
          const rawCellValueOriginal = tableData[rowIndex]?.[colIndex] || "";
          const rawTrimmed = rawCellValueOriginal.trim();

          let skipRendering = false;
          for (let startRow = 0; startRow < rowIndex; startRow++) {
            const cellAbove = tableData[startRow]?.[colIndex]?.trim() || "";
            if (isMergedDown(cellAbove)) {
              const spanDown = getMergeDownSpan(cellAbove);
              const endRow = startRow + spanDown - 1;
              if (rowIndex <= endRow) {
                skipRendering = true;
                break;
              }
            }
          }
          if (skipRendering) continue;

          let isMergedRightFromLeft = false;
          for (let j = 0; j < colIndex; j++) {
            const leftValue = tableData[rowIndex]?.[j]?.trim() || "";
            if (isMergedRight(leftValue)) {
              const leftSpan = getMergeRightSpan(leftValue);
              if (j + leftSpan > colIndex) {
                isMergedRightFromLeft = true;
                break;
              }
            }
          }
          if (isMergedRightFromLeft) continue;

          const span = isMergedRight(rawTrimmed) ? getMergeRightSpan(rawTrimmed) : 1;

          const cellWidth = finalColumnWidths
            .slice(colIndex, colIndex + span)
            .reduce((sum, w) => sum + w, 0);

          const breakLongToken = (word: string, chunkSize = 18) => {
            if (word.length <= chunkSize) return word;
            const parts: string[] = [];
            for (let i = 0; i < word.length; i += chunkSize) {
              parts.push(word.slice(i, i + chunkSize));
            }
            return parts.join("\n");
          };

          const isTechnicalToken = (word: string) => {
            return (
              word.length > 18 &&
              (
                word.includes("_") ||
                word.includes("-") ||
                word.includes("/") ||
                word.includes("\\") ||
                /[A-Z0-9]{6,}/.test(word)
              )
            );
          };

          const formatCellTextForPdf = (text: string) => {
            if (!text) return "";
            return text
              .split("\n")
              .map((line) =>
                line
                  .split(/\s+/)
                  .map((word) => (isTechnicalToken(word) ? breakLongToken(word, 18) : word))
                  .join(" ")
              )
              .join("\n");
          };

          const cellText = formatCellTextForPdf(
            parseCell(evaluatedTableData[rowIndex]?.[colIndex] || "")
          );

          const rawCellForImage = String(evaluatedTableData[rowIndex]?.[colIndex] || "");
          const isImage =
            rawCellForImage.startsWith("[image:") ||
            rawCellForImage.startsWith("[signature:");
          const cellHeight = isImage
            ? 64
            : estimateTextLines(cellText, cellWidth, scaledBodyFontSize) *
            scaledBodyFontSize *
            (pageContext?.pageSize === "A4" ? 1.05 : 1.15) +
            scaledCellPadding * 2 + 4;

          maxHeight = Math.max(maxHeight, cellHeight);
        }

        return Math.max(scaledMinRowHeight, maxHeight);
      };

      const rowIndexes = Array.from({ length: rows }, (_, i) => i);
      const rowChunks: number[][] = [];

      let currentChunk: number[] = [];
      let currentHeight = 0;

      rowIndexes.forEach((rowIndex) => {
        const rowHeight = estimateRowHeight(rowIndex);

        const availableHeight =
          rowChunks.length === 0
            ? usableHeight - firstPageExtraHeight - estimatedHeaderHeight
            : usableHeight - estimatedHeaderHeight;

        if (rowHeight >= availableHeight * 0.75) {
          if (currentChunk.length > 0) {
            rowChunks.push(currentChunk);
            currentChunk = [];
            currentHeight = 0;
          }

          rowChunks.push([rowIndex]);
          return;
        }

        if (
          currentChunk.length > 0 &&
          currentHeight + rowHeight > availableHeight
        ) {
          rowChunks.push(currentChunk);
          currentChunk = [rowIndex];
          currentHeight = rowHeight;
        } else {
          currentChunk.push(rowIndex);
          currentHeight += rowHeight;
        }
      });

      if (currentChunk.length > 0) {
        rowChunks.push(currentChunk);
      }

      const renderTableHeader = () => {
        const headerCells: React.ReactNode[] = [];
        let colIndex = 0;

        while (colIndex < columns) {
          const raw = columnHeaders[colIndex] || "";
          const trimmed = raw.trim();

          const match = trimmed.match(/^\[merge:right:(\d+)\](.*)$/);
          const span = match ? parseInt(match[1], 10) : 1;
          const text = match ? match[2].trim() : parseCell(raw);

          const mergedWidth = finalColumnWidths
            .slice(colIndex, colIndex + span)
            .reduce((sum, w) => sum + w, 0);

          headerCells.push(
            <View
              key={`header-${colIndex}`}
              style={{
                backgroundColor: "#eee",
                width: mergedWidth,
                minHeight: 28,
                alignItems: "center",
                borderTop: "1pt solid black",
                borderBottom: "1pt solid black",
                borderLeft: "1pt solid black",
                borderRight: "1pt solid black",
                padding: scaledCellPadding,
                justifyContent: "center",
                flexShrink: 0,
              }}
              wrap={false}
            >
              <Text
                style={{
                  fontSize: scaledHeaderFontSize,
                  textAlign: "center",
                  fontWeight: 600,
                  fontFamily: "DejaVuSans",
                  lineHeight: 1.1,
                }}
              >
                {text}
              </Text>
            </View>
          );

          colIndex += span;
        }

        return (
          <View style={styles.tableRow} wrap={false}>
            {headerCells}
          </View>
        );
      };

      return (
        <>
          {rowChunks.map((chunk, chunkIndex) => (
            <View
              key={`table-chunk-${chunkIndex}`}
              style={styles.table}
              break={chunkIndex > 0}
            >
              {renderTableHeader()}

              {chunk.map((rowIndex) => {
                const isHeaderRow = headerRowIndexes.includes(rowIndex);
                const rowHeight = estimateRowHeight(rowIndex);

                return (
                  <View
                    key={`row-${chunkIndex}-${rowIndex}`}
                    style={[
                      styles.tableRow,
                      {
                        minHeight: rowHeight,
                        alignItems: "stretch",
                      },
                      isHeaderRow ? { backgroundColor: "#eee" } : {},
                    ]}
                  >
                    {(() => {
                      const cells: React.ReactNode[] = [];
                      let colIndex = 0;

                      const breakLongToken = (word: string, chunkSize = 16) => {
                        if (word.length <= chunkSize) return word;
                        const parts: string[] = [];
                        for (let i = 0; i < word.length; i += chunkSize) {
                          parts.push(word.slice(i, i + chunkSize));
                        }
                        return parts.join("\n");
                      };

                      const isTechnicalToken = (word: string) => {
                        return (
                          word.length > 16 &&
                          (
                            word.includes("_") ||
                            word.includes("-") ||
                            word.includes("/") ||
                            word.includes("\\") ||
                            /[A-Z0-9]{6,}/.test(word)
                          )
                        );
                      };

                      const formatCellTextForPdf = (text: string) => {
                        if (!text) return "";
                        return text
                          .split("\n")
                          .map((line) =>
                            line
                              .split(/\s+/)
                              .map((word) => (isTechnicalToken(word) ? breakLongToken(word, 16) : word))
                              .join(" ")
                          )
                          .join("\n");
                      };

                      while (colIndex < columns) {
                        const rawCellValueOriginal = tableData[rowIndex]?.[colIndex] || "";
                        const rawCellValueDisplay = evaluatedTableData[rowIndex]?.[colIndex] || "";
                        const rawTrimmed = rawCellValueOriginal.trim();

                        let coveredByMergeRight = false;
                        for (let j = 0; j < colIndex; j++) {
                          const leftValue = tableData[rowIndex]?.[j]?.trim() || "";
                          if (isMergedRight(leftValue)) {
                            const leftSpan = getMergeRightSpan(leftValue);
                            const endCol = j + leftSpan - 1;
                            if (colIndex <= endCol) {
                              coveredByMergeRight = true;
                              break;
                            }
                          }
                        }

                        let coveredByMergeDown = false;
                        let showBottomBorder = false;

                        for (let startRow = 0; startRow < rowIndex; startRow++) {
                          const cellAbove = tableData[startRow]?.[colIndex]?.trim() || "";
                          if (isMergedDown(cellAbove)) {
                            const spanDown = getMergeDownSpan(cellAbove);
                            const endRow = startRow + spanDown - 1;
                            if (rowIndex <= endRow) {
                              coveredByMergeDown = true;
                              showBottomBorder = rowIndex === endRow;
                              break;
                            }
                          }
                        }

                        if (coveredByMergeRight || coveredByMergeDown) {
                          const width = finalColumnWidths[colIndex];

                          cells.push(
                            <View
                              key={`placeholder-${chunkIndex}-${rowIndex}-${colIndex}`}
                              style={{
                                width,
                                minHeight: rowHeight,
                                borderLeft: coveredByMergeRight ? "none" : "1pt solid black",
                                borderRight: "1pt solid black",
                                borderTop: coveredByMergeDown ? "none" : "1pt solid black",
                                borderBottom: showBottomBorder ? "1pt solid black" : "none",
                              }}
                              wrap={false}
                            />
                          );

                          colIndex++;
                          continue;
                        }

                        const span = isMergedRight(rawTrimmed) ? getMergeRightSpan(rawTrimmed) : 1;

                        const width = finalColumnWidths
                          .slice(colIndex, colIndex + span)
                          .reduce((sum, w) => sum + w, 0);

                        const displayTrimmed = rawCellValueDisplay.trim();
                        const displayMergeMatch = displayTrimmed.match(/^\[merge:(right|down):\d+\](.*)/);
                        const cleanedValueDisplay = displayMergeMatch ? displayMergeMatch[2]?.trim() : displayTrimmed;

                        const cellText = formatCellTextForPdf(parseCell(rawCellValueDisplay));

                        const isShortText =
                          cleanedValueDisplay.length > 0 &&
                          cleanedValueDisplay.length <= 3 &&
                          isNaN(Number(cleanedValueDisplay));

                        const isEuropeanNumber =
                          /^[0-9]{1,3}(\.[0-9]{3})*,[0-9]+$/.test(cleanedValueDisplay) ||
                          /^[0-9]+,[0-9]+$/.test(cleanedValueDisplay) ||
                          /^[0-9]+,[0-9]{3}$/.test(cleanedValueDisplay) ||
                          /^-?\d+(?:\.\d{3})*,\d+$/.test(cleanedValueDisplay);

                        const isImage =
                          cleanedValueDisplay.startsWith("[image:") ||
                          cleanedValueDisplay.startsWith("[signature:");

                        const imageSrc =
                          cleanedValueDisplay.match(/^\[image:(.*?)\]$/)?.[1] ||
                          cleanedValueDisplay.match(/^\[signature:(.*?)\]$/)?.[1];

                        const isCenteredCell =
                          ["[checkbox:true]", "[checkbox:false]", "[checkbox]"].includes(cleanedValueDisplay) ||
                          cleanedValueDisplay.startsWith("[select") ||
                          cleanedValueDisplay.startsWith("[number:") ||
                          cleanedValueDisplay.startsWith("[date:") ||
                          !isNaN(Number(cleanedValueDisplay)) ||
                          isEuropeanNumber ||
                          isShortText;

                        const bottomBorder = isMergedDown(rawTrimmed) ? "none" : "1pt solid black";

                        cells.push(
                          <View
                            key={`cell-${chunkIndex}-${rowIndex}-${colIndex}`}
                            style={[
                              styles.tableCell,
                              {
                                padding: scaledCellPadding,
                                width,
                                minHeight: rowHeight,
                                borderLeft: "1pt solid black",
                                borderRight: "1pt solid black",
                                borderTop: "1pt solid black",
                                borderBottom: bottomBorder,
                                justifyContent: "center",
                              },
                            ]}
                            wrap={false}
                          >
                            {isImage && imageSrc ? (
                              <Image
                                src={imageSrc}
                                style={{
                                  height: 60,
                                  objectFit: "contain",
                                  marginVertical: 2,
                                }}
                              />
                            ) : (
                              <Text
                                style={{
                                  fontFamily: "DejaVuSans",
                                  fontSize: scaledBodyFontSize,
                                  textAlign: isCenteredCell || isHeaderRow ? "center" : "left",
                                  fontWeight: isHeaderRow ? 600 : undefined,
                                  color:
                                    cellText === "PASS"
                                      ? "green"
                                      : cellText === "FAIL"
                                        ? "red"
                                        : "#000",
                                  lineHeight: 1.25,
                                }}
                              >
                                {cellText === "SUMMARY" ? "-" : cellText}
                              </Text>
                            )}
                          </View>
                        );

                        colIndex += span;
                      }

                      return cells;
                    })()}
                  </View>
                );
              })}
            </View>
          ))}
        </>
      );
    }
    case "SeparatorField":
      return (
        <View style={styles.separator}>
          <Text style={styles.separatorText}>

          </Text>
        </View>
      );
    case "NumberField": {
      const { required } = element.extraAttributes ?? {};
      return (
        <View style={{ padding: 2, borderWidth: 1, borderRadius: 4 }} wrap={false}>
          <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4 }}>
            {required ? "*" : ""}
          </Text>
          <Text style={{ fontSize: 10, minHeight: 20 }}>
            {value !== undefined && value !== null && value !== "" ? String(value) : "-"}
          </Text>
        </View>
      );
    }
    case "CheckboxField": {
      const checked = Boolean(value);
      const label = element.extraAttributes?.label ?? "";
      const helperText = element.extraAttributes?.helperText ?? "";

      return (
        <View
          style={{
            padding: 2,
            borderWidth: 1,
            borderRadius: 4,
            flexDirection: "row",
            alignItems: "flex-start",
          }}
          wrap={false}
        >
          <Text style={{ fontSize: 10, marginRight: 8, fontFamily: 'DejaVuSans' }}>
            {checked ? "☑" : "☐"}
          </Text>

          <View style={{ flexDirection: "column", flexShrink: 1 }}>
            <Text style={{ fontSize: 10, fontFamily: 'DejaVuSans' }}>
              {label}
            </Text>
            {helperText ? (
              <Text
                style={{
                  fontSize: 8,
                  fontFamily: 'DejaVuSans',
                  color: "#666",
                  marginTop: 2,
                }}
              >
                {helperText}
              </Text>
            ) : null}
          </View>
        </View>
      );
    }
    case "TitleField": {
      const {
        title,
        backgroundColor = "#ffffff",
        textColor = "#000000",
        textAlign = "left",
        fontSize = 14,
      } = element.extraAttributes ?? {};

      const isTransparent = backgroundColor === "transparent";

      return (
        <View
          style={{
            padding: 2,
            backgroundColor: isTransparent ? undefined : backgroundColor,
            borderRadius: 4,
          }}
          wrap={false}
        >
          <Text
            style={{
              fontSize,
              textAlign: textAlign as "left" | "center" | "right",
              color: textColor,
            }}
          >
            {title || "-"}
          </Text>
        </View>

      );
    }

    case "ParagraphField": {
      const { text } = element.extraAttributes ?? {};
      const html = typeof text === "string" ? text.trim() : "";
      let textAlign: "justify" | "left" | "center" | "right" = "left";
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const p = doc.querySelector("p");
      if (p?.style.textAlign) {
        const align = p.style.textAlign;
        if (align === "center") textAlign = "center";
        else if (align === "right") textAlign = "right";
        else if (align === "justify") textAlign = "justify";
      }
      return (
        <View >
          <Text
            style={{
              fontSize: 10,
              lineHeight: 1.5,
              flexWrap: "wrap",
              textAlign,
            }}
            wrap={false}
          >
            {renderHtmlToPDFElements(html)}
          </Text>

        </View>
      );
    }

    case "DateField": {
      let dateOnly = "";
      if (
        value &&
        (typeof value === "string" ||
          typeof value === "number" ||
          value instanceof Date)
      ) {
        const dateObj = new Date(value);
        if (!isNaN(dateObj.getTime())) {
          dateOnly = dateObj.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        }
      }

      return (
        <View style={{ padding: 2, borderWidth: 1, borderRadius: 4 }} wrap={false}>
          <Text>{dateOnly}</Text>
        </View>
      );
    }
    case "TextAreaField": {
      const cleanText =
        typeof value === "string" ? value.trim() : "";

      return (
        <View style={{ padding: 2, borderWidth: 1, borderRadius: 4 }} wrap={false}>
          <Text style={{ fontSize: 10 }}>
            {cleanText || "-"}
          </Text>
        </View>
      );
    }
    case "CalculationField": {
      const displayValue =
        value !== undefined && value !== null && value !== ""
          ? String(value)
          : "-";

      return (
        <View style={{ padding: 2, borderWidth: 1, borderRadius: 4 }} wrap={false}>
          <Text style={{ fontSize: 10, fontWeight: "bold" }}>
            {displayValue}
          </Text>
        </View>
      );
    }

    case "CameraField": {
      const imageUrl = typeof value === "string" ? value : element.extraAttributes?.content;
      if (!imageUrl) return <Text>[No image]</Text>;

      return (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ marginBottom: 4 }}>{element.extraAttributes?.label}</Text>
          <Image
            src={imageUrl}
            style={{ width: 500, height: "auto", objectFit: "cover", alignSelf: "center" }}
          />
        </View>
      );
    }
    case "SpacerField": {
      const height = element.extraAttributes?.height || 10;
      return <View style={{ height, width: "100%" }} />;
    }

    default:
      return (
        <View style={{ padding: 2, borderWidth: 1, borderRadius: 4 }}>
          <Text>{String(value)}</Text>
        </View>
      );
  }
}
type PDFOrientation = "portrait" | "landscape";
type PDFPageSize = "A3" | "A4";

type PDFSection = {
  elements: FormElementInstance[];
  orientation: PDFOrientation;
  pageSize: PDFPageSize;
};

function getPageDimensions(
  pageSize: "A3" | "A4",
  orientation: PDFOrientation
): [number, number] {
  const sizes = {
    A4: { width: 595.28, height: 841.89 },
    A3: { width: 841.89, height: 1190.55 },
  };

  const base = sizes[pageSize];

  return orientation === "landscape"
    ? [base.height, base.width]
    : [base.width, base.height];
}

function splitElementsByPageBreak(
  elements: FormElementInstance[],
  defaultOrientation: PDFOrientation,
  defaultPageSize: PDFPageSize
): PDFSection[] {
  const sections: PDFSection[] = [];

  let currentOrientation: PDFOrientation = defaultOrientation;
  let currentPageSize: PDFPageSize = defaultPageSize;
  let currentElements: FormElementInstance[] = [];

  for (const el of elements) {
    if (el.type === "PageBreakField") {
      if (currentElements.length > 0) {
        sections.push({
          elements: currentElements,
          orientation: currentOrientation,
          pageSize: currentPageSize,
        });
      }

      const nextOrientation =
        el.extraAttributes?.nextPageOrientation &&
          el.extraAttributes.nextPageOrientation !== "default"
          ? (el.extraAttributes.nextPageOrientation as PDFOrientation)
          : defaultOrientation;

      const nextPageSize =
        el.extraAttributes?.nextPageSize &&
          el.extraAttributes.nextPageSize !== "default"
          ? (el.extraAttributes.nextPageSize as PDFPageSize)
          : defaultPageSize;

      currentOrientation = nextOrientation;
      currentPageSize = nextPageSize;
      currentElements = [];
      continue;
    }

    currentElements.push(el);
  }

  if (currentElements.length > 0) {
    sections.push({
      elements: currentElements,
      orientation: currentOrientation,
      pageSize: currentPageSize,
    });
  }

  return sections;
}

function getUsablePageArea(
  pageSize: "A3" | "A4",
  orientation: "portrait" | "landscape",
  hasFieldTitle = true
) {
  const [pageWidth, pageHeight] = getPageDimensions(pageSize, orientation);

  const pagePaddingHorizontal = 60; // 30 left + 30 right
  const pagePaddingTop = 10;
  const pagePaddingBottom = 40;

  const fixedHeaderHeight = 70; // adjust to your real repeated header block
  const fixedFooterHeight = 30;
  const fieldTitleHeight = hasFieldTitle ? 18 : 0;

  return {
    usableWidth: pageWidth - pagePaddingHorizontal,
    usableHeight:
      pageHeight -
      pagePaddingTop -
      pagePaddingBottom -
      fixedHeaderHeight -
      fixedFooterHeight -
      fieldTitleHeight,
  };
}

export default function PDFDocument({ elements, responses, formName, revision, orientation, pageSize, docNumber, docNumberRevision, equipmentName, equipmentTag, stamp }: Props) {
  const repeatablesInOrder = elements.filter(
    (el) => el.extraAttributes?.repeatOnPageBreak
  );
  const repeatHeaderImage = repeatablesInOrder.find(el => el.type === "ImageField");
  const headerImagePosition = repeatHeaderImage?.extraAttributes?.position ?? "left";
  const preserveOriginalSize = repeatHeaderImage?.extraAttributes?.preserveOriginalSize;
  const height = repeatHeaderImage?.extraAttributes?.height ?? 80;
  const width = repeatHeaderImage?.extraAttributes?.width;

  let alignStyle = {};
  if (headerImagePosition === "center") {
    alignStyle = { alignSelf: "center" };
  } else if (headerImagePosition === "right") {
    alignStyle = { alignSelf: "flex-end" };
  } else {
    alignStyle = { alignSelf: "flex-start" };
  }

  const imageStyle = preserveOriginalSize
    ? { width, height: "auto", objectFit: "contain", ...alignStyle }
    : { width, height, objectFit: "contain", ...alignStyle };

  function renderContentInOrder(
    elements: FormElementInstance[],
    section: PDFSection,
    pageIndex: number
  ) {
    const blocks: React.ReactNode[] = [];
    let currentRow: FormElementInstance[] = [];
    let currentWidth = 0;

    const flushRow = () => {
      if (!currentRow.length) return;

      const rowToRender = currentRow;
      currentRow = [];
      currentWidth = 0;

      blocks.push(
        <View
          key={`row-${blocks.length}`}
          style={{ flexDirection: "row", width: "100%" }}
        >
          {rowToRender.map((element) => {
            const value = responses[element.id];
            const width = element.width || 100;

            return (
              <View
                key={element.id}
                style={{
                  width: `${width}%`,
                  paddingRight: 6,
                  marginBottom: 6,
                  flexShrink: 0,
                }}
                wrap={false}
              >
                {element.type !== "SeparatorField" &&
                  element.type !== "CheckboxField" && (
                    <Text style={styles.fieldTitle}>
                      {element.extraAttributes?.label}
                    </Text>
                  )}

                {renderFieldValue(element, value, responses, {
                  pageSize: section.pageSize,
                  orientation: section.orientation,
                  isFirstPage: pageIndex === 0,
                  stampHeight: stamp?.height ?? 0,
                  containerWidthPercent: width,
                })}
              </View>
            );
          })}
        </View>
      );
    };

    elements.forEach((element) => {
      const width = element.width || 100;

      // IMPORTANT: tables must not live inside a wrap={false} row wrapper
      if (element.type === "TableField") {
        const width = element.width || 100;
        const value = responses[element.id];

        const parsedTable =
          typeof value === "string"
            ? (() => {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            })()
            : Array.isArray(value)
              ? value
              : Array.isArray(element.extraAttributes?.data)
                ? element.extraAttributes?.data
                : null;

        const tableRows = Array.isArray(parsedTable) ? parsedTable.length : 0;
        const tableCols = Array.isArray(parsedTable)
          ? Math.max(...parsedTable.map((r: string[]) => r.length), 0)
          : 0;

        // force full width only for large tables
        const shouldRenderFullWidth =
          width >= 100 || tableCols > 6 || tableRows > 8;

        if (shouldRenderFullWidth) {
          flushRow();

          blocks.push(
            <View
              key={element.id}
              style={{
                width: "100%",
                marginBottom: 6,
              }}
            >
              {element.extraAttributes?.label && (
                <Text style={styles.fieldTitle}>
                  {element.extraAttributes.label}
                </Text>
              )}

              {renderFieldValue(element, value, responses, {
                pageSize: section.pageSize,
                orientation: section.orientation,
                isFirstPage: pageIndex === 0,
                stampHeight: stamp?.height ?? 0,
                containerWidthPercent: 100,
              })}
            </View>
          );

          return;
        }
      }

      if (currentWidth + width > 100) {
        flushRow();
      }

      currentRow.push(element);
      currentWidth += width;
    });

    flushRow();

    return blocks;
  }

  function buildRows(elements: FormElementInstance[]) {
    const rows: FormElementInstance[][] = [];
    let currentRow: FormElementInstance[] = [];
    let currentWidth = 0;

    elements.forEach(el => {
      const width = el.width || 100;

      if (currentWidth + width > 100) {
        rows.push(currentRow);
        currentRow = [];
        currentWidth = 0;
      }

      currentRow.push(el);
      currentWidth += width;
    });

    if (currentRow.length) rows.push(currentRow);

    return rows;
  }

  const defaultOrientation: PDFOrientation =
    orientation === "landscape" ? "landscape" : "portrait";

  const fixedPageSize: PDFPageSize = pageSize || "A3";

  const pdfSections = splitElementsByPageBreak(
    elements,
    defaultOrientation,
    fixedPageSize
  );

  console.log("RAW ELEMENT TYPES", elements.map((e) => e.type));
  console.log(
    "PDF sections:",
    pdfSections.map((s, i) => ({
      index: i,
      orientation: s.orientation,
      elementTypes: s.elements.map((e) => e.type),
    }))
  );

  return (
    <Document>
      {pdfSections.map((section, pageIndex) => {
        const contentElements = section.elements.filter(
          (el) =>
            !repeatablesInOrder.some((r) => r.id === el.id) &&
            el.type !== "PageBreakField"
        );
        const pageDimensions = getPageDimensions(
          section.pageSize,
          section.orientation
        );

        return (
          <Page
            key={pageIndex}
            style={styles.page}
            wrap
            size={pageDimensions}
          >
            {/* Header */}
            <View fixed style={styles.header}>
              {buildRows(repeatablesInOrder).map((row, rowIndex) => (
                <View key={rowIndex} style={{ flexDirection: "row", width: "100%" }}>
                  {row.map((el) => {
                    const width = el.width || 100;
                    const value = responses[el.id];

                    return (
                      <View
                        key={el.id}
                        style={{
                          width: `${width}%`,
                          paddingRight: 6,
                        }}
                      >
                        {el.type === "ImageField" ? (
                          <Image src={el.extraAttributes?.imageUrl} style={imageStyle} />
                        ) : (
                          renderFieldValue(el, value, responses, {
                            pageSize: section.pageSize,
                            orientation: section.orientation,
                            isFirstPage: pageIndex === 0,
                            stampHeight: stamp?.height ?? 0,
                          })
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
            {renderContentInOrder(contentElements, section, pageIndex)}
            <View fixed style={styles.headerContainer}>
              <View style={styles.headerContent}>
                <Text>{equipmentName} | {equipmentTag}</Text>
              </View>
            </View>

            {/* Footer */}
            <View fixed style={styles.footerContainer}>
              <View style={styles.footerLine} />
              <View style={styles.footerContent}>
                <Text>
                  {formName} REV. {revision} | {docNumber} REV. {docNumberRevision}
                </Text>
                <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
              </View>
            </View>

            {/* Stamp overlay */}
            {pageIndex === 0 && stamp && (
              <View
                style={{
                  position: "absolute",
                  top: stamp.y,
                  left: stamp.x,
                  width: stamp.width,
                  height: stamp.height,
                }}
                fixed
              >
                <Image
                  src={STAMP_SRC}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
                <Text style={[stylesStamp.stampText, { fontSize: 6, top: 29.5, left: 83 }]}>
                  {stamp.issuedDate}
                </Text>
                <Text style={[stylesStamp.stampText, { fontSize: 6, top: 35, left: 83 }]}>
                  {stamp.reviewer}
                </Text>
                <Text style={[stylesStamp.stampText, { fontSize: 6, top: 41, left: 83 }]}>
                  {stamp.reviewerRole}
                </Text>
                {stamp.signed && (
                  <Image
                    src={stamp.signed}
                    style={{
                      position: "absolute",
                      top: 45,
                      left: 40,
                      width: 110,
                      height: 13,
                      objectFit: "contain",
                    }}
                  />
                )}
              </View>
            )}
          </Page>
        );
      })}
    </Document>
  );
}


