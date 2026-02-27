"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { FormElementInstance, FormElements } from "./FormElements";
import { Button } from "./ui/button";
import { HiCursorClick } from "react-icons/hi";
import { toast } from "./ui/use-toast";
import { ImSpinner2 } from "react-icons/im";
import { SaveFormAfterTestAction, submitFormAction } from "../actions/form";
import useUserAttributes from "./userAttributes";
import Link from "next/link";
import ThemeSwitcher from "./ThemeSwitcher";
import Logo from "./Logo";
import { useRouter } from "next/navigation";

function ResumeTestRenderer({
  formId,
  elements,
  responses,
  formtag2Id,
}: {
  formId: string;
  formtag2Id: string;
  elements: FormElementInstance[];
  responses: { [key: string]: string };
}) {
  const formValues = useRef<{ [key: string]: string }>({ ...responses });
  const formErrors = useRef<{ [key: string]: boolean }>({});
  const [renderKey, setRenderKey] = useState(Date.now());
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { attributes } = useUserAttributes();
  const userId = attributes?.sub;
  const router = useRouter();

  const saveProgress = useCallback(async () => {
    if (!formtag2Id) {
      toast({
        title: "Missing form tag ID",
        description: "Cannot save progress without formtag2Id",
        variant: "destructive",
      });
      return;
    }

    try {
      const cleanData = JSON.parse(JSON.stringify(formValues.current));
      const formData = new FormData();
      formData.append("formId", formId);
      formData.append("formTagId", formtag2Id);
      formData.append("responses", JSON.stringify(cleanData));
      formData.append("formContent", JSON.stringify(elements));

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
  }, [formId, formtag2Id, elements]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveProgress();
      e.preventDefault();
      e.returnValue = "";
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveProgress();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [saveProgress]);

  const validateForm = useCallback(() => {
    if (!userId) return false;

    formErrors.current = {}; // Reset

    for (const field of elements) {
      const actualValue = formValues.current[field.id] || "";
      const valid = FormElements[field.type].validate(field, actualValue);
      if (!valid) {
        formErrors.current[field.id] = true;
      }
    }

    return Object.keys(formErrors.current).length === 0;
  }, [elements, userId]);

  const submitValue = useCallback((key: string, value: string) => {
    formValues.current[key] = value;
  }, []);

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

    if (!formtag2Id) {
      toast({
        title: "Missing form tag ID",
        description: "Cannot submit form without formtag2Id",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const cleanData = JSON.parse(JSON.stringify(formValues.current));
      const formData = new FormData();
      formData.append("userId", userId ?? "");
      formData.append("formId", formId);
      formData.append("formTagId", formtag2Id);
      formData.append("responses", JSON.stringify(cleanData));
      formData.append("formContent", JSON.stringify(elements));

      await submitFormAction(formData);
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Something went wrong during submission.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndGoHome = async () => {
    await saveProgress();
    router.push("/");
  };

  const handleSaveAndGoToForm = async () => {
    await saveProgress();
    router.push(`/forms/${formId}`);
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
              href={`/forms/${formId}`}
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
      <div className="fixed top-0 left-0 w-full z-50 bg-white border-b border-gray-200 dark:bg-background px-6 py-3 flex justify-between items-center shadow-md">
        {/* Logo + Back */}
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

        {/* Submit + Save + ThemeSwitcher */}
        <div className="flex gap-3">
          <Button onClick={submitForm} disabled={submitting}>
            {!submitting ? (
              <>
                <HiCursorClick className="mr-2" />
                Submit
              </>
            ) : (
              <ImSpinner2 className="animate-spin" />
            )}
          </Button>

          <Button onClick={saveProgress} variant="outline" disabled={submitting}>
            <>
              <HiCursorClick className="mr-2" />
              Save
            </>
          </Button>

          <ThemeSwitcher />
        </div>
      </div>

      <div
        key={renderKey}
        className="flex flex-col gap-4 flex-grow bg-background w-full h-full p-8 overflow-y-auto border shadow-xl shadow-blue-700 rounded"
      >
        {buildRows(elements).map((row, rowIndex) => (
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

export default ResumeTestRenderer;
