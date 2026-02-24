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


type FormSchema = z.infer<typeof propertiesSchema>;

export function PropertiesComponent({
  elementInstance,
}: {
  elementInstance: FormElementInstance;
}) {
  const element = elementInstance as CustomInstance;
  const { updateElement, elements } = useDesigner();
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const numberFields = elements.filter(
    (el) => el.type === "NumberField"
  );

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

        {/* NUMBER FIELD PICKER AS DROPDOWN */}
        <Listbox
          value={selectedFieldId}
          onChange={(id: string) => {
            const selectedField = numberFields.find(f => f.id === id);
            if (!selectedField) return;
            insert(`{${selectedField.id}}`);
            setSelectedFieldId("");
          }}
        >
          <div className="relative mt-1">
            <ListboxButton className="relative w-full cursor-default rounded border bg-white dark:bg-gray-800 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus:ring-2 focus:ring-[#facc15] sm:text-sm text-gray-900 dark:text-gray-100">
              {selectedFieldId
                ? numberFields.find(f => f.id === selectedFieldId)?.extraAttributes?.label
                : "-- Select Field --"}
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400 dark:text-gray-300" aria-hidden="true" />
              </span>
            </ListboxButton>

            <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-20 focus:outline-none sm:text-sm">
              {numberFields.map((f) => {
                const label = f.extraAttributes?.label || f.id;
                return (
                  <ListboxOption
                    key={f.id}
                    value={f.id}
                    className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 dark:text-gray-100 hover:bg-[#facc15] hover:text-white"
                  >
                    {({ selected }) => (
                      <>
                        <span className={`block truncate ${selected ? "font-semibold" : "font-normal"}`}>
                          {label} ({f.id})
                        </span>
                        {selected && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#facc15] dark:text-[#facc15]">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </ListboxOption>
                );
              })}
            </ListboxOptions>
          </div>
        </Listbox>

        {/* OPERATORS */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Operators</p>

          {/* Basic operators */}
          <div className="flex gap-2 flex-wrap">
            {["+", "-", "*", "/", "(", ")"].map((op) => (
              <Button
                key={op}
                type="button"
                size="sm"
                onClick={() => insert(` ${op} `)}
              >
                {op}
              </Button>
            ))}
          </div>

          {/* Math functions */}
          <div className="flex gap-2 flex-wrap mt-2">
            {[
              { label: "cos", insert: "Math.cos(" },
              { label: "sen", insert: "Math.sin(" },
              { label: "acos", insert: "Math.acos(" },
              { label: "asen", insert: "Math.asin(" },
              { label: "atan", insert: "Math.atan(" },
              { label: "PI", insert: "Math.PI" },
              { label: "√", insert: "Math.sqrt(" },
              { label: "^", insert: "Math.pow(" },
              // Degrees conversion
              { label: "deg→rad", insert: "deg(" },
              { label: "rad→deg", insert: "rad(" },

            ].map((fn) => (
              <Button
                key={fn.label}
                type="button"
                size="sm"
                onClick={() => insert(fn.insert)}
              >
                {fn.label}
              </Button>
            ))}
          </div>
        </div>
      </form>
    </Form>
  );
}