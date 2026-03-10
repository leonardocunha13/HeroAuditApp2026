import { Button } from "./ui/button";
import { MdPreview } from "react-icons/md";
import useDesigner from "./hooks/useDesigner";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger, DialogClose, DialogHeader } from "./ui/dialog";
import { FormElements } from "./FormElements";
import { Cross2Icon } from "@radix-ui/react-icons";

function PreviewDialogBtn() {
  const { elements } = useDesigner();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={"outline"} className="gap-2">
          <MdPreview className="h-6 w-6" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="w-screen h-screen max-h-screen max-w-full flex flex-col p-0 pt-8 gap-0 opacity-100">
        <DialogHeader className="px-4 py-4 border-b flex flex-row items-start justify-between">
          <div>
            <DialogTitle>Form preview</DialogTitle>
            <DialogDescription>
              This is how your form will look to your users.
            </DialogDescription>
          </div>

          <DialogClose className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
            <Cross2Icon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>
        <div className="bg-accent flex flex-col flex-grow items-center p-4  overflow-y-auto">
          <div className="max-w-[1500px] flex flex-wrap w-full gap-4 p-8 bg-background rounded-2xl content-start">
            {elements.map((element) => {
              const FormComponent = FormElements[element.type].formComponent;

              return (
                <div
                  key={element.id}
                  className="flex-none"
                  style={{
                    width: `calc(${element.width || 100}% - 1rem)`,
                  }}
                >
                  <FormComponent elementInstance={element} />
                </div>
              );
            })}
          </div>
        </div>
        <DialogTitle className="sr-only">Preview Button</DialogTitle>
        <DialogDescription className="sr-only">
          This dialog contains the details of Preview Button.
        </DialogDescription>
      </DialogContent>

    </Dialog>
  );
}

export default PreviewDialogBtn;
