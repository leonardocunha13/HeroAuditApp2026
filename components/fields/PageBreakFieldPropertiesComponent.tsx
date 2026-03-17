"use client";

import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import useDesigner from "../hooks/useDesigner";
import { FormElementInstance } from "../FormElements";

export function PropertiesComponent({
  elementInstance,
}: {
  elementInstance: FormElementInstance;
}) {
  const { elements, updateElement } = useDesigner();

  const liveElement =
    elements.find((el: FormElementInstance) => el.id === elementInstance.id) ?? elementInstance;

  const nextPageOrientation =
    liveElement.extraAttributes?.nextPageOrientation ?? "default";

  function updateOrientation(value: "portrait" | "landscape" | "default") {
    updateElement(liveElement.id, {
      ...liveElement,
      extraAttributes: {
        ...(liveElement.extraAttributes ?? {}),
        nextPageOrientation: value,
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label>Next page orientation</Label>
        <Select value={nextPageOrientation} onValueChange={updateOrientation}>
          <SelectTrigger>
            <SelectValue placeholder="Select orientation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Use document default</SelectItem>
            <SelectItem value="portrait">Portrait</SelectItem>
            <SelectItem value="landscape">Landscape</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        This page break starts a new PDF page. The content below it will use the selected orientation.
      </p>
    </div>
  );
}