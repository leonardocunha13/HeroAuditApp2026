// src/components/fields/TableField.tsx
"use client";
import {
  FormElementInstance,
} from "../FormElements";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { ControllerRenderProps } from "react-hook-form";
import useDesigner from "../hooks/useDesigner";
import { read, utils } from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Input } from "../ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Divider } from "@aws-amplify/ui-react";
import { Button } from "../ui/button";
import "react-datepicker/dist/react-datepicker.css";
import React from "react";
import { CustomInstance, propertiesSchema } from "./TableField";
import { Textarea } from "../ui/textarea";

type propertiesFormSchemaType = z.infer<typeof propertiesSchema>;

export function PropertiesComponent({ elementInstance }: { elementInstance: FormElementInstance }) {
  const element = elementInstance as CustomInstance;
  const { updateElement } = useDesigner();
  const [headerRowIndexes, setHeaderRowIndexes] = useState<number[]>(element.extraAttributes.headerRowIndexes || []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectBuilderOpen, setSelectBuilderOpen] = useState(false);
  const selectedCellRef = useRef<{ row: number; col: number } | null>(null);
  const [showGuidance, setShowGuidance] = useState(false);
  const [selectCount, setSelectCount] = useState(2);
  const [selectOptions, setSelectOptions] = useState<string[]>([]);
  const [mergeBuilderOpen, setMergeBuilderOpen] = useState<{
    direction: "right" | "down";
    row: number;
    col: number;
  } | null>(null);
  const [mergeCount, setMergeCount] = useState(2);
  const [activeCell, setActiveCell] = useState<{
    row: number;
    col: number;
    rect: DOMRect | null;
  } | null>(null);
  const form = useForm<propertiesFormSchemaType>({
    resolver: zodResolver(propertiesSchema),
    defaultValues: {
      ...element.extraAttributes,
    },
  });

  const [data, setData] = useState<string[][]>(element.extraAttributes.data);
  useEffect(() => {
    // Close merge builder if active cell changes
    if (mergeBuilderOpen) {
      const sameCell =
        activeCell?.row === mergeBuilderOpen.row &&
        activeCell?.col === mergeBuilderOpen.col;
      if (!sameCell) {
        setMergeBuilderOpen(null);
      }
    }
  }, [activeCell, mergeBuilderOpen]);
  useEffect(() => {
    form.reset(element.extraAttributes);
    setData(element.extraAttributes.data);

    const existingHeaders = element.extraAttributes.columnHeaders;
    const numCols = element.extraAttributes.columns;

    if (existingHeaders && existingHeaders.length === numCols) {
      setColumnHeaders(existingHeaders);
    } else {
      const newHeaders = [];
      for (let i = 0; i < numCols; i++) {
        newHeaders.push(existingHeaders?.[i] || `Col ${i + 1}`);
      }
      setColumnHeaders(newHeaders);
    }
  }, [element.extraAttributes, form]);

  const watchRows = form.watch("rows");
  const watchColumns = form.watch("columns");

  useEffect(() => {
    setData((prevData) => {
      const newData = Array.from({ length: watchRows }, (_, row) =>
        Array.from({ length: watchColumns }, (_, col) => prevData?.[row]?.[col] || "")
      );
      return newData;
    });
  }, [watchRows, watchColumns]);

  function handleCellChange(row: number, col: number, value: string) {
    const newData = [...data];
    newData[row][col] = value;
    setData(newData);
    updateElement(element.id, {
      ...element,
      extraAttributes: {
        ...element.extraAttributes,
        data: newData,
      },
    });
  }

  const [columnHeaders, setColumnHeaders] = useState<string[]>(
    element.extraAttributes.columnHeaders || Array.from({ length: watchColumns }, (_, i) => `Col ${i + 1}`)
  );

  useEffect(() => {
    setColumnHeaders((prev) => {
      const newHeaders = Array.from({ length: watchColumns }, (_, i) => prev?.[i] || `Col ${i + 1}`);
      return newHeaders;
    });
  }, [watchColumns]);

  function handleHeaderChange(index: number, value: string) {
    const updatedHeaders = [...columnHeaders];
    updatedHeaders[index] = value;
    setColumnHeaders(updatedHeaders);

    updateElement(element.id, {
      ...element,
      extraAttributes: {
        ...element.extraAttributes,
        data,
        columnHeaders: updatedHeaders,
      },
    });
  }

  function applyChanges(values: propertiesFormSchemaType) {
    const { label } = values;
    updateElement(element.id, {
      ...element,
      extraAttributes: {
        label,
        rows: values.rows,
        columns: values.columns,
        data,
        columnHeaders,
        headerRowIndexes,
      },
    });
  }
  function handleImportClick() {
    fileInputRef.current?.click();
  }
  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) return;

    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const data = await file.arrayBuffer();
      const workbook = read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const parsedData = utils.sheet_to_json<string[]>(worksheet, { header: 1 });

      if (parsedData.length === 0) return;

      const headers = parsedData[0].map((val) => (val ? String(val) : ""));
      const rows = parsedData.slice(1).map((row) =>
        Array.from({ length: headers.length }, (_, i) =>
          row[i] ? String(row[i]) : ""
        )
      );

      setColumnHeaders(headers);
      setData(rows);

      form.setValue("rows", rows.length);
      form.setValue("columns", headers.length);

      updateElement(element.id, {
        ...element,
        extraAttributes: {
          ...element.extraAttributes,
          rows: rows.length,
          columns: headers.length,
          data: rows,
          columnHeaders: headers,
        },
      });
    };
  }, [form, element, element.extraAttributes, updateElement]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;

      if (!target.closest(".table-cell-editor") &&
        !target.closest(".cell-toolbar") &&
        !target.closest(".cell-modal")) {
        setActiveCell(null);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);


  function deleteRow(rowIndex: number) {
    const newData = data.filter((_, i) => i !== rowIndex);
    form.setValue("rows", newData.length);
    setData(newData);
    updateElement(element.id, {
      ...element,
      extraAttributes: {
        ...element.extraAttributes,
        rows: newData.length,
        data: newData,
      },
    });
  }

  function deleteColumn(colIndex: number) {
    const newData = data.map(row => row.filter((_, i) => i !== colIndex));
    const newHeaders = columnHeaders.filter((_, i) => i !== colIndex);
    form.setValue("columns", newHeaders.length);
    setData(newData);
    setColumnHeaders(newHeaders);
    updateElement(element.id, {
      ...element,
      extraAttributes: {
        ...element.extraAttributes,
        columns: newHeaders.length,
        data: newData,
        columnHeaders: newHeaders,
      },
    });
  }

  type TableFieldFormData = {
    label: string;
    rows: number;
    columns: number;
  };

  type NumberInputFieldProps = {
    field: ControllerRenderProps<TableFieldFormData, "rows" | "columns">;
    label: string;
  };
  function toggleHeaderRow(rowIndex: number) {
    const isHeader = headerRowIndexes.includes(rowIndex);
    const newHeaderRows = isHeader
      ? headerRowIndexes.filter((i) => i !== rowIndex)
      : [...headerRowIndexes, rowIndex];

    setHeaderRowIndexes(newHeaderRows);

    updateElement(element.id, {
      ...element,
      extraAttributes: {
        ...element.extraAttributes,
        headerRowIndexes: newHeaderRows,
      },
    });
  }

  function NumberInputField({ field, label }: NumberInputFieldProps) {
    const [localValue, setLocalValue] = React.useState(field.value);

    React.useEffect(() => {
      setLocalValue(field.value);
    }, [field.value]);

    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input
            type="number"
            value={localValue}
            onChange={(e) => setLocalValue(Number(e.target.value))}
            onBlur={() => {
              if (!isNaN(localValue)) field.onChange(localValue);
            }}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    );
  }

  function insertTag(tag: string) {
    const cell = selectedCellRef.current;
    if (!cell) return;

    const { row, col } = cell;

    const newData = [...data];
    newData[row][col] = (newData[row][col] || "") + tag;

    setData(newData);

    updateElement(element.id, {
      ...element,
      extraAttributes: {
        ...element.extraAttributes,
        data: newData,
      },
    });
  }


  return (
    <Form {...form}>
      <form
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            form.handleSubmit(applyChanges)();
          }
        }}
        onSubmit={(e) => e.preventDefault()}
        className="space-y-3">
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter a label (optional)" />
              </FormControl>
              <FormDescription>Displayed above the table.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rows"
          render={({ field }) => <NumberInputField field={field} label="Rows" />}
        />
        <FormField
          control={form.control}
          name="columns"
          render={({ field }) => <NumberInputField field={field} label="Columns" />}
        />
        <Divider orientation="horizontal" size="small" color="gray" marginTop="1rem" marginBottom="1rem" />
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">

            <div className="flex items-center justify-between mb-2">
              <div className="mb-2">
                <FormLabel>Table Content</FormLabel>
                <span className="text-sm text-muted-foreground block mt-1">
                  Click on a cell to see options for including content in the table.
                </span>
                <div className="mt-2">

                </div>
              </div>
            </div>
            {showGuidance && (
              <FormDescription className="mb-2 p-2 border rounded bg-gray-50">
                Use <code>[checkbox]</code> as the cell value to display a checkbox. <br />
                Use <code>[select:"Option1":["Option1","Option2"]]</code> to display a dropdown with options.<br />
                Use <code>[number:]</code> to display a number input field.<br />
                Use <code>[date:]</code> to display a date picker.<br />
                Use <code>[camera]</code> to open the camera and make register of the process performed.<br />
                Use <code>[SUMMARY]</code> to display buttons to select the overall result of the table.<br />
                Use <code>[merge:right:#]Text</code> to merge with # cells to the right.<br />
                Use <code>[merge:down:#]Text</code> to merge with # cells below.<br />
                Use <code>" "</code> (a single space) to create a non-editable empty cell.<br />
                For a regular editable text field, leave the cell blank.
              </FormDescription>
            )}
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowGuidance((prev) => !prev)}
            >
              {showGuidance ? "Hide Guidance" : "Show Guidance"} ❓
            </Button>

            <Button type="button" size="sm" onClick={handleImportClick}>
              Import Excel
            </Button>
          </div>
          <input
            type="file"
            accept=".xlsx, .xls"
            style={{ display: "none" }}
            ref={fileInputRef}
          />
        </div>
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {[...Array(watchColumns)].map((_, col) => (
                  <TableHead key={col}>
                    <Button variant="ghost" size="icon" onClick={() => deleteColumn(col)}>
                      ✕
                    </Button>
                    <Textarea
                      className="w-full min-h-[60px] p-2 pr-6 pb-6 border rounded resize-y overflow-hidden relative"
                      value={columnHeaders[col] || ""}
                      onChange={(e) => handleHeaderChange(col, e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(watchRows)].map((_, row) => (
                <TableRow
                  key={row}
                  className={headerRowIndexes.includes(row) ? "bg-muted text-muted-foreground font-medium" : ""}>

                  {[...Array(watchColumns)].map((_, col) => (
                    <TableCell
                      key={col}
                      className={`min-w-[150px] align-top ${headerRowIndexes.includes(row) ? "bg-muted text-muted-foreground font-medium" : ""
                        }`}
                    >

                      <Textarea
                        className="table-cell-editor w-full min-h-[60px] w-full min-h-[60px] p-2 pr-6 pb-6 border rounded resize overflow-hidden relative"
                        value={data?.[row]?.[col] || ""}
                        onChange={(e) => handleCellChange(row, col, e.target.value)}
                        onFocus={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();

                          setActiveCell({
                            row,
                            col,
                            rect,
                          });
                          selectedCellRef.current = { row, col };
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleHeaderRow(row)}
                      title="Toggle header style"
                    >
                      🧷
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteRow(row)}>
                      ✕
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </form>
      {activeCell?.rect && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="cell-toolbar fixed z-50 flex gap-2 bg-white shadow-lg border rounded-lg p-2"
          style={{
            top: activeCell.rect.top + window.scrollY - 45,
            left: activeCell.rect.left + window.scrollX,
          }}
        >
          <Button
            size="sm"
            onClick={() => insertTag("[checkbox]")}
            title="Checkbox"
          >
            ☑
          </Button>

          <Button
            size="sm"
            onClick={() => insertTag("[number:]")}
            title="Number"
          >
            123
          </Button>

          <Button
            size="sm"
            onClick={() => insertTag("[date:]")}
            title="Date"
          >
            📅
          </Button>

          <Button
            size="sm"
            onClick={() => insertTag("[camera]")}
            title="Camera"
          >
            📸
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setSelectCount(2);
              setSelectOptions(["", ""]);
              setSelectBuilderOpen(true);
            }}
            title="Select"
          >
            🔽
          </Button>

          <Button
            size="sm"
            type="button"
            onClick={() => {
              if (!activeCell) return;
              setMergeBuilderOpen({ direction: "right", row: activeCell.row, col: activeCell.col });
              setMergeCount(2);
            }}
            title="Merge Right"
          >
            ➡️
          </Button>

          <Button
            size="sm"
            type="button"
            onClick={() => {
              if (!activeCell) return;
              setMergeBuilderOpen({ direction: "down", row: activeCell.row, col: activeCell.col });
              setMergeCount(2);
            }}
            title="Merge Down"
          >
            ⬇️
          </Button>
          <Button size="sm" title="Summary" type="button" onClick={() => insertTag("[SUMMARY]")}>
            📊
          </Button>

        </div>
      )}
      {selectBuilderOpen && (
        <div className="cell-modal fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[400px] space-y-4">

            <h3 className="font-semibold text-lg">Create Dropdown</h3>

            {/* How many options */}
            <div>
              <label className="text-sm">How many options?</label>
              <Input
                type="number"
                min={1}
                value={selectCount}
                onChange={(e) => {
                  const count = Number(e.target.value);
                  setSelectCount(count);
                  setSelectOptions(Array(count).fill(""));
                }}
              />
            </div>

            {/* Option inputs */}
            <div className="space-y-2">
              {Array.from({ length: selectCount }).map((_, i) => (
                <Input
                  key={i}
                  placeholder={`Option ${i + 1}`}
                  value={selectOptions[i] || ""}
                  onChange={(e) => {
                    const newOpts = [...selectOptions];
                    newOpts[i] = e.target.value;
                    setSelectOptions(newOpts);
                  }}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSelectBuilderOpen(false)}>
                Cancel
              </Button>

              <Button
                onClick={() => {
                  const cleaned = selectOptions.filter(Boolean);
                  if (!cleaned.length) return;

                  const tag = `[select:"":[${cleaned
                    .map(o => `"${o}"`)
                    .join(",")}]]`;

                  insertTag(tag);
                  setSelectBuilderOpen(false);
                }}
              >
                Insert
              </Button>
            </div>

          </div>
        </div>
      )}

      {mergeBuilderOpen && activeCell?.row === mergeBuilderOpen.row && activeCell?.col === mergeBuilderOpen.col && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="cell-modal fixed  z-50 bg-white border rounded-lg p-2 shadow-lg flex items-center gap-2"
          style={{
            top: (activeCell.rect?.top ?? 0) + window.scrollY - 90,
            left: (activeCell.rect?.left ?? 0) + window.scrollX,
          }}
        >
          <label className="text-sm">Merge {mergeBuilderOpen.direction}:</label>
          <Input
            type="number"
            min={2}
            max={10}
            value={mergeCount}
            onChange={(e) => setMergeCount(Number(e.target.value))}
            className="border rounded px-1 w-16"
          />
          <Button
            size="sm"
            onClick={() => {
              if (!mergeBuilderOpen) return;
              const { row, col, direction } = mergeBuilderOpen;
              const tag = `[merge:${direction}:${mergeCount}]`;
              const newData = [...data];
              newData[row][col] = (newData[row][col] || "") + tag;

              setData(newData);

              updateElement(element.id, {
                ...element,
                extraAttributes: {
                  ...element.extraAttributes,
                  data: newData,
                },
              });

              setMergeBuilderOpen(null);
            }}
          >
            Insert
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setMergeBuilderOpen(null)}>Cancel</Button>
        </div>
      )}
    </Form>
  );
}