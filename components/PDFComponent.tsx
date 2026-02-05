// components/PDFDocument.tsx
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { FormElementInstance } from "./FormElements";
import { renderHtmlToPDFElements } from "./converthtmlreact";
import React from "react";

Font.register({
  family: 'DejaVuSans',
  src: '/fonts/DejaVuSans.ttf',
});

interface Props {
  elements: FormElementInstance[][];
  responses: { [key: string]: unknown };
  formName: string;
  revision: number | string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A3' | 'A4';
  docNumber?: string;
  docNumberRevision?: number | string;
  equipmentName?: string;
  equipmentTag?: string;
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


function renderFieldValue(element: FormElementInstance, value: unknown) {

  switch (element.type) {
    case "ImageField": {
      const imageUrl =
        typeof value === "string" ? value : element.extraAttributes?.imageUrl;

      if (!imageUrl) return <Text>[Invalid image]</Text>;

      const width = element.extraAttributes?.width;
      const height = element.extraAttributes?.height;
      const alignment = element.extraAttributes?.position ?? "left";
      const preserveOriginalSize = element.extraAttributes?.preserveOriginalSize;

      let alignStyle = {};
      if (alignment === "center") {
        alignStyle = { alignSelf: "center" };
      } else if (alignment === "right") {
        alignStyle = { alignSelf: "flex-end" };
      } else {
        alignStyle = { alignSelf: "flex-start" };
      }

      const imageStyle = preserveOriginalSize
        ? {
          objectFit: "contain",
          width: "200px",
          height: "80px",
          ...alignStyle,
        }
        : {
          objectFit: "contain",
          width,
          height,
          ...alignStyle,
        };

      return <Image src={imageUrl} style={imageStyle} />;
    }

    case "TableField": {
      const tableData = value || element.extraAttributes?.data;
      const headerRowIndexes: number[] = element.extraAttributes?.headerRowIndexes || [];

      if (!tableData || !Array.isArray(tableData)) return <Text>[Invalid table]</Text>;

      const rows = tableData.length;
      const columns = Math.max(...tableData.map((row: string[]) => row.length));
      const isCompactMode = columns > 10;
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
      // Get the column widths based on the content
      const estimateColumnWidths = (
        tableData: string[][],
        columnCount: number,
        columnHeaders: string[] = []
      ): number[] => {
        const maxCharPerColumn = Array(columnCount).fill(0);
        const isDateColumn = Array(columnCount).fill(false);
        const allRows = [columnHeaders.slice(0, columnCount), ...tableData];

        allRows.forEach((row) => {
          row.forEach((cell, colIndex) => {
            const parsed = parseCell(cell);
            const lengthWithMin = parsed.length + 13;
            let px = 13;

            if (cell.trim().startsWith("[date:")) {
              isDateColumn[colIndex] = true;
              px = 19;
            } else if (/^[A-Z0-9\s\W]+$/.test(parsed)) {
              px = 15;
            } else if (!isNaN(Number(parsed))) {
              px = 14;
            }

            maxCharPerColumn[colIndex] = Math.max(
              maxCharPerColumn[colIndex],
              lengthWithMin * px
            );
          });
        });

        const baseMinWidth = 70;
        const dateMinWidth = 130;
        const maxWidth = 1200;

        return maxCharPerColumn.map((w, colIndex) =>
          Math.min(
            Math.max(w, isDateColumn[colIndex] ? dateMinWidth : baseMinWidth),
            maxWidth
          )
        );
      };


      const columnWidths = estimateColumnWidths(tableData, columns, columnHeaders);
      const compactStyles = {
        table: {
          borderColor: "#000",
          width: "100%",
        },
        tableCell: {
          borderWidth: 1,
          borderColor: "#000",
          padding: 1,
          flexShrink: 0,
        },
        tableRow: {
          flexDirection: "row",
        },
      };
      return (
        <View style={isCompactMode ? compactStyles.table : styles.table}>
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
                      padding: isCompactMode ? 1 : 3,
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    wrap={false}
                  >
                    <Text
                      style={{
                        fontSize: isCompactMode ? 5 : 10,
                        textAlign: "center",
                        fontWeight: 600,
                        fontFamily: "DejaVuSans",
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
                    const rawCellValue = tableData[rowIndex]?.[colIndex] || "";
                    const cellText = parseCell(rawCellValue);
                    const rawTrimmed = rawCellValue.trim();
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
                    if (isMergedRight(rawCellValue)) rightBorder = "1pt solid black";
                    const isShortText =
                      cleanedValue.length > 0 &&
                      cleanedValue.length <= 3 &&
                      isNaN(Number(cleanedValue));
                    const isEuropeanNumber =
                      /^[0-9]{1,3}(\.[0-9]{3})*,[0-9]+$/.test(cleanedValue) ||
                      /^[0-9]+,[0-9]+$/.test(cleanedValue) ||
                      /^[0-9]+,[0-9]{3}$/.test(cleanedValue) ||
                      /^-?\d+(?:\.\d{3})*,\d+$/.test(cleanedValue);
                    const isImage = cleanedValue.startsWith("[image:");
                    const imageBase64 = cleanedValue.match(/^\[image:(data:image\/[a-zA-Z]+;base64,.*?)\]$/)?.[1];
                    const isCenteredCell =
                      ["[checkbox:true]", "[checkbox:false]", "[checkbox]"].includes(cleanedValue) ||
                      cleanedValue.startsWith("[select") ||
                      cleanedValue.startsWith("[number:") ||
                      cleanedValue.startsWith("[date:") ||
                      !isNaN(Number(cleanedValue)) ||
                      isEuropeanNumber ||
                      /^[0-9]+(\.[0-9]+)?\s*[a-zA-Z]{1,3}$/.test(cleanedValue) ||
                      /^[0-9]+(,[0-9]+)?\s*[a-zA-Z]{1,3}$/.test(cleanedValue) ||
                      /^-?\d+(\.\d+)?\s*[a-zA-Z]{1,3}$/.test(cleanedValue) ||
                      /^-?\d+,\d+\s*[a-zA-Z]{1,3}$/.test(cleanedValue) ||
                      !isNaN(Number(cleanedValue)) ||
                      /^[0-9]+(\.[0-9]+)?\s*[a-zA-Z]{1}$/.test(cleanedValue) ||
                      /^[0-9]+(\.[0-9]+)?\s*[a-zA-Z]{2}$/.test(cleanedValue) ||
                      /^[0-9]+(\.[0-9]+)?\s*[a-zA-Z]{3}$/.test(cleanedValue) ||
                      isShortText ||
                      /^[0-9]+(\.[0-9]+)?\s*[a-zA-Z]{1,3}$/.test(cleanedValue) ||
                      /^[0-9]+(,[0-9]+)?\s*[a-zA-Z]{1,3}$/.test(cleanedValue) ||
                      /^-?\d+(\.\d+)?\s*[a-zA-Z]{1,3}$/.test(cleanedValue) ||
                      /^-?\d+,\d+\s*[a-zA-Z]{1,3}$/.test(cleanedValue);
                    let bottomBorder = "1pt solid black";
                    if (isMergedDown(rawCellValue)) {
                      const span = getMergeDownSpan(rawCellValue);
                      const endRow = rowIndex + span - 1;
                      if (endRow !== rowIndex + span - 1 || rowIndex !== rows - 1) {
                        bottomBorder = "none";
                      }
                    }
                    cells.push(
                      <View
                        key={`cell-${rowIndex}-${colIndex}`}
                        style={[
                          isCompactMode ? compactStyles.tableCell : styles.tableCell,
                          {
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
                                  minHeight: isCompactMode ? 20 : "auto",
                                  fontSize: isCompactMode ? 4 : 9,
                                  textAlign: isCenteredCell || isHeaderRow ? "center" : "justify",
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
      let textAlign: "left" | "center" | "right" = "left";
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const p = doc.querySelector("p");
      if (p?.style.textAlign) {
        const align = p.style.textAlign;
        if (align === "center" || align === "right") textAlign = align as any;
      }
      return (
        <View style={{ padding: 2, borderWidth: 1, borderRadius: 4 }}>
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
    /*case "TextField": {
      const cleanText =
        typeof value === "string" ? value.trim() : "";

      return (
        <View style={{ padding: 2, borderWidth: 1, borderRadius: 4 }}>
          <Text style={{ fontSize: 10 }}>
            {cleanText || "-"}
          </Text>
        </View>
      );
    }*/

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

export default function PDFDocument({ elements, responses, formName, revision, orientation, pageSize, docNumber, docNumberRevision, equipmentName, equipmentTag }: Props) {
  const repeatablesInOrder = elements[0]?.filter(el => el.extraAttributes?.repeatOnPageBreak) || [];
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

  return (
    <Document>
      {elements.map((group, pageIndex) => (
        <Page key={pageIndex} style={styles.page} wrap orientation={orientation || "portrait"} size={pageSize || "A3"}>
          {/* Header */}
          <View fixed style={styles.header}>
            {repeatablesInOrder.map((el) => {
              if (el.type === "ImageField") {
                return (
                  <Image key={el.id} src={el.extraAttributes?.imageUrl} style={imageStyle} />
                );
              }
              return (
                <View key={`header-el-${el.id}`}>
                  {renderFieldValue(el, responses[el.id])}
                </View>
              );
            })}
          </View>
          {/* Header */}
          <View fixed style={styles.headerContainer}>
            <View style={styles.headerContent}>
              <Text>{equipmentName} | {equipmentTag}</Text>
            </View>
          </View>

          {/* Footer */}
          <View fixed style={styles.footerContainer}>
            <View style={styles.footerLine} />
            <View style={styles.footerContent}>
              <Text>{formName} REV. {revision} | {docNumber} REV. {docNumberRevision} </Text>
              <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
            </View>
          </View>

          {/* Page Content */}
          {group.map((element, index) => {
            if (repeatablesInOrder.find(r => r.id === element.id)) return null;

            const nextElement = group[index + 1];
            const isTitleFollowedByParagraph =
              element.type === "TitleField" &&
              ["ParagraphField", "TableField", "ImageField"].includes(nextElement?.type);

            if (isTitleFollowedByParagraph) {
              const titleValue = responses[element.id];
              const nextValue = responses[nextElement.id];

              return (
                <React.Fragment key={`combo-${element.id}-${nextElement.id}`}>
                  {/* Title (safe to keep together) */}
                  <View key={`title-${element.id}`} style={styles.fieldContainer} wrap={false}>
                    <Text style={styles.fieldTitle}>{element.extraAttributes?.label}</Text>
                    {renderFieldValue(element, titleValue)}
                  </View>

                  {/* Content (MUST be allowed to wrap) */}
                  <View key={`content-${nextElement.id}`} style={styles.fieldContainer}>
                    <Text style={styles.fieldTitle}>{nextElement.extraAttributes?.label}</Text>
                    {renderFieldValue(nextElement, nextValue)}
                  </View>
                </React.Fragment>
              );
            }

            if (
              index > 0 &&
              group[index - 1].type === "TitleField" &&
              ["ParagraphField", "TableField", "ImageField"].includes(element.type)
            ) {
              return null;
            }

            const value = responses[element.id];

            return (
              <View key={element.id} style={styles.fieldContainer}>
                {element.type !== "SeparatorField" && element.type !== "CheckboxField" && (
                  <Text style={styles.fieldTitle}>{element.extraAttributes?.label}</Text>
                )}
                {renderFieldValue(element, value)}
              </View>
            );
          })}
        </Page>
      ))}
    </Document>
  );
}


