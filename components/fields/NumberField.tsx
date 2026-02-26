"use client";

import { z } from "zod";
import {
  ElementsType,
  FormElement,
  FormElementInstance,

} from "../FormElements";
import { Bs123 } from "react-icons/bs";
import { DesignerComponent } from "./NumberFieldDesignerComponent";
import { FormComponent } from "./NumberFieldFormComponent";
import { PropertiesComponent } from "./NumberFieldPropertiesComponent";

const type: ElementsType = "NumberField";

export const extraAttributes = {
  label: "Number field",
  helperText: "Helper text",
  required: false,
  placeHolder: "0",
};

export const propertiesSchema = z.object({
  label: z.string().min(2).max(200),
  helperText: z.string().max(200),
  required: z.boolean().default(false).optional(),
  placeHolder: z.string().max(200),
});

export const NumberFieldFormElement: FormElement = {
  type,
  construct: (id: string) => ({
    id,
    type,
    label: extraAttributes.label, // Add the label property
    extraAttributes,
  }),
  designerBtnElement: {
    icon: Bs123,
    label: "Number Field",
  },
  designerComponent: DesignerComponent,
  formComponent: FormComponent,
  propertiesComponent: PropertiesComponent,

  validate: (
    formElement: FormElementInstance,
    currentValue: string,
  ): boolean => {
    const element = formElement as CustomInstance;
    if (element.extraAttributes.required) {
      return currentValue.length > 0;
    }

    return true;
  },
};

export type CustomInstance = FormElementInstance & {
  extraAttributes: typeof extraAttributes;
};