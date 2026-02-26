"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { FormElementInstance, FormElements } from "./FormElements";
import { Button } from "./ui/button";
import { HiCursorClick } from "react-icons/hi";
import { ImSpinner2 } from "react-icons/im";
import { toast } from "./ui/use-toast";
import { submitFormAction, SaveFormAfterTestAction, updateVisitCount } from "../actions/form";
import useUserAttributes from "./userAttributes";
import Link from "next/link";
import Logo from "./Logo";
import ThemeSwitcher from "./ThemeSwitcher";
import { useRouter } from "next/navigation";

function FormSubmitComponent({ formUrl, content }: { content: FormElementInstance[]; formUrl: string }) {
  const formValues = useRef<{ [key: string]: string }>({});
  const formErrors = useRef<{ [key: string]: boolean }>({});
  const [renderKey, setRenderKey] = useState(Date.now());
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const { attributes } = useUserAttributes();
  const userId = attributes?.sub;
  const [formtagId, setFormtagId] = useState<string | null>(null);
  const router = useRouter();

  // Save form progress
  const saveProgress = useCallback(async () => {
    if (!formtagId) {
      toast({
        title: "Missing form tag ID",
        description: "Unable to save progress without formtagId",
        variant: "destructive",
      });
      return;
    }
    try {
      const cleanData = JSON.parse(JSON.stringify(formValues.current));
      const formData = new FormData();
      formData.append("formId", formUrl);
      formData.append("formTagId", formtagId);
      formData.append("responses", JSON.stringify(cleanData));
      formData.append("formContent", JSON.stringify(content));

      await SaveFormAfterTestAction(formData);
      toast({
        title: "Progress saved",
        description: "Your progress has been saved successfully.",
        className: "bg-green-500 text-white",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Save failed",
        description: "Could not save your progress.",
        variant: "destructive",
      });
    }
  }, [formUrl, formtagId, content]);

  // Validate form fields
  const validateForm = useCallback(() => {
    if (!userId) return false;

    formErrors.current = {}; // Reset errors

    for (const field of content) {
      const value = formValues.current[field.id] || "";
      const valid = FormElements[field.type].validate(field, value);
      if (!valid) {
        formErrors.current[field.id] = true;
      }
    }

    return Object.keys(formErrors.current).length === 0;
  }, [content, userId]);

  // Update form value on input change
  const submitValue = useCallback((key: string, value: string) => {
    formValues.current[key] = value;
  }, []);

  // Load formtagId from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("formtagId");
    if (stored) setFormtagId(stored);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("formtagId");
    if (stored) setFormtagId(stored);

    // --- NEW: check if this form was already submitted ---
    if (stored) {
      const alreadySubmitted = sessionStorage.getItem(`submitted-${formUrl}-${stored}`);
      if (alreadySubmitted) {
        setSubmitted(true);
      }
    }
  }, [formUrl]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && formUrl && formtagId) {
        const alreadySubmitted = sessionStorage.getItem(`submitted-${formUrl}-${formtagId}`);
        if (alreadySubmitted) {
          setSubmitted(true);
        }
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [formUrl, formtagId]);
  // Update visit count & sessionStorage when formtagId or formUrl changes
  useEffect(() => {
    if (!formtagId) return;

    const uniqueKey = `visited-${formUrl}-${formtagId}-${Date.now()}`;
    updateVisitCount(formUrl);
    sessionStorage.setItem(uniqueKey, "true");
  }, [formUrl, formtagId]);

  useEffect(() => {
    const checkSubmission = () => {
      if (!formUrl || !formtagId) return;

      const alreadySubmitted = sessionStorage.getItem(
        `submitted-${formUrl}-${formtagId}`
      );

      if (alreadySubmitted) {
        setSubmitted(true);
      }
    };

    // Runs when tab becomes visible again (back button case)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkSubmission();
      }
    };

    // Runs when page restored from cache
    const handlePageShow = () => {
      checkSubmission();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [formUrl, formtagId]);


  // Save progress on unload and visibility change
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveProgress();
      e.preventDefault();
      e.returnValue = '';
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveProgress();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveProgress]);

  useEffect(() => {
    let navigating = false;

    const handlePopState = async (event: PopStateEvent) => {
      if (navigating) return;
      navigating = true;

      event.preventDefault();

      await saveProgress();

      // allow navigation after saving
      window.history.back();
    };

    // create history trap so back button triggers popstate
    window.history.pushState(null, "", window.location.href);

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [saveProgress]);

  // Pull down to save progress on touch devices (when at top)
  useEffect(() => {
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      if (touchEndY - touchStartY > 50 && window.scrollY === 0) {
        saveProgress();
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [saveProgress]);

  function getCellNumericValue(raw: string): number {
    if (!raw || typeof raw !== "string") return 0;
    const t = raw.trim();
    if (!t) return 0;
    if (t.startsWith("=")) return 0;

    if (t.startsWith("[number:")) {
      const v = t.match(/^\[number:(.*?)\]$/)?.[1]?.trim();
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }

    // any other tag
    if (t.startsWith("[")) return 0;

    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
  }

  function cellRefToIndexes(ref: string) {
    const match = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!match) return null;

    const letters = match[1].toUpperCase();
    const row = Number(match[2]) - 1;

    let col = 0;
    for (let i = 0; i < letters.length; i++) col = col * 26 + (letters.charCodeAt(i) - 64);
    col -= 1;

    return { row, col };
  }

  function evaluateTableFormula(
    formula: string,
    currentTable: string[][],
    allValues: Record<string, unknown>,
    visited = new Set<string>()
  ): string {
    if (!formula.startsWith("=")) return formula;

    if (visited.has(formula)) return "CIRC";
    visited.add(formula);

    let expression = formula.slice(1);

    // {fieldId}
    expression = expression.replace(/\{(\w+)\}/g, (_, fieldId) => {
      const value = allValues[fieldId];

      if (value === undefined || value === null) return "0";

      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return "0"; // tables require {table:A1}
          }
        } catch (e) {
        }
      }

      return String(parseFloat(String(value)) || 0);
    });

    // {TABLEID:A1}
    expression = expression.replace(/\{(\w+):([A-Z]+\d+)\}/g, (_, fieldId, cellRef) => {
      const tableValue = allValues[String(fieldId)];
      if (!tableValue) return "0";

      let table: string[][];
      try {
        table = typeof tableValue === "string" ? JSON.parse(tableValue) : (tableValue as string[][]);
      } catch {
        return "0";
      }
      if (!Array.isArray(table)) return "0";

      const pos = cellRefToIndexes(cellRef);
      if (!pos) return "0";

      const raw = table[pos.row]?.[pos.col] ?? "";
      if (typeof raw === "string" && raw.trim().startsWith("=")) {
        return evaluateTableFormula(raw.trim(), table, allValues, visited);
      }
      return String(getCellNumericValue(String(raw)));
    });

    // A1 references inside same table
    expression = expression.replace(/\b([A-Z]+\d+)\b/g, (_, cellRef) => {
      const pos = cellRefToIndexes(cellRef);
      if (!pos) return "0";

      const raw = currentTable[pos.row]?.[pos.col] ?? "";
      if (typeof raw === "string" && raw.trim().startsWith("=")) {
        return evaluateTableFormula(raw.trim(), currentTable, allValues, visited);
      }
      return String(getCellNumericValue(String(raw)));
    });

    expression = expression.replace(/\^/g, "**");

    try {
      const ROUND = (value: number, decimals = 0) => {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
      };
      const DEG = (rad: number) => (rad * 180) / Math.PI;
      const RAD = (deg: number) => (deg * Math.PI) / 180;

      const result = Function("Math", "ROUND", "DEG", "RAD", `"use strict"; return (${expression})`)(
        Math,
        ROUND,
        DEG,
        RAD
      );

      return String(result);
    } catch {
      return "ERR";
    }
  }
  // Form submission handler
  const submitForm = async () => {
    formErrors.current = {};
    if (!validateForm()) {
      setRenderKey(Date.now());
      toast({
        title: "Error",
        description: "Please check the form for errors.",
        variant: "destructive",
      });
      return;
    }

    try {
      const cleanData = JSON.parse(JSON.stringify(formValues.current));
      // Build lookup of element types
      const elementTypeById = new Map(content.map((el) => [el.id, el.type]));

      // Evaluate table formulas BEFORE saving
      for (const key of Object.keys(cleanData)) {
        if (elementTypeById.get(key) !== "TableField") continue;

        try {
          const table = JSON.parse(cleanData[key]);
          if (!Array.isArray(table)) continue;
          type TableCell = string | number | null;
          type TableRow = TableCell[];
          type TableData = TableRow[];

          const evaluatedTable: TableData = table.map((row: unknown) => {
            if (!Array.isArray(row)) return [];

            return row.map((cell: unknown) => {
              if (typeof cell === "string" && cell.trim().startsWith("=")) {
                const evaluated = evaluateTableFormula(
                  cell.trim(),
                  table as string[][],
                  cleanData
                );

                const n = Number(evaluated);
                return Number.isFinite(n) ? `[number:${n}]` : "[number:0]";
              }

              if (typeof cell === "string" || typeof cell === "number" || cell === null) {
                return cell;
              }

              return "";
            });
          });

          cleanData[key] = JSON.stringify(evaluatedTable);
        } catch {
          // ignore invalid tables
        }
      }
      const formData = new FormData();
      formData.append("userId", userId ?? "");
      formData.append("formId", formUrl);
      formData.append("responses", JSON.stringify(cleanData));
      formData.append("formContent", JSON.stringify(content));
      if (formtagId) formData.append("formTagId", formtagId);

      await submitFormAction(formData);
      if (formtagId) {
        sessionStorage.setItem(`submitted-${formUrl}-${formtagId}`, "true");
      }

      setSubmitted(true);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  // Save progress and navigate home
  const handleSaveAndGoHome = async () => {
    await saveProgress();
    router.push("/");
  };

  // Save progress and navigate to form
  const handleSaveAndGoToForm = async () => {
    await saveProgress();
    router.push(`/forms/${formUrl}`);
  };

  if (submitted) {
    return (
      <div className="flex justify-center w-full h-full items-center p-8">
        <div className="flex flex-col gap-6 flex-grow bg-background w-full h-full p-8 overflow-y-auto border shadow-xl shadow-blue-700 rounded">
          <h1 className="text-3xl font-bold text-primary">Form successfully submitted!</h1>
          <p className="text-muted-foreground text-lg">
            Thanks for your submission. You can safely close this page, go back to the form, or return to the home page.
          </p>
          <div className="flex gap-4">
            <Link
              href={`/forms/${formUrl}`}
              className="px-5 py-2 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md"
            >
              Go back to form
            </Link>
            <Link
              href="/"
              className="px-5 py-2 rounded-full text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md"
            >
              Return to homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }
  function buildRows(elements: FormElementInstance[]) {
    const rows: FormElementInstance[][] = [];
    let currentRow: FormElementInstance[] = [];
    let currentWidth = 0;

    elements.forEach(el => {
      const width = el.width || 100;

      if (currentWidth + width > 100) {
        rows.push(currentRow);
        currentRow = [];
        currentWidth = 0;
      }

      currentRow.push(el);
      currentWidth += width;
    });

    if (currentRow.length) rows.push(currentRow);

    return rows;
  }
  return (
    <div className="flex justify-center w-full h-full items-center p-8">
      {/* Top action bar */}
      <div className="fixed top-0 left-0 w-full z-50 bg-white border-b border-gray-200 dark:bg-background px-6 py-3 flex justify-between items-center shadow-md">
        <div className="flex gap-3 items-center">
          <button onClick={handleSaveAndGoHome} className="flex items-center h-10">
            <Logo />
          </button>
          <button
            onClick={handleSaveAndGoToForm}
            className="px-4 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm font-medium h-10"
          >
            Back to Form
          </button>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => startTransition(submitForm)} disabled={pending}>
            {!pending ? (
              <>
                <HiCursorClick className="mr-2" />
                Submit
              </>
            ) : (
              <ImSpinner2 className="animate-spin" />
            )}
          </Button>
          <Button onClick={saveProgress} disabled={pending} variant="outline">
            {!pending ? (
              <>
                <HiCursorClick className="mr-2" />
                Save
              </>
            ) : (
              <ImSpinner2 className="animate-spin" />
            )}
          </Button>
          <ThemeSwitcher />
        </div>
      </div>

      {/* Form content */}
      <div
        key={renderKey}
        className="flex flex-col gap-4 flex-grow bg-background w-full h-full p-8 overflow-y-auto border shadow-xl shadow-blue-700 rounded"
      >
        {buildRows(content).map((row, rowIndex) => (
          <div key={rowIndex} className="flex w-full gap-4">
            {row.map((element) => {
              const FormElement = FormElements[element.type].formComponent;

              return (
                <div
                  key={element.id}
                  style={{ width: `${element.width || 100}%` }}
                >
                  <FormElement
                    elementInstance={element}
                    submitValue={submitValue}
                    isInvalid={formErrors.current[element.id]}
                    defaultValue={formValues.current[element.id]}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default FormSubmitComponent;
