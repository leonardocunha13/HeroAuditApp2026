"use client";

import { Button } from "./ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogClose, DialogHeader, DialogDescription, DialogTitle } from "./ui/dialog";
import ViewFormClient from "./previewFormDialog"; // seu componente que recebe content
import { Cross2Icon } from "@radix-ui/react-icons";
import { MdPreview } from "react-icons/md";

interface FormViewerProps {
  content: string;
}

export default function FormViewer({ content }: FormViewerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={"outline"} className="w-[140px] md:w-[200px] text-sm md:text-md font-medium mt-2 gap-2">
          <MdPreview className="h-6 w-6" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="w-screen h-screen max-h-screen max-w-full flex flex-col p-0 pt-8 gap-0 opacity-100">
        <div className="flex justify-between items-center px-4 py-4 border-b opacity-100">
          <DialogHeader className="px-4 py-4 border-b">
            <DialogTitle>Form preview</DialogTitle>
            <DialogDescription>
              This is how your form will look to your users.
            </DialogDescription>
          </DialogHeader>
          <DialogClose className="mt-2 sm:mt-4 md:mt-8 relative rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <Cross2Icon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
        <ViewFormClient content={content} />
      </DialogContent>
    </Dialog>
  );
}
