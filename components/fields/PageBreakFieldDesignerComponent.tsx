"use client";

import { Label } from "../ui/label";
import clsx from "clsx";
import { FormElementInstance } from "../FormElements";

const pageBreakClass = clsx(
  "w-full border-t border-dashed border-gray-400 my-6"
);

export function DesignerComponent({
  elementInstance,
}: {
  elementInstance: FormElementInstance;
}) {
  const orientation =
    elementInstance?.extraAttributes?.nextPageOrientation ?? "default";

  return (
    <div className="flex flex-col gap-2 w-full">
      <Label className="text-muted-foreground">
        Page Break → next page: {orientation}
      </Label>
      <div className={pageBreakClass} />
    </div>
  );
}