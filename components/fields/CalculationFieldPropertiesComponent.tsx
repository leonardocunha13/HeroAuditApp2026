"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormElementInstance } from "../FormElements";
import useDesigner from "../hooks/useDesigner";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { FormulaEditor } from "../FormulaEditor";
import { Listbox, ListboxOption, ListboxOptions, ListboxButton } from "@headlessui/react";
import { useState } from "react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/solid";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "../../components/ui/form";
import {
  CustomInstance,
  propertiesSchema,
} from "./CalculationField";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

type FormSchema = z.infer<typeof propertiesSchema>;

export function PropertiesComponent({
  elementInstance,
}: {
  elementInstance: FormElementInstance;
}) {
  const element = elementInstance as CustomInstance;
  const { updateElement, elements } = useDesigner();
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const numericFields = elements.filter(
    (el) => el.type === "NumberField"
  );

  const calculationFields = elements.filter(
    (el) => el.type === "CalculationField" && el.id !== element.id
  );

  const tableFields = elements.filter(
    (el) => el.type === "TableField"
  );
  const allSources = [...numericFields, ...calculationFields, ...tableFields];
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [selectedTableField, setSelectedTableField] = useState<FormElementInstance | null>(null);
  const [rowIndex, setRowIndex] = useState(0);
  const [colIndex, setColIndex] = useState(0);
  const form = useForm<FormSchema>({
    resolver: zodResolver(propertiesSchema),
    defaultValues: element.extraAttributes,
  });

  useEffect(() => {
    form.reset(element.extraAttributes);
  }, [element]);

  function applyChanges(values: FormSchema) {
    updateElement(element.id, {
      ...element,
      extraAttributes: values,
    });
  }

  const insert = (text: string) => {
    const current = form.getValues("formula");
    form.setValue("formula", current + text);
    applyChanges(form.getValues());
  };

  return (
    <Form {...form}>
      <form
        onBlur={form.handleSubmit(applyChanges)}
        className="space-y-4"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">This calculation field uses values from number & calculation fields. Only numeric values will be calculated correctly.</p>

        {/* LABEL */}
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* FORMULA INPUT */}
        <FormField
          control={form.control}
          name="formula"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Formula</FormLabel>
              <FormControl>
                <FormulaEditor
                  value={field.value}
                  onChange={(val) => {
                    field.onChange(val);
                    applyChanges({ ...form.getValues(), formula: val });
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <p className="text-xs text-muted-foreground mb-3">
          Fields must be inserted using curly braces like {"{FieldID}"}.
          Text outputs must be wrapped in quotes.
        </p>
        {/* NUMBER FIELD PICKER AS DROPDOWN */}
        <Listbox
          value={selectedFieldId}
          onChange={(id: string) => {
            const selectedField = allSources.find(f => f.id === id);
            if (!selectedField) return;

            if (selectedField.type === "TableField") {
              setSelectedTableField(selectedField);
              setRowIndex(0);
              setColIndex(0);
              setTablePickerOpen(true);
            } else {
              insert(`{${selectedField.id}}`);
            }

            setSelectedFieldId("");
          }}
        >
          <div className="relative mt-1">
            <ListboxButton className="relative w-full cursor-default rounded border bg-white dark:bg-gray-800 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus:ring-2 focus:ring-[#facc15] sm:text-sm text-gray-900 dark:text-gray-100">
              {selectedFieldId
                ? allSources.find(f => f.id === selectedFieldId)?.extraAttributes?.label
                : "-- Select Field --"}
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400 dark:text-gray-300" aria-hidden="true" />
              </span>
            </ListboxButton>

            <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-20 focus:outline-none sm:text-sm">

              {/* NUMERIC */}
              {numericFields.length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                    Numeric Fields
                  </div>

                  {numericFields.map((f) => {
                    const label = f.extraAttributes?.label || f.id;
                    return (
                      <ListboxOption
                        key={f.id}
                        value={f.id}
                        className="relative cursor-default select-none py-2 pl-3 pr-9 hover:bg-[#facc15] hover:text-white"
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? "font-semibold" : ""}`}>
                              {label} ({f.id})
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#facc15]">
                                <CheckIcon className="h-5 w-5" />
                              </span>
                            )}
                          </>
                        )}
                      </ListboxOption>
                    );
                  })}
                </>
              )}

              {/* CALCULATIONS */}
              {calculationFields.length > 0 && (
                <>
                  <div className="px-3 py-1 mt-2 text-xs font-semibold text-gray-500 uppercase">
                    Calculation Fields
                  </div>

                  {calculationFields.map((f) => {
                    const label = f.extraAttributes?.label || f.id;
                    return (
                      <ListboxOption
                        key={f.id}
                        value={f.id}
                        className="relative cursor-default select-none py-2 pl-3 pr-9 hover:bg-[#facc15] hover:text-white"
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? "font-semibold" : ""}`}>
                              {label} ({f.id})
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#facc15]">
                                <CheckIcon className="h-5 w-5" />
                              </span>
                            )}
                          </>
                        )}
                      </ListboxOption>
                    );
                  })}
                </>
              )}

              {/* TABLES */}
              {tableFields.length > 0 && (
                <>
                  <div className="px-3 py-1 mt-2 text-xs font-semibold text-gray-500 uppercase">
                    Table Fields
                  </div>

                  {tableFields.map((f) => {
                    const label = f.extraAttributes?.label || f.id;
                    return (
                      <ListboxOption
                        key={f.id}
                        value={f.id}
                        className="relative cursor-default select-none py-2 pl-3 pr-9 hover:bg-[#facc15] hover:text-white"
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? "font-semibold" : ""}`}>
                              {label} ({f.id})
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#facc15]">
                                <CheckIcon className="h-5 w-5" />
                              </span>
                            )}
                          </>
                        )}
                      </ListboxOption>
                    );
                  })}
                </>
              )}

            </ListboxOptions>
          </div>
        </Listbox>
        <div className="flex justify-end">
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                Formula Guide
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Formula Reference Guide</DialogTitle>
              </DialogHeader>

              <div className="mt-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Operator</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">Example</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">

                    {/* BASIC */}
                    <tr>
                      <td className="p-2 font-mono">+</td>
                      <td className="p-2">Add</td>
                      <td className="p-2 font-mono">{`{price} + {fee}`}</td>
                    </tr>

                    <tr>
                      <td className="p-2 font-mono">-</td>
                      <td className="p-2">Subtract</td>
                      <td className="p-2 font-mono">{`{hours} - {breaks}`}</td>
                    </tr>

                    <tr>
                      <td className="p-2 font-mono">*</td>
                      <td className="p-2">Multiply</td>
                      <td className="p-2 font-mono">{`{qty} * {price}`}</td>
                    </tr>

                    <tr>
                      <td className="p-2 font-mono">/</td>
                      <td className="p-2">Divide</td>
                      <td className="p-2 font-mono">{`{people} / {tables}`}</td>
                    </tr>

                    <tr>
                      <td className="p-2 font-mono">^</td>
                      <td className="p-2">Power</td>
                      <td className="p-2 font-mono">{`Math.pow({interest}, {rate})`}</td>
                    </tr>

                    {/* CONDITIONAL */}
                    <tr>
                      <td className="p-2 font-mono">? :</td>
                      <td className="p-2">Conditional</td>
                      <td className="p-2 font-mono">
                        {`{age} == 18 ? "You are 18" : "Not 18"`}
                      </td>
                    </tr>

                    {/* COMPARISONS */}
                    <tr>
                      <td className="p-2 font-mono">==</td>
                      <td className="p-2">Equal</td>
                      <td className="p-2 font-mono">{`{age} == 18`}</td>
                    </tr>

                    <tr>
                      <td className="p-2 font-mono">!=</td>
                      <td className="p-2">Not equal</td>
                      <td className="p-2 font-mono">{`{age} != 18`}</td>
                    </tr>

                    <tr>
                      <td className="p-2 font-mono">&lt;</td>
                      <td className="p-2">Less than</td>
                      <td className="p-2 font-mono">{`{score} < 10 ? "Low" : "High"`}</td>
                    </tr>

                    <tr>
                      <td className="p-2 font-mono">&gt;</td>
                      <td className="p-2">Greater than</td>
                      <td className="p-2 font-mono">{`{score} > 10`}</td>
                    </tr>

                    <tr>
                      <td className="p-2 font-mono">&lt;=</td>
                      <td className="p-2">Less or equal</td>
                      <td className="p-2 font-mono">{`{hours} <= 7`}</td>
                    </tr>

                    <tr>
                      <td className="p-2 font-mono">&gt;=</td>
                      <td className="p-2">Greater or equal</td>
                      <td className="p-2 font-mono">{`{hours} >= 7`}</td>
                    </tr>

                    {/* LOGIC */}
                    <tr>
                      <td className="p-2 font-mono">and</td>
                      <td className="p-2">Logical AND</td>
                      <td className="p-2 font-mono">
                        {`{age} > 18 and {age} < 65 ? "Adult" : "Other"`}
                      </td>
                    </tr>

                    <tr>
                      <td className="p-2 font-mono">or</td>
                      <td className="p-2">Logical OR</td>
                      <td className="p-2 font-mono">
                        {`{priority} == 1 or {priority} == 2 ? "High" : "Low"`}
                      </td>
                    </tr>

                    {/* TRIG */}
                    <tr>
                      <td className="p-2 font-mono">deg()</td>
                      <td className="p-2">Degrees → Radians</td>
                      <td className="p-2 font-mono">{`Math.sin(deg({angle}))`}</td>
                    </tr>

                    <tr>
                      <td className="p-2 font-mono">rad()</td>
                      <td className="p-2">Radians → Degrees</td>
                      <td className="p-2 font-mono">{`rad(Math.PI)`}</td>
                    </tr>

                    <tr>
                      <td className="p-2 font-mono">tableId[row][col]</td>
                      <td className="p-2">Access table cell value. Start with 0.</td>
                      <td className="p-2 font-mono">{`{tableID[0][1]}`}</td>
                    </tr>
                    
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={tablePickerOpen} onOpenChange={setTablePickerOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Select Table Cell</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">

                {/* ROW */}
                <div>
                  <p className="text-sm font-medium mb-1">Row</p>
                  <Input
                    type="number"
                    min={0}
                    value={rowIndex}
                    onChange={(e) => setRowIndex(Number(e.target.value))}
                  />
                </div>

                {/* COLUMN */}
                <div>
                  <p className="text-sm font-medium mb-1">Column</p>
                  <Input
                    type="number"
                    min={0}
                    value={colIndex}
                    onChange={(e) => setColIndex(Number(e.target.value))}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setTablePickerOpen(false)}
                  >
                    Cancel
                  </Button>

                  <Button
                    className="bg-[#facc15] hover:bg-[#eab308] text-black"
                    onClick={() => {
                      if (!selectedTableField) return;

                      insert(`{${selectedTableField.id}[${rowIndex}][${colIndex}]}`);
                      setTablePickerOpen(false);
                    }}
                  >
                    Insert Cell
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {/* OPERATORS */}
        <div className="space-y-2">
          {/* Basic operators */}
          <p className="text-sm font-medium">Basic Arithmetic Operators:</p>
          <div className="flex gap-2 flex-wrap">
            {["+", "-", "×", "÷", "(", ")"].map((op) => (
              <Button
                key={op}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insert(` ${op} `)}
              >
                {op}
              </Button>
            ))}
          </div>
          {/* Trigonometry functions */}
          <p className="text-sm font-medium">Trigonometry (angles in radians):</p>
          <div className="flex gap-2 flex-wrap mt-2">
            {[
              { label: "sen", insert: "Math.sin(" },
              { label: "cos", insert: "Math.cos(" },
              { label: "tan", insert: "Math.tan(" },
              { label: "asen", insert: "Math.asin(" },
              { label: "acos", insert: "Math.acos(" },
              { label: "atan", insert: "Math.atan(" },
              { label: "PI", insert: "Math.PI" },
              { label: "deg→rad", insert: "deg(" },
              { label: "rad→deg", insert: "rad(" },

            ].map((fn) => (
              <Button
                key={fn.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insert(fn.insert)}
              >
                {fn.label}
              </Button>

            ))}
            {/* Power and roots */}
          </div>
          <p className="text-sm font-medium">Powers & Roots:</p>
          <div className="flex gap-2 flex-wrap mt-2">
            {[
              { label: "√", insert: "Math.sqrt(" },
              { label: "x^y", insert: "Math.pow(" },
              { label: "³√", insert: "Math.cbrt(" },

            ].map((pn) => (
              <Button
                key={pn.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insert(pn.insert)}
              >
                {pn.label}
              </Button>

            ))}
          </div>
          {/* Conditional and logical */}
          <p className="text-sm font-medium">Conditional & Logical:</p>
          <div className="flex gap-2 flex-wrap mt-2">
            {[
              { label: "?", insert: " ?  : " },
              { label: "==", insert: " == " },
              { label: "!=", insert: " != " },
              { label: "<", insert: " < " },
              { label: ">", insert: " > " },
              { label: "<=", insert: " <= " },
              { label: ">=", insert: " >= " },
              { label: "AND", insert: " and " },
              { label: "OR", insert: " or " },
            ].map((op) => (
              <Button
                key={op.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insert(op.insert)}
              >
                {op.label}
              </Button>
            ))}
          </div>

        </div>
      </form>
    </Form>
  );
}