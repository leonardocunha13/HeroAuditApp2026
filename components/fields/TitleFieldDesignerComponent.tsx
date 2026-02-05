"use client";

import {
  FormElementInstance,
} from "../FormElements";

import { CustomInstance } from "./TitleField";

export function DesignerComponent({
  elementInstance,
}: {
  elementInstance: FormElementInstance;
}) {
  const element = elementInstance as CustomInstance;
  const {
    title,
    backgroundColor = "#ffffff",
    textColor = "#000000",
    textAlign = "left",
  } = element.extraAttributes;

  const isTransparent =
    backgroundColor === "transparent" ||
    backgroundColor === "rgba(0,0,0,0)" ||
    backgroundColor === "#00000000";

  const isBlackText =
    textColor === "black" ||
    textColor === "#000000" ||
    textColor === "rgb(0, 0, 0)";

  const fallbackBgClass = isTransparent ? "dark:bg-gray-900" : "";
  const fallbackTextClass = isTransparent && isBlackText ? "text-black dark:text-white" : "";

  return (
    <div className="flex flex-col gap-2 w-full">
      
      <p
        className={`text-xl px-2 py-1 rounded ${fallbackBgClass} ${fallbackTextClass}`}
        style={{
          backgroundColor: isTransparent ? undefined : backgroundColor,
          color: isTransparent && isBlackText ? undefined : textColor,
          textAlign,
        }}
      >
        {title}
      </p>
    </div>
  );
}
