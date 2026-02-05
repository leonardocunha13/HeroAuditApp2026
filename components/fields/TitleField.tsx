"use client";

import {
  ElementsType,
  FormElement,
  FormElementInstance,
} from "../FormElements";
import { z } from "zod";
import { LuHeading1 } from "react-icons/lu";
import { DesignerComponent } from "./TitleFieldDesignerComponent";
import { FormComponent } from "./TitleFieldFormComponent";
import { PropertiesComponent } from "./TitleFieldPropertiesComponent";

const type: ElementsType = "TitleField";

const extraAttributes = {
  title: "Title field",
  backgroundColor: "#ffffff",
  textColor: "#000000",
  textAlign: "center" as "left" | "center" | "right",
  repeatOnPageBreak: false,
  fontSize: 24,
};

export const propertiesSchema = z.object({
  title: z.string().min(2).max(200),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  textAlign: z.enum(["left", "center", "right"]),
  noBackground: z.boolean().optional(),
  repeatOnPageBreak: z.boolean(),
  fontSize: z.number().min(8).max(96).optional(),
});

export const TitleFieldFormElement: FormElement = {
  type,
  construct: (id: string) => ({
    id,
    type,
    extraAttributes,
    label: "Title field", 
    height: 70,
  }),
  designerBtnElement: {
    icon: LuHeading1,
    label: "Title field",
  },
  designerComponent: DesignerComponent,
  formComponent: FormComponent,
  propertiesComponent: PropertiesComponent,

  validate: () => true,
};

export type CustomInstance = FormElementInstance & {
  extraAttributes: typeof extraAttributes;
};