// src/components/fields/TableField.tsx
"use client";
import {
  FormElementInstance,
} from "../FormElements";
import { useEffect, useRef } from "react";
import useDesigner from "../hooks/useDesigner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { CustomInstance } from "./TableField";

export function DesignerComponent({ elementInstance }: { elementInstance: FormElementInstance }) {
  const element = elementInstance as CustomInstance;
  const { rows, columns, label, data = [], columnHeaders = [], headerRowIndexes = [] as number[] } = element.extraAttributes;
  const { updateElement } = useDesigner();

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      const newHeight = containerRef.current?.offsetHeight ?? 0;

      if (newHeight !== element.height) {
        updateElement(element.id, {
          ...element,
          height: newHeight,
        });
      }
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [element.id, element.height, updateElement, element]);

  const toggleHeaderRow = (rowIndex: number) => {
    const isHeader = headerRowIndexes.includes(rowIndex);
    const newHeaderRowIndexes = isHeader
      ? headerRowIndexes.filter((i) => i !== rowIndex)
      : [...headerRowIndexes, rowIndex];

    updateElement(element.id, {
      ...element,
      extraAttributes: {
        ...element.extraAttributes,
        headerRowIndexes: newHeaderRowIndexes,
      },
    });
  };

  const baseCellStyle = {
    maxWidth: "auto",
    minWidth: "50px",
    width: "auto",
    whiteSpace: "pre-wrap" as const,
    wordWrap: "break-word" as const,
    overflowWrap: "break-word" as const,
    verticalAlign: "top" as const,
  };

  return (
    <div ref={containerRef} className="relative">
      <p className="font-medium mb-2">{label}</p>
      <Table>
        <TableHeader>
          <TableRow>
            {[...Array(columns)].map((_, col) => (
              <TableHead key={col} style={baseCellStyle}>
                {columnHeaders[col] || `Col ${col + 1}`}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(rows)].map((_, row) => {
            const isHeader = headerRowIndexes.includes(row);
            return (
              <TableRow
                key={row}
                onClick={() => toggleHeaderRow(row)}
                className={isHeader ? "bg-muted text-muted-foreground font-semibold" : ""}
              >
                {[...Array(columns)].map((_, col) => {
                  const content = data?.[row]?.[col] || " ";
                  return isHeader ? (
                    <TableHead key={col} style={baseCellStyle}>
                      {content}
                    </TableHead>
                  ) : (
                    <TableCell key={col} style={baseCellStyle}>
                      {content}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="absolute bottom-0 left-2 px-2 py-[2px] text-[10px] rounded bg-muted text-muted-foreground border">
        {element.id}
      </div>
    </div>
  );
}