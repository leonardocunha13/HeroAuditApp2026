// components/PDFComponent.tsx
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { FormElementInstance } from "./FormElements";
import { renderHtmlToPDFElements } from "./converthtmlreact";
const STAMP_SRC = "/Stamp.png";

Font.register({
  family: "DejaVuSans",
  src: "/fonts/DejaVuSans.ttf",
});

Font.registerHyphenationCallback((word) => [word]);

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

      const pageWidth =
        pageContext?.pageSize === "A3"
          ? pageContext?.orientation === "landscape"
            ? 1190.55
            : 841.89
          : pageContext?.orientation === "landscape"
            ? 841.89
            : 595.28;

      const usablePageWidth = pageWidth - 90;

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

        const getHeaderWeight = (text: string) => {
          // technical headers with underscores usually need more room
          if (text.includes("_")) return 1.22;
          if (text.includes("-")) return 1.22;
          if (text.length <= 4) return 1.05;
          return 1.1;
        };

        for (let colIndex = 0; colIndex < columnCount; colIndex++) {
          const rawHeader = columnHeaders[colIndex] || "";
          const headerText = parseCell(rawHeader).trim();

          const cleanHeader = headerText || `Col ${colIndex + 1}`;

          // header width estimate
          const headerCharWidth =
            cleanHeader === cleanHeader.toUpperCase() ? headerFontSize * 0.72 : headerFontSize * 0.64;

          const headerPadding = 16;
          const headerWeight = getHeaderWeight(cleanHeader);

          const headerEstimatedWidth =
            Math.max(cleanHeader.length, 4) * headerCharWidth * headerWeight + headerPadding;

          widths[colIndex] = Math.max(widths[colIndex], headerEstimatedWidth);
        }

        tableData.forEach((row) => {
          row.forEach((cell, colIndex) => {
            const parsed = parseCell(cell).trim();

            if (String(cell).trim().startsWith("[date:")) {
              isDateColumn[colIndex] = true;
            }

            const safeLen = Math.min(Math.max(parsed.length + 14, 1), 24);

            let charWidth = bodyFontSize * 0.62;

            if (String(cell).trim().startsWith("[date:")) {
              charWidth = bodyFontSize * 0.95;
            } else if (!isNaN(Number(parsed))) {
              charWidth = bodyFontSize * 0.78;
            }

            const bodyEstimatedWidth = safeLen * charWidth + 10;

            widths[colIndex] = Math.max(widths[colIndex], bodyEstimatedWidth);
          });
        });

        const baseMinWidth = 58;
        const dateMinWidth = 85;
        const maxWidth = 320;

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
      let headerFontSize = isA3 ? 9 : 8;
      let bodyFontSize = isA3 ? 8 : 7;
      let cellPadding = isA3 ? 3 : 2.5;
      let minRowHeight = isA3 ? 18 : 16;

      // adjust by orientation
      if (isLandscape) {
        headerFontSize += 1;
        bodyFontSize += 1;
        cellPadding += 0.5;
      }

      const reductionStep = isA3 && isLandscape ? 0.6 : 1;
      const paddingReduction = isA3 && isLandscape ? 0.3 : 0.5;
      const rowReduction = isA3 && isLandscape ? 1 : 2;

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

      const estimatedWidths = estimateColumnWidths(
        evaluatedTableData,
        columns,
        columnHeaders,
        headerFontSize,
        bodyFontSize
      );
      const totalEstimatedWidth = estimatedWidths.reduce((sum, w) => sum + w, 0);

      // If the table is smaller than the available width, stretch it to full page width
      const columnWidths =
        totalEstimatedWidth < usablePageWidth
          ? estimatedWidths.map((w) => (w / totalEstimatedWidth) * usablePageWidth)
          : estimatedWidths;

      return (
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRow} wrap={false}>
            {(() => {
              const headerCells = [];
              let colIndex = 0;

              while (colIndex < columns) {
                const raw = columnHeaders[colIndex] || "";
                const trimmed = raw.trim();
                const match = trimmed.match(/^\[merge:right:(\d+)\](.*)$/);
                const span = match ? parseInt(match[1], 10) : 1;
                const text = match ? match[2].trim() : parseCell(raw);
                const mergedWidth = columnWidths
                  .slice(colIndex, colIndex + span)
                  .reduce((sum, w) => sum + w, 0);

                // Check if this column is inside a previous merge (from the left)
                let isMergedRightFromLeft = false;
                for (let j = 0; j < colIndex; j++) {
                  const left = columnHeaders[j]?.trim() || "";
                  if (isMergedRight(left)) {
                    const span = getMergeRightSpan(left);
                    if (j + span > colIndex) {
                      isMergedRightFromLeft = true;
                      break;
                    }
                  }
                }

                let leftBorder = "1pt solid black";
                let rightBorder = "1pt solid black";

                if (isMergedRight(trimmed)) {
                  rightBorder = "1pt solid black"; // start of merge
                }

                if (isMergedRightFromLeft) {
                  leftBorder = "none"; // covered by merge from previous cell

                  // only apply right border if this is the last in the merged range
                  let showRightBorder = false;
                  for (let j = 0; j < colIndex; j++) {
                    const left = columnHeaders[j]?.trim() || "";
                    if (isMergedRight(left)) {
                      const span = getMergeRightSpan(left);
                      const endCol = j + span - 1;
                      if (colIndex <= endCol) {
                        showRightBorder = colIndex === endCol;
                        break;
                      }
                    }
                  }

                  rightBorder = showRightBorder ? "1pt solid black" : "none";
                }

                headerCells.push(
                  <View
                    key={`header-${colIndex}`}
                    style={{
                      backgroundColor: "#eee",
                      width: mergedWidth,
                      borderTop: "1pt solid black",
                      borderBottom: "1pt solid black",
                      borderLeft: leftBorder,
                      borderRight: rightBorder,
                      padding: cellPadding,
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    wrap={false}
                  >
                    <Text
                      style={{
                        fontSize: headerFontSize,
                        textAlign: "center",
                        fontWeight: 600,
                        fontFamily: "DejaVuSans",
                        lineHeight: 1.15,
                      }}
                    >
                      {text}
                    </Text>
                  </View>
                );

                colIndex += span;
              }

              return headerCells;
            })()}
          </View>

          {/* Body */}
          {Array.from({ length: rows }).map((_, rowIndex) => {
            const isHeaderRow = headerRowIndexes.includes(rowIndex);
            return (
              <View
                key={rowIndex}
                style={[
                  styles.tableRow,
                  isHeaderRow ? { backgroundColor: "#eee" } : {},
                ]}
                wrap={false}
              >

                {(() => {
                  const cells = [];
                  let colIndex = 0;

                  while (colIndex < columns) {
                    const rawCellValueOriginal = tableData[rowIndex]?.[colIndex] || "";          // merge/borders
                    const rawCellValueDisplay = evaluatedTableData[rowIndex]?.[colIndex] || ""; // what you show
                    const displayTrimmed = rawCellValueDisplay.trim();
                    const displayMergeMatch = displayTrimmed.match(/^\[merge:(right|down):\d+\](.*)/);
                    const cleanedValueDisplay = displayMergeMatch ? displayMergeMatch[2]?.trim() : displayTrimmed;
                    const cellText = parseCell(rawCellValueDisplay);
                    const rawTrimmed = rawCellValueOriginal.trim();
                    const mergePrefixMatch = rawTrimmed.match(/^\[merge:(right|down):\d+\](.*)/);
                    const span = isMergedRight(rawTrimmed) ? getMergeRightSpan(rawTrimmed) : 1;

                    const cleanedValue = mergePrefixMatch ? mergePrefixMatch[2]?.trim() : rawTrimmed;

                    const width = columnWidths
                      .slice(colIndex, colIndex + span)
                      .reduce((sum, w) => sum + w, 0);

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

                    let skipRendering = false;
                    let showBottomBorder = false;

                    for (let startRow = 0; startRow < rowIndex; startRow++) {
                      const cellAbove = tableData[startRow]?.[colIndex]?.trim() || "";
                      if (isMergedDown(cellAbove)) {
                        const span = getMergeDownSpan(cellAbove);
                        const endRow = startRow + span - 1;
                        if (rowIndex <= endRow) {
                          skipRendering = true;
                          showBottomBorder = rowIndex === endRow;
                          break;
                        }
                      }
                    }

                    if (skipRendering || isMergedRightFromLeft) {
                      cells.push(
                        <View
                          key={`cell-${rowIndex}-${colIndex}`}
                          style={{
                            width,
                            borderTop: skipRendering ? "none" : "1pt solid black",
                            borderBottom: showBottomBorder ? "1pt solid black" : "none",
                            borderLeft: isMergedRightFromLeft ? "none" : "1pt solid black",
                            borderRight: skipRendering ? "1pt solid black" : "none",
                          }}
                          wrap={false}
                        />
                      );
                      colIndex++;
                      continue;
                    }

                    let rightBorder = "1pt solid black";
                    if (isMergedRight(rawCellValueOriginal)) rightBorder = "1pt solid black";
                    const isShortText =
                      cleanedValueDisplay.length > 0 &&
                      cleanedValueDisplay.length <= 3 &&
                      isNaN(Number(cleanedValue));
                    const isEuropeanNumber =
                      /^[0-9]{1,3}(\.[0-9]{3})*,[0-9]+$/.test(cleanedValueDisplay) ||
                      /^[0-9]+,[0-9]+$/.test(cleanedValueDisplay) ||
                      /^[0-9]+,[0-9]{3}$/.test(cleanedValueDisplay) ||
                      /^-?\d+(?:\.\d{3})*,\d+$/.test(cleanedValueDisplay);
                    const isImage = cleanedValueDisplay.startsWith("[image:");
                    const imageBase64 = cleanedValueDisplay.match(/^\[image:(data:image\/[a-zA-Z]+;base64,.*?)\]$/)?.[1];
                    const isCenteredCell =
                      ["[checkbox:true]", "[checkbox:false]", "[checkbox]"].includes(cleanedValueDisplay) ||
                      cleanedValueDisplay.startsWith("[select") ||
                      cleanedValueDisplay.startsWith("[number:") ||
                      cleanedValueDisplay.startsWith("[date:") ||
                      !isNaN(Number(cleanedValueDisplay)) ||
                      isEuropeanNumber ||
                      /^[0-9]+(\.[0-9]+)?\s*[a-zA-Z]{1,3}$/.test(cleanedValueDisplay) ||
                      /^[0-9]+(,[0-9]+)?\s*[a-zA-Z]{1,3}$/.test(cleanedValueDisplay) ||
                      /^-?\d+(\.\d+)?\s*[a-zA-Z]{1,3}$/.test(cleanedValueDisplay) ||
                      /^-?\d+,\d+\s*[a-zA-Z]{1,3}$/.test(cleanedValueDisplay) ||
                      !isNaN(Number(cleanedValueDisplay)) ||
                      /^[0-9]+(\.[0-9]+)?\s*[a-zA-Z]{1}$/.test(cleanedValueDisplay) ||
                      /^[0-9]+(\.[0-9]+)?\s*[a-zA-Z]{2}$/.test(cleanedValueDisplay) ||
                      /^[0-9]+(\.[0-9]+)?\s*[a-zA-Z]{3}$/.test(cleanedValueDisplay) ||
                      isShortText ||
                      /^[0-9]+(\.[0-9]+)?\s*[a-zA-Z]{1,3}$/.test(cleanedValueDisplay) ||
                      /^[0-9]+(,[0-9]+)?\s*[a-zA-Z]{1,3}$/.test(cleanedValueDisplay) ||
                      /^-?\d+(\.\d+)?\s*[a-zA-Z]{1,3}$/.test(cleanedValueDisplay) ||
                      /^-?\d+,\d+\s*[a-zA-Z]{1,3}$/.test(cleanedValueDisplay);
                    let bottomBorder = "1pt solid black";
                    if (isMergedDown(rawCellValueOriginal)) {
                      const span = getMergeDownSpan(rawCellValueOriginal);
                      const endRow = rowIndex + span - 1;
                      if (endRow !== rowIndex + span - 1 || rowIndex !== rows - 1) {
                        bottomBorder = "none";
                      }
                    }
                    cells.push(
                      <View
                        key={`cell-${rowIndex}-${colIndex}`}
                        style={[
                          styles.tableCell,
                          {
                            padding: cellPadding,
                            width,
                            borderLeft: "1pt solid black",
                            borderRight: rightBorder,
                            borderTop: "1pt solid black",
                            borderBottom: bottomBorder,
                            justifyContent: "center",
                          },
                        ]}
                        wrap={false}
                      >
                        {isImage && imageBase64 ? (
                          <Image
                            src={imageBase64}
                            style={{
                              height: 60,
                              objectFit: "contain",
                              marginVertical: 2,
                            }}
                          />
                        ) : (
                          (() => {
                            const displayValue = cellText === "SUMMARY" ? "-" : cellText;
                            const isSpecial = cellText === "PASS" || cellText === "FAIL";

                            return (
                              <Text
                                style={{
                                  fontFamily: "DejaVuSans",
                                  minHeight: minRowHeight,
                                  fontSize: bodyFontSize,
                                  textAlign: isCenteredCell || isHeaderRow ? "center" : "left",
                                  fontWeight: isHeaderRow ? 600 : isSpecial ? 600 : undefined,
                                  color:
                                    cellText === "PASS"
                                      ? "green"
                                      : cellText === "FAIL"
                                        ? "red"
                                        : "#000",
                                }}
                              >
                                {displayValue}
                              </Text>
                            );
                          })()
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
                          })
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

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

            {/* Page Content */}
            {buildRows(contentElements).map((row, rowIndex) => (
              <View key={rowIndex} style={{ flexDirection: "row", width: "100%" }}>
                {row.map((element) => {
                  const value = responses[element.id];
                  const width = element.width || 100;

                  return (
                    <View
                      key={element.id}
                      style={{
                        width: `${width}%`,
                        paddingRight: 6,
                        marginBottom: 6,
                      }}
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
                      })}
                    </View>
                  );
                })}
              </View>
            ))}

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


