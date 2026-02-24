"use client";

import { z } from "zod";
import {
  ElementsType,
  FormElement,
  FormElementInstance,
} from "../FormElements";
import { FaCalculator } from "react-icons/fa";
import { DesignerComponent } from "./CalculationFieldDesignerComponent";
import { FormComponent } from "./CalculationFieldFormComponent";
import { PropertiesComponent } from "./CalculationFieldPropertiesComponent";

const type: ElementsType = "CalculationField";

export const extraAttributes = {
  label: "Calculation",
  helperText: "",
  formula: "", // important
};

export const propertiesSchema = z.object({
  label: z.string().min(2).max(50),
  helperText: z.string().max(200),
  formula: z.string().min(1, "Formula required"),
});

export const CalculationFieldFormElement: FormElement = {
  type,

  construct: (id: string) => ({
    id,
    type,
    label: extraAttributes.label,
    extraAttributes,
  }),

  designerBtnElement: {
    icon: FaCalculator,
    label: "Calculation",
  },

  designerComponent: DesignerComponent,
  formComponent: FormComponent,
  propertiesComponent: PropertiesComponent,

  validate: () => true,
};

export type CustomInstance = FormElementInstance & {
  extraAttributes: typeof extraAttributes;
};