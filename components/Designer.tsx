"use client";

import { useState } from "react";
import DesignerSidebar from "./DesignerSideBar";
import {
  DragEndEvent,
  useDndMonitor,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

import useDesigner from "./hooks/useDesigner";
import {
  ElementsType,
  FormElementInstance,
  FormElements,
} from "./FormElements";
import { idGenerator } from "../lib/idGenerator";
import { BiSolidTrash } from "react-icons/bi";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

function Designer() {
  const { elements, addElement, selectedElement, setSelectedElement, setElements } = useDesigner();

  const droppable = useDroppable({
    id: "designer-drop-area",
    data: {
      isDesignerDropArea: true,
    },
  });

  useDndMonitor({
    onDragEnd: (event: DragEndEvent) => {
      const { active, over } = event;
      if (!active || !over) return;
      const isLeftZone = over.data?.current?.isLeftZone;
      const isRightZone = over.data?.current?.isRightZone;


      const isDesignerBtnElement = active.data?.current?.isDesignerBtnElement;
      const isDroppingOverDesignerDropArea = over.data?.current?.isDesignerDropArea;

      const droppingSidebarBtnOverDesignerDropArea = isDesignerBtnElement && isDroppingOverDesignerDropArea;

      // First scenario
      if (droppingSidebarBtnOverDesignerDropArea) {
        const type = active.data?.current?.type;
        const newElement = FormElements[type as ElementsType].construct(idGenerator());
        newElement.width = 100;
        newElement.height = newElement.height || 120;
        addElement(elements.length, newElement);
        return;
      }

      const isDroppingOverDesignerElementTopHalf = over.data?.current?.isTopHalfDesignerElement;

      const isDroppingOverDesignerElementBottomHalf = over.data?.current?.isBottomHalfDesignerElement;

      const isDroppingOverDesignerElement =
        isDroppingOverDesignerElementTopHalf || isDroppingOverDesignerElementBottomHalf;

      const droppingSidebarBtnOverDesignerElement = isDesignerBtnElement && isDroppingOverDesignerElement;

      // Second scenario — dropping beside an element
      if (droppingSidebarBtnOverDesignerElement) {
        const type = active.data?.current?.type;
        const newElement = FormElements[type as ElementsType].construct(idGenerator());

        const overId = over.data?.current?.elementId;
        const overIndex = elements.findIndex(el => el.id === overId);
        if (overIndex === -1) throw new Error("element not found");

        const updated = [...elements];

        // shrink existing element
        updated[overIndex] = {
          ...updated[overIndex],
          width: 50,
        };

        // new element also 50%
        newElement.width = 50;

        let insertIndex = overIndex;
        if (isDroppingOverDesignerElementBottomHalf) {
          insertIndex = overIndex + 1;
        }

        updated.splice(insertIndex, 0, newElement);

        setElements(updated);
        return;
      }

      if (isDesignerBtnElement && (isLeftZone || isRightZone)) {
        const type = active.data?.current?.type;
        const newElement = FormElements[type as ElementsType].construct(idGenerator());

        const overId = over.data?.current?.elementId;
        const overIndex = elements.findIndex(el => el.id === overId);

        const updated = [...elements];

        // shrink existing
        updated[overIndex] = {
          ...updated[overIndex],
          width: 50,
        };

        newElement.width = 50;

        let insertIndex = overIndex;

        if (isRightZone) insertIndex = overIndex + 1;

        updated.splice(insertIndex, 0, newElement);

        setElements(updated);
        return;
      }

      // Third scenario
      const isDraggingDesignerElement = active.data?.current?.isDesignerElement;

      const draggingDesignerElementOverAnotherDesignerElement =
        isDroppingOverDesignerElement && isDraggingDesignerElement;

      if (draggingDesignerElementOverAnotherDesignerElement) {
        const activeId = active.data?.current?.elementId;
        const overId = over.data?.current?.elementId;

        const activeIndex = elements.findIndex(el => el.id === activeId);
        const overIndex = elements.findIndex(el => el.id === overId);

        if (activeIndex === -1 || overIndex === -1) return;

        const updated = [...elements];
        const dragged = { ...updated[activeIndex] };

        // FIX 1️⃣ — restore width when moving vertically
        dragged.width = 100;

        // FIX 2️⃣ — restore width of its old neighbor if it had one
        const prev = updated[activeIndex - 1];
        const next = updated[activeIndex + 1];

        if (dragged.width === 50) {
          if (prev && prev.width === 50) {
            prev.width = 100;
          }
          if (next && next.width === 50) {
            next.width = 100;
          }
        }

        // remove dragged
        updated.splice(activeIndex, 1);

        let insertIndex = activeIndex < overIndex ? overIndex - 1 : overIndex;

        if (isDroppingOverDesignerElementBottomHalf) {
          insertIndex++;
        }

        updated.splice(insertIndex, 0, dragged);

        setElements(updated);
        return;
      }
      const isDraggingExisting = active.data?.current?.isDesignerElement;

      if (isDraggingExisting && (isLeftZone || isRightZone)) {
        const activeId = active.data?.current?.elementId;
        const overId = over.data?.current?.elementId;

        const activeIndex = elements.findIndex(el => el.id === activeId);
        const overIndex = elements.findIndex(el => el.id === overId);

        if (activeIndex === -1 || overIndex === -1) return;

        const updated = [...elements];

        const dragged = { ...updated[activeIndex] };

        // remove dragged first
        updated.splice(activeIndex, 1);

        // shrink both elements
        dragged.width = 50;
        updated[overIndex] = {
          ...updated[overIndex],
          width: 50,
        };

        let insertIndex = activeIndex < overIndex ? overIndex - 1 : overIndex;

        if (isRightZone) insertIndex = overIndex + 1;

        updated.splice(insertIndex, 0, dragged);

        setElements(updated);
        return;
      }
    },
  });

  return (
    <div className="flex w-full items-start h-full">
      <div
        className="p-4 w-full"
        onClick={() => {
          if (selectedElement) setSelectedElement(null);
        }}
      >
        <div
          ref={droppable.setNodeRef}
          className={cn(
            "max-w-[1500px] min-h-[500px] h-full m-auto rounded-xl flex flex-col flex-grow items-center justify-start flex-1 overflow-y-auto p-6 transition-shadow duration-200",
            "bg-white dark:bg-gray-800",
            // subtle glow normally
            "shadow-lg shadow-[#facc15]/50",
            // outline all around the container
            "ring-2 ring-[#facc15] ring-inset",
            droppable.isOver && "ring-4 ring-[#facc15] ring-inset shadow-[0_0_20px_#facc15]"
          )}
        >
          {!droppable.isOver && elements.length === 0 && (
            <div className="flex flex-grow w-full h-full items-center justify-center">
              <p className="text-3xl text-muted-foreground font-bold">
                Drop here
              </p>
            </div>
          )}

          {droppable.isOver && elements.length === 0 && (
            <div className="p-4 w-full">
              <div className="h-[300px] rounded-md bg-[#facc15]/20 dark:bg-[#facc15]/30 shadow-inner animate-pulse" />
            </div>
          )}

          {elements.length > 0 && (
            <div className="flex flex-wrap w-full gap-4 p-4 items-start content-start" data-designer-container>
              {elements.map((element) => (
                <DesignerElementWrapper key={element.id} element={element} />
              ))}
            </div>
          )}
        </div>
      </div>
      <DesignerSidebar />
    </div>
  );
}

function DesignerElementWrapper({ element }: { element: FormElementInstance }) {
  const { elements, setSelectedElement, addElement, setElements } = useDesigner();

  const [mouseIsOver, setMouseIsOver] = useState<boolean>(false);
  const topHalf = useDroppable({
    id: element.id + "-top",
    data: {
      type: element.type,
      elementId: element.id,
      isTopHalfDesignerElement: true,
      height: element.height,
    },
  });

  const bottomHalf = useDroppable({
    id: element.id + "-bottom",
    data: {
      type: element.type,
      elementId: element.id,
      isBottomHalfDesignerElement: true,
      height: element.height,
    },
  });
  const leftZone = useDroppable({
    id: element.id + "-left",
    data: {
      elementId: element.id,
      isLeftZone: true,
    },
  });

  const rightZone = useDroppable({
    id: element.id + "-right",
    data: {
      elementId: element.id,
      isRightZone: true,
    },
  });

  const draggable = useDraggable({
    id: element.id + "-drag-handler",
    data: {
      type: element.type,
      elementId: element.id,
      isDesignerElement: true,
      height: element.height,
    },
  });

  if (draggable.isDragging) return null; // temporary remove the element from designer

  const DesignerElement = FormElements[element.type].designerComponent;
  return (
    <div
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      className={cn(
        "relative flex flex-none shrink-0 text-foreground hover:cursor-pointer rounded-md ring-1 ring-accent ring-inset",
      )}
      style={{
        width: `calc(${element.width || 100}% - 1rem)`,
        minHeight: element.height || 120,
      }}

      onMouseEnter={() => {
        setMouseIsOver(true);
      }}
      onMouseLeave={() => {
        setMouseIsOver(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedElement(element);
      }}
    >
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-transparent hover:bg-primary/30"
        onMouseDown={(e) => {
          e.stopPropagation();

          const startX = e.clientX;
          const startWidth = element.width || 100;

          const onMove = (moveEvent: MouseEvent) => {
            const delta = moveEvent.clientX - startX;
            const container = e.currentTarget.closest("[data-designer-container]");
            const parentWidth = container?.clientWidth || 1;

            let newWidth = startWidth + (delta / parentWidth) * 50;
            newWidth = Math.max(20, Math.min(100, newWidth));

            const updated = elements.map(el =>
              el.id === element.id ? { ...el, width: newWidth } : el
            );

            setElements(updated);
          };

          const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          };

          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
      />
      <div ref={topHalf.setNodeRef} className="absolute w-full h-1/2 rounded-t-md" />
      <div ref={bottomHalf.setNodeRef} className="absolute  w-full bottom-0 h-1/2 rounded-b-md" />
      <div ref={leftZone.setNodeRef} className="absolute left-0 top-0 h-full w-1/4" />
      <div ref={rightZone.setNodeRef} className="absolute right-0 top-0 h-full w-1/4" />

      {mouseIsOver && (
        <>
          <div className="absolute right-0 h-full flex flex-row">
            <Button
              className="flex justify-center h-full border rounded-md rounded-r-none bg-blue-500 text-white"
              variant="outline"
              title="Duplicate"
              onClick={(e) => {
                e.stopPropagation();
                const clonedElement = {
                  ...element,
                  id: idGenerator(),
                  height: element.height || 120,
                };
                const currentIndex = elements.findIndex(el => el.id === element.id);
                addElement(currentIndex + 1, clonedElement);
              }}
            >
              ⧉
            </Button>

            <Button
              className="flex justify-center h-full border rounded-md rounded-l-none bg-red-500 text-white"
              variant="outline"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();

                const index = elements.findIndex(el => el.id === element.id);
                const prev = elements[index - 1];
                const next = elements[index + 1];

                let updated = elements.filter(el => el.id !== element.id);

                // if it was part of a side-by-side pair, expand the remaining neighbor
                if (element.width === 50) {
                  if (prev && prev.width === 50) {
                    updated = updated.map(el =>
                      el.id === prev.id ? { ...el, width: 100 } : el
                    );
                  } else if (next && next.width === 50) {
                    updated = updated.map(el =>
                      el.id === next.id ? { ...el, width: 100 } : el
                    );
                  }
                }

                setElements(updated);
              }}
            >
              <BiSolidTrash className="h-6 w-6" />
            </Button>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse">
            <p className="text-muted-foreground text-sm">Click for properties or drag to move</p>
          </div>
        </>
      )}
      {topHalf.isOver && (
        <div className="absolute top-0 w-full h-[6px] bg-[#facc15] rounded-b shadow-lg" />
      )}
      <div
        className={cn(
          "flex w-full items-start rounded-md px-4 py-2 pointer-events-none transition-all duration-200",
          "bg-gray-100 dark:bg-gray-700",
          mouseIsOver && "opacity-30"
        )}
      >
        <DesignerElement elementInstance={element} />
      </div>
      {bottomHalf.isOver && (
        <div className="absolute bottom-0 w-full h-[6px] bg-[#facc15] rounded-t shadow-lg" />
      )}
      {leftZone.isOver && (
        <div className="absolute left-0 top-0 h-full w-2 bg-[#facc15] shadow-lg" />
      )}
      {rightZone.isOver && (
        <div className="absolute right-0 top-0 h-full w-2 bg-[#facc15] shadow-lg" />
      )}
    </div>
  );
}

export default Designer;
