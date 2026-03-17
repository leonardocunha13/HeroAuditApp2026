"use client";

import {
  ElementsType,
  FormElement,
  FormElementInstance,
} from "../FormElements";
import { z } from "zod";
import { MdImage } from "react-icons/md";
import { DesignerComponent } from "./ImageFieldDesignerComponent";
import { FormComponent } from "./ImageFieldFormComponent";
import { PropertiesComponent } from "./ImageFieldPropertiesComponent";

const type: ElementsType = "ImageField";

export const defaultExtraAttributes = {
  label: "",
  imageUrl: "",
  position: "center" as "left" | "center" | "right",
  repeatOnPageBreak: false,
  preserveOriginalSize: false,
  width: 0,
  height: 0,
};

export const propertiesSchema = z.object({
  label: z.string().min(0).max(200),
  imageUrl: z.union([z.literal(""), z.string().url("Must be a valid URL")]),
  position: z.enum(["left", "center", "right"]),
  repeatOnPageBreak: z.boolean(),
  preserveOriginalSize: z.boolean(),
  width: z.number(),
  height: z.number(),
});

export const ImageFieldFormElement: FormElement = {
  type,
  construct: (id: string) => ({
    id,
    type,
    extraAttributes: {
      ...defaultExtraAttributes,
    },
    label: "Image Field",
    height: 0,
  }),
  designerBtnElement: {
    icon: MdImage,
    label: "Image field",
  },
  designerComponent: DesignerComponent,
  formComponent: FormComponent,
  propertiesComponent: PropertiesComponent,
  validate: () => true,
};

export type CustomInstance = FormElementInstance & {
  extraAttributes: typeof defaultExtraAttributes;
};