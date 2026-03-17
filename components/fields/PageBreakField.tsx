"use client";

import { ElementsType, FormElement } from "../FormElements";
import { RiFilePaper2Line } from "react-icons/ri";
import { DesignerComponent } from "./PageBreakFieldDesignerComponent";
import { FormComponent } from "./PageBreakFieldFormComponent";
import { PropertiesComponent } from "./PageBreakFieldPropertiesComponent";

const type: ElementsType = "PageBreakField";

export const PageBreakFieldFormElement: FormElement = {
  type,
  construct: (id: string) => ({
    id,
    type,
    label: "Page Break",
    height: 60,
    extraAttributes: {
      nextPageOrientation: "default",
      nextPageSize: "default",
    },
  }),
  designerBtnElement: {
    icon: RiFilePaper2Line,
    label: "Page Break",
  },
  designerComponent: DesignerComponent,
  formComponent: FormComponent,
  propertiesComponent: PropertiesComponent,
  validate: () => true,
};