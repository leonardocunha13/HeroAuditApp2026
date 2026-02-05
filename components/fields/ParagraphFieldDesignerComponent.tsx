"use client";

import {
  FormElementInstance,
} from "../FormElements";
import { useEffect, useRef, useState } from "react";
import { CustomInstance } from "./ParagraphField";


export function DesignerComponent({ elementInstance }: { elementInstance: FormElementInstance }) {
  const element = elementInstance as CustomInstance;
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');
   useEffect(() => {
    // Detect alignment from first paragraph
    const parser = new DOMParser();
    const doc = parser.parseFromString(element.extraAttributes.text, 'text/html');
    const p = doc.querySelector('p');
    if (p?.style.textAlign) {
      setAlign(p.style.textAlign as 'left' | 'center' | 'right');
    }
  }, [element.extraAttributes.text]);

  useEffect(() => {
    if (!contentRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const contentHeight = Math.round(entry.contentRect.height + 50);
        if (contentHeight !== elementInstance.height) {
          elementInstance.height = contentHeight;
          setHeight(contentHeight);
        }
      }
    });

    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [elementInstance]);

return (
    <div style={{ height: `${height}px` }}>
      <div
        ref={contentRef}
        className={`p-2 border rounded-md w-full text-sm break-words whitespace-pre-wrap min-h-[60px] ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : ''}`}
        dangerouslySetInnerHTML={{ __html: element.extraAttributes.text }}
      />
    </div>
  );
}