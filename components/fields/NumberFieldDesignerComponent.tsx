"use client";

import {
  FormElementInstance,
} from "../FormElements";

import { Input } from "../ui/input";
import { Label } from "../../components/ui/label";
import { CustomInstance } from "./NumberField";

export function DesignerComponent({
  elementInstance,
}: {
  elementInstance: FormElementInstance;
}) {
  const element = elementInstance as CustomInstance;
  const { label, required, placeHolder, helperText } = element.extraAttributes;
  return (
    <div className="flex flex-col gap-2 w-full">
      <Label>
        {label}
        {required && "*"}
      </Label>
      <Input readOnly disabled type="number" placeholder={placeHolder} />
      {helperText && (
        <p className="text-muted-foreground text-[0.8rem]">{helperText}</p>
      )}
      <div className="absolute bottom-0 left-2 px-2 py-[2px] text-[10px] rounded bg-muted text-muted-foreground border">
        {element.id}
      </div>
    </div>
  );
}