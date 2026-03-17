"use client";

import { FormElementInstance } from "../FormElements";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CustomInstance } from "./ParagraphField";

export function DesignerComponent({
  elementInstance,
}: {
  elementInstance: FormElementInstance;
}) {
  const element = elementInstance as CustomInstance;
  const contentRef = useRef<HTMLDivElement>(null);

  const [height, setHeight] = useState<number>(120);
  const [align, setAlign] = useState<"justify" | "left" | "center" | "right">("left");

  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(element.extraAttributes.text || "", "text/html");
    const p = doc.querySelector("p");

    if (p?.style.textAlign) {
      setAlign(p.style.textAlign as "justify" | "left" | "center" | "right");
    } else {
      setAlign("left");
    }
  }, [element.extraAttributes.text]);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const updateHeight = () => {
      const measured = Math.max(el.scrollHeight);
      setHeight(measured);

      if (elementInstance.height !== measured) {
        elementInstance.height = measured;
      }
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(el);

    return () => observer.disconnect();
  }, [element.extraAttributes.text, elementInstance]);

  return (
    <div
      style={{
        minHeight: `${height}px`,
        width: "100%",
      }}
    >
      <div
        ref={contentRef}
        className={`
          w-full rounded-md border bg-background px-3 py-3 text-sm
          leading-6 break-words
          ${align === "center" ? "text-center" : ""}
          ${align === "right" ? "text-right" : ""}
          ${align === "justify" ? "text-justify" : ""}
        `}
        style={{
          minHeight: 70,
        }}
        dangerouslySetInnerHTML={{ __html: element.extraAttributes.text || "<p></p>" }}
      />
    </div>
  );
}