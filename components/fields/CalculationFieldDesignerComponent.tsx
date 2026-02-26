"use client";

import { FormElementInstance } from "../FormElements";
import { Label } from "../../components/ui/label";
import { Input } from "../ui/input";
import { CustomInstance } from "./CalculationField";

export function DesignerComponent({
  elementInstance,
}: {
  elementInstance: FormElementInstance;
}) {
  const element = elementInstance as CustomInstance;

  return (
    <div className="flex flex-col gap-2 w-full">
      <Label>{element.extraAttributes.label}</Label>
      <Input readOnly disabled placeholder="Calculated value" />
      {element.extraAttributes.helperText && (
        <p className="text-muted-foreground text-sm">
          {element.extraAttributes.helperText}
        </p>
      )}
      <div className="absolute bottom-0 left-2 px-2 py-[2px] text-[10px] rounded bg-muted text-muted-foreground border">
        {element.id}
      </div>
    </div>
  );
}