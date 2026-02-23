import { FormElement } from "./FormElements";
import { useDraggable } from "@dnd-kit/core";
import { Text } from "@aws-amplify/ui-react";  // Import Amplify UI components
import { Button } from "./ui/button";

function SidebarBtnElement({ formElement }: { formElement: FormElement }) {
  const draggable = useDraggable({
    id: `designer-btn-${formElement.type}`,
    data: {
      type: formElement.type,
      isDesignerBtnElement: true,
    },
  });

  if (!formElement?.designerBtnElement) return null;

  const { label, icon: Icon } = formElement.designerBtnElement;

  return (
    <Button
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      variant="ghost"
      className={`
        w-20 h-20 p-2 rounded-xl
        flex flex-col items-center justify-center gap-1
        border-border border-gray-300 dark:border-gray-600 
        bg-white  text-gray-900 dark:text-white
        bg-background hover:bg-muted
        transition-all duration-150
        cursor-grab
        ${draggable.isDragging ? "ring-2 ring-primary" : ""}
      
      hover:-translate-y-0.5 hover:shadow-md
      active:scale-95  `}
    >
      <Icon className="w-6 h-6 text-primary" />
      <Text className="text-xs text-center leading-tight dark:text-white">
        {label}
      </Text>
    </Button>
  );
}


export function SidebarBtnElementDragOverlay({ formElement }: { formElement: FormElement }) {
  const { label, icon: Icon } = formElement.designerBtnElement;

  return (
    <div className="w-20 h-20 p-2 rounded-xl bg-background border shadow-lg flex flex-col items-center justify-center gap-1">
      <Icon className="w-6 h-6 text-primary" />
      <Text className="text-xs text-center">{label}</Text>
    </div>
  );
}
export default SidebarBtnElement;
