"use client";

import { useEffect, useRef, useState } from "react";
import { FormElementInstance, SubmitFunction } from "../FormElements";
import { Input } from "../ui/input";
import { Label } from "../../components/ui/label";
import { CustomInstance } from "./CalculationField";
import { formValueStore } from "../formValueStore";

function getCellNumericValue(raw: any): number {
  if (raw === null || raw === undefined || raw === "") return 0;

  if (typeof raw === "number") return raw;

  if (typeof raw === "string") {
    const s = raw.trim();

    // [number:xxx]
    if (s.startsWith("[number:")) {
      const v = s.match(/^\[number:(.*?)\]$/)?.[1];
      return parseFloat(v || "0") || 0;
    }

    // plain numeric string
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  return 0;
}

function cellRefToIndexes(ref: string) {
  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;

  const letters = match[1].toUpperCase();
  const row = Number(match[2]) - 1;

  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  col -= 1;

  return { row, col };
}

function evaluateTableCellFormula(
  formula: string,
  currentTable: (string | number)[][],
  values: Record<string, any>,
  visited: Set<string>
): number {
  const trimmed = String(formula ?? "").trim();
  if (!trimmed.startsWith("=")) return getCellNumericValue(trimmed);

  // prevent circular refs
  const key = `T:${trimmed}`;
  if (visited.has(key)) return 0;
  visited.add(key);

  let expr = trimmed.slice(1);

  // {tableId:A1} inside table formulas
  expr = expr.replace(/\{(\w+):([A-Z]+\d+)\}/g, (_, tableId, a1) => {
    const tableValue = values[String(tableId)];
    if (!tableValue) return "0";

    let table: any;
    try {
      table = typeof tableValue === "string" ? JSON.parse(tableValue) : tableValue;
    } catch {
      return "0";
    }

    if (!Array.isArray(table)) return "0";

    const pos = cellRefToIndexes(a1);
    if (!pos) return "0";

    const raw = table[pos.row]?.[pos.col] ?? "";
    const rawStr = typeof raw === "string" ? raw.trim() : raw;

    if (typeof rawStr === "string" && rawStr.startsWith("=")) {
      return String(evaluateTableCellFormula(rawStr, table, values, visited));
    }

    return String(getCellNumericValue(rawStr));
  });

  // same-table refs like B2, C5
  expr = expr.replace(/\b([A-Z]+\d+)\b/g, (_, a1) => {
    const pos = cellRefToIndexes(a1);
    if (!pos) return "0";

    const raw = currentTable[pos.row]?.[pos.col] ?? "";
    const rawStr = typeof raw === "string" ? raw.trim() : raw;

    if (typeof rawStr === "string" && rawStr.startsWith("=")) {
      return String(evaluateTableCellFormula(rawStr, currentTable, values, visited));
    }

    return String(getCellNumericValue(rawStr));
  });

  // allow ^ power
  expr = expr.replace(/\^/g, "**");

  // AND/OR (if you use them in table formulas)
  expr = expr.replace(/\band\b/gi, "&&").replace(/\bor\b/gi, "||");

  const ROUND = (value: number, digits: number = 0) => {
    const factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
  };
  const DEG = (rad: number) => (rad * 180) / Math.PI;
  const RAD = (deg: number) => (deg * Math.PI) / 180;

  try {
    const out = Function("Math", "ROUND", "DEG", "RAD", `"use strict"; return (${expr})`)(
      Math,
      ROUND,
      DEG,
      RAD
    );
    return Number(out) || 0;
  } catch {
    return 0;
  }
}

function evaluateFormula(formula: string, values: Record<string, any>): string {
  if (!formula) return "";

  let expression = String(formula);

  // ✅ table refs {tableId:A1}
  expression = expression.replace(/\{(\w+):([A-Za-z]+)(\d+)\}/g, (_, fieldId, colLetters, rowNumber) => {
    const tableValue = values[String(fieldId)];
    if (!tableValue) return "0";

    let table: (string | number)[][] = [];
    try {
      table = typeof tableValue === "string" ? JSON.parse(tableValue) : tableValue;
    } catch {
      return "0";
    }
    if (!Array.isArray(table)) return "0";

    const a1 = `${String(colLetters).toUpperCase()}${rowNumber}`;
    const pos = cellRefToIndexes(a1);
    if (!pos) return "0";

    const cell = table[pos.row]?.[pos.col] ?? "";
    const cellStr = typeof cell === "string" ? cell.trim() : cell;

    // ✅ if the referenced cell is a formula, evaluate it in table context
    if (typeof cellStr === "string" && cellStr.startsWith("=")) {
      return String(evaluateTableCellFormula(cellStr, table, values, new Set()));
    }

    return String(getCellNumericValue(cellStr));
  });

  // ✅ normal field refs {fieldId}
  expression = expression.replace(/\{(\w+)\}/g, (_, fieldId) => {
    let value = values[String(fieldId)];

    // if someone references a table directly, treat as 0 (forces using {tableId:A1})
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return "0";
      } catch {
        // ok
      }
    }

    return String(getCellNumericValue(value));
  });

  // AND/OR for calc formulas
  expression = expression.replace(/\band\b/gi, "&&").replace(/\bor\b/gi, "||");

  // optional power support in calc fields too
  expression = expression.replace(/\^/g, "**");

  const ROUND = (value: number, digits: number = 0) => {
    const factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
  };
  const DEG = (rad: number) => (rad * 180) / Math.PI;
  const RAD = (deg: number) => (deg * Math.PI) / 180;

  try {
    const result = Function("Math", "DEG", "RAD", "ROUND", `"use strict"; return (${expression})`)(
      Math,
      DEG,
      RAD,
      ROUND
    );
    return String(result);
  } catch {
    return "";
  }
}

export function FormComponent({
  elementInstance,
  submitValue,
  defaultValue,
  readOnly,
}: {
  elementInstance: FormElementInstance;
  submitValue?: SubmitFunction;
  defaultValue?: string;
  readOnly?: boolean;
}) {
  const element = elementInstance as CustomInstance;

  const [value, setValue] = useState(defaultValue || "");

  const lastValueRef = useRef<string>(defaultValue || "");

  useEffect(() => {
    if (defaultValue) {
      formValueStore.setValue(element.id, defaultValue);
    }
  }, [defaultValue, element.id]);

  useEffect(() => {
    if (readOnly && defaultValue !== undefined) {
      setValue(defaultValue);
      return;
    }

    // normal live calculation logic here
  }, [defaultValue, readOnly]);

  useEffect(() => {
    const recalc = () => {
      const result = evaluateFormula(
        element.extraAttributes.formula,
        formValueStore.getValues()
      );

      if (result === lastValueRef.current) return;

      lastValueRef.current = result;

      setValue(result);

      formValueStore.setValue(element.id, result);

      if (submitValue) {
        submitValue(element.id, result);
      }
    };

    recalc();
    return formValueStore.subscribe(recalc);
  }, [element.extraAttributes.formula, element.id, submitValue]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <Label>{element.extraAttributes.label}</Label>
      <Input readOnly value={value} />
    </div>
  );
}