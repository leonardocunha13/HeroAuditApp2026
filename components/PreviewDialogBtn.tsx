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
        <DialogHeader className="px-4 py-4 border-b">
          <DialogTitle>Form preview</DialogTitle>
          <DialogDescription>
            This is how your form will look to your users.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-between items-center px-4 py-4 border-b opacity-100">
          
          <DialogClose className="mt-2 sm:mt-4 md:mt-8 relative rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <Cross2Icon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
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
