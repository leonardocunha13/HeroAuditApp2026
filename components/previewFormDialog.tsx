import { FormElementInstance } from "./FormElements"; // ou de onde vem esse tipo
import { FormElements } from "./FormElements";

interface ViewFormClientProps {
  content: string;
}

export default function ViewFormClient({ content }: ViewFormClientProps) {
let elements: FormElementInstance[] = [];
try {
  elements = JSON.parse(content);
} catch {
  elements = [];
}

  return (
        <div className="bg-accent flex flex-col flex-grow items-center p-4 bg-[url(/paper.svg)] dark:bg-[url(/paper-dark.svg)] overflow-y-auto">
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
  );
}

