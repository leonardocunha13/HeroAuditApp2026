"use client";

import { useEffect, useRef, useState } from "react";
import { FormElementInstance, SubmitFunction } from "../FormElements";
import { Input } from "../ui/input";
import { Label } from "../../components/ui/label";
import { CustomInstance } from "./CalculationField";
import { formValueStore } from "../formValueStore";

function getCellNumericValue(raw: string | number): number {
  if (raw === null || raw === undefined || raw === "") return 0;

  // If it was [number:xxx], strip it
  if (typeof raw === "string" && raw.startsWith("[number:")) {
    const v = raw.match(/^\[number:(.*?)\]$/)?.[1];
    return parseFloat(v || "0") || 0;
  }

  // Just parse as float (works for plain "18" strings)
  return parseFloat(raw as string) || 0;
}

function evaluateFormula(formula: string, values: Record<string, string>): string {
  if (!formula) return "";

  let expression = formula;

  // --- TABLE CELLS {fieldId[row][col]} ---
  expression = expression.replace(
    /\{(\w+)\[(\d+)\]\[(\d+)\]\}/g,
    (_, fieldId, row, col) => {
      let table: any = values[fieldId];

      // Parse JSON string if needed
      if (typeof table === "string") {
        try {
          table = JSON.parse(table);
        } catch {
          return "0";
        }
      }

      if (!Array.isArray(table)) return "0";

      const cell = table?.[Number(row)]?.[Number(col)] ?? "";
      return getCellNumericValue(cell).toString();
    }
  );

  // --- SIMPLE FIELD {fieldId} ---
  expression = expression.replace(/\{(\w+)\}/g, (_, fieldId) => {
    let value = values[fieldId];

    // Parse JSON for tables too (fallback to first cell maybe?)
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          // optional: take first cell as numeric
          value = parsed[0]?.[0] ?? 0;
        }
      } catch {
        // value remains as-is
      }
    }

    return getCellNumericValue(value).toString();
  });

  // Replace logical operators
  expression = expression.replace(/\band\b/gi, "&&").replace(/\bor\b/gi, "||");

  try {
    return String(
      Function(
        "deg",
        "rad",
        "ROUND",
        `"use strict"; return (${expression})`
      )(
        (degValue: number) => (degValue * Math.PI) / 180,
        (radValue: number) => (radValue * 180) / Math.PI,
        (value: number, digits: number = 0) => {
          const factor = Math.pow(10, digits);
          return Math.round(value * factor) / factor;
        }
      )
    );
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