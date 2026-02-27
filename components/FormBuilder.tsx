'use client';

import { useCallback, useEffect, useState } from "react";
import PreviewDialogBtn from "./PreviewDialogBtn";
import Designer from "./Designer";
import {
    DndContext,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import DragOverlayWrapper from "./DragOverlayWrapper";
import useDesigner from "./hooks/useDesigner";
import PublishFormBtn from "./PublishFormBtn";
import SaveFormBtn from "./SaveFormBtn";
import { ImSpinner2 } from "react-icons/im";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { toast } from "./ui/use-toast";
import Link from "next/link";
import { BsArrowLeft, BsArrowRight } from "react-icons/bs";
import { type Schema } from '../amplify/data/resource';
import PreviewPDFDialogBtn from "./PreviewPDFDialogBtn";
import { saveFormAction } from "../actions/form";

type Form = Schema['Form']['type'];

function FormBuilder({ formID, form, equipmentName, clientName, formName, revision }: { formID: string, form: Form, equipmentName: string, clientName: string, formName: string, revision: number }) {
    const { setElements, setSelectedElement } = useDesigner();
    const [isReady, setIsReady] = useState(false);
    const { elements } = useDesigner();
    const mouseSensor = useSensor(MouseSensor, {
        activationConstraint: { distance: 10 },
    });
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: { delay: 300, tolerance: 5 },
    });
    const sensors = useSensors(mouseSensor, touchSensor);

    const saveProgress = useCallback(async () => {
        if (!formID) {
            toast({
                title: "Missing form tag ID",
                description: "Unable to save progress without Form ID",
                variant: "destructive",
            });
            return;
        }
        try {
            const formData = new FormData();
            formData.append("id", formID);  // Include the form ID
            formData.append("content", JSON.stringify(elements));  // Include the form content

            await saveFormAction(formData);
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
    }, [formID, elements]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            saveProgress();
            e.preventDefault();
            e.returnValue = '';
        };

        const handlePopState = async (event: PopStateEvent) => {
            event.preventDefault();
            await saveProgress();
            window.history.back();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [saveProgress]);

    useEffect(() => {
        if (!isReady) {
            const elements = JSON.parse(form.content ?? "[]");
            setElements(elements);
            setSelectedElement(null);
            const readyTimeout = setTimeout(() => setIsReady(true), 500);
            return () => clearTimeout(readyTimeout);
        }
    }, [form, setElements, isReady, setSelectedElement]);
    

    if (!isReady) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full">
                <ImSpinner2 className="animate-spin h-12 w-12" />
            </div>
        );
    }

    //const shareUrl = `${window.location.origin}/submit/${formID}`;
    const useURL = `${window.location.origin}/forms/${formID}`

    if (form.published) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full">
                <div className="max-w-md">
                    <div className="space-y-4 text-center">
                        <h2 className="text-3xl font-bold text-green-600 flex justify-center items-center gap-2">
                            Form Published!
                        </h2>
                        <h2 className="text-2xl font-semibold">Share this form</h2>
                        <h3 className="text-lg text-muted-foreground border-b pb-6">
                            Anyone with the link can view and submit the form
                        </h3>
                    </div>

                    <div className="my-4 flex flex-col gap-2 items-center w-full border-b pb-4">

                        <Input className="w-full" readOnly value={useURL} />

                        <Button
                            className="mt-2 w-full"
                            onClick={() => {
                                navigator.clipboard.writeText(useURL);
                                toast({
                                    title: "Copied!",
                                    description: "Link copied to clipboard",
                                });
                            }}
                        >
                            Copy link
                        </Button>
                    </div>
                    <div className="flex justify-between">
                        <Button variant={"link"} asChild>
                            <Link href={"/"} className="gap-2">
                                <BsArrowLeft />
                                Go back home
                            </Link>
                        </Button>
                        <Button variant={"link"} asChild>
                            <Link href={`/forms/${formID}`} className="gap-2">
                                Form details
                                <BsArrowRight />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <DndContext sensors={sensors}>
            <main className="flex flex-col w-full">
                <nav className="flex justify-between border-b-2 p-4 gap-3 items-center">
                    <h2 className="truncate font-medium">
                        <span className="text-muted-foreground mr-2">Form:</span>
                        {formName}
                    </h2>
                    <h2 className="truncate font-medium">
                        <span className="text-muted-foreground mr-2">Client:</span>
                        {clientName}
                    </h2>
                    <h2 className="truncate font-medium">
                        <span className="text-muted-foreground mr-2">Equipment Name:</span>
                        {equipmentName}
                    </h2>
                    <div className="flex items-center gap-2">
                        <PreviewDialogBtn />
                        <PreviewPDFDialogBtn id={formID} formName={formName} revision={revision} />
                        {!form.published && <SaveFormBtn id={formID} />}
                        <PublishFormBtn id={formID} />
                    </div>
                </nav>
                <div className="flex w-full flex-grow relative min-h-0 bg-accent">
                    <Designer />
                </div>
            </main>
            <DragOverlayWrapper />
        </DndContext>
    );
}

export default FormBuilder;
