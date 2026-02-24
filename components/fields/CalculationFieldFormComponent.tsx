"use client";

import { useEffect, useRef, useState } from "react";
import { FormElementInstance, SubmitFunction } from "../FormElements";
import { Input } from "../ui/input";
import { Label } from "../../components/ui/label";
import { CustomInstance } from "./CalculationField";
import { formValueStore } from "../formValueStore";

function evaluateFormula(formula: string, values: Record<string, string>) {
  if (!formula) return "";

  let expression = formula;

  // Replace {ID} with numeric values
  Object.entries(values).forEach(([id, value]) => {
    const numeric = parseFloat(value) || 0;
    expression = expression.replaceAll(`{${id}}`, numeric.toString());
  });

  try {
    // Define helper functions:
    // deg(x) converts degrees → radians
    // rad(x) converts radians → degrees
    return String(
      Function(
        "deg",
        "rad",
        `"use strict"; return (${expression})`
      )(
        (degValue: number) => (degValue * Math.PI) / 180,
        (radValue: number) => (radValue * 180) / Math.PI
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