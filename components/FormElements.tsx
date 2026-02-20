import { CheckboxFieldFormElement } from "./fields/CheckboxField";
import { DateFieldFormElement } from "./fields/DateField";
import { NumberFieldFormElement } from "./fields/NumberField";
import { ParagprahFieldFormElement } from "./fields/ParagraphField";
import { SelectFieldFormElement } from "./fields/SelectField";
import { SeparatorFieldFormElement } from "./fields/SeparatorField";
import { SpacerFieldFormElement } from "./fields/SpacerField";
import { TextAreaFormElement } from "./fields/TextAreaField";
//import { TextFieldFormElement } from "./fields/TextField";
import { TitleFieldFormElement } from "./fields/TitleField";
import { TableFieldFormElement } from "./fields/TableField";
import { ImageFieldFormElement } from "./fields/ImageField";
import { PageBreakFieldFormElement } from "./fields/PageBreakField";
import { CameraFieldFormElement } from "./fields/CameraField";


export type ElementsType =
  //| "TextField"
  | "TitleField"
  | "ParagraphField"
  | "SeparatorField"
  | "SpacerField"
  | "NumberField"
  | "TextAreaField"
  | "DateField"
  | "SelectField"
  | "CheckboxField"
  | "TableField"
  | "ImageField"
  | "PageBreakField"
  | "CameraField";


export type SubmitFunction = (key: string, value: string) => void;

export type FormElement = {
  type: ElementsType;

  construct: (id: string) => FormElementInstance;

  designerBtnElement: {
    icon: React.ElementType;
    label: string;
  };

  designerComponent: React.FC<{
    elementInstance: FormElementInstance;
  }>;
  formComponent: React.FC<{
    elementInstance: FormElementInstance;
    submitValue?: SubmitFunction;
    isInvalid?: boolean;
    defaultValue?: string;
    readOnly?: boolean;
    pdf?: boolean;
  }>;
  propertiesComponent: React.FC<{
    elementInstance: FormElementInstance;
  }>;

  validate: (formElement: FormElementInstance, currentValue: string) => boolean;
};

interface TextFieldExtraAttributes {
  label?: string;
  placeHolder?: string;
  helperText?: string;
  required?: boolean;
  repeatOnPageBreak?: boolean;
  position?: string;
  imageUrl?: string;
  text?: string;
  options?: string[];
  height?: number;
  data?: string[][];
  rows?: number;
  columns?: number;
  columnHeaders?: string[];
  title?: string;
  backgroundColor?: string;
  textColor?: string;
  textAlign?: string;
  preserveOriginalSize?: boolean;
  width?: number;
  content?: string;
  headerRowIndexes?: number[];
  fontSize?: number;
}

export type FormElementInstance = {
  id: string;
  type: ElementsType;
  extraAttributes?: TextFieldExtraAttributes;
  label: string;
  height?: number;
  width?: number;
};

type FormElementsType = {
  [key in ElementsType]: FormElement;
};
export const FormElements: FormElementsType = {
  //TextField: TextFieldFormElement,
  TitleField: TitleFieldFormElement,
  ParagraphField: ParagprahFieldFormElement,
  SeparatorField: SeparatorFieldFormElement,
  SpacerField: SpacerFieldFormElement,
  NumberField: NumberFieldFormElement,
  TextAreaField: TextAreaFormElement,
  DateField: DateFieldFormElement,
  SelectField: SelectFieldFormElement,
  CheckboxField: CheckboxFieldFormElement,
  TableField: TableFieldFormElement,
  ImageField: ImageFieldFormElement,
  PageBreakField: PageBreakFieldFormElement,
  CameraField: CameraFieldFormElement,
};

