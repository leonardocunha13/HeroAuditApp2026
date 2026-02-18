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

  // Save progress when formtagId or content changes
  useEffect(() => {
    if (formtagId && content.length > 0) {
      saveProgress();
    }
  }, [formtagId, content, saveProgress]);

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
      const formData = new FormData();
      formData.append("userId", userId ?? "");
      formData.append("formId", formUrl);
      formData.append("responses", JSON.stringify(cleanData));
      formData.append("formContent", JSON.stringify(content));
      if (formtagId) formData.append("formTagId", formtagId);

      await submitFormAction(formData);
      sessionStorage.setItem(`submitted-${formUrl}-${formtagId}`, "true");
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
        {content.map((element) => {
          const FormElement = FormElements[element.type].formComponent;
          return (
            <FormElement
              key={element.id}
              elementInstance={element}
              submitValue={submitValue}
              isInvalid={formErrors.current[element.id]}
              defaultValue={formValues.current[element.id]}
            />
          );
        })}
      </div>
    </div>
  );
}

export default FormSubmitComponent;
