import { evaluateTableFormula, cellRefToIndexes, getCellNumericValue } from "./evaluateTableFormula";
import { formValueStore } from "../components/formValueStore";

export function resolveTableFormulas(
  formValues: Record<string, string>
): Record<string, string> {
  const storeValues = formValueStore.getValues() as Record<string, string>;
  
  // ✅ Merge everything - allValues is the source of truth
  const allValues: Record<string, string> = { ...storeValues, ...formValues };
  
  // ✅ Start resolved from allValues, not just formValues
  const resolved: Record<string, string> = { ...allValues };

  for (const [key, value] of Object.entries(allValues)) { // ✅ iterate allValues not formValues
    let table: string[][];
    try {
      table = JSON.parse(value);
    } catch {
      continue;
    }
    if (!Array.isArray(table)) continue;

    const resolvedTable: string[][] = table.map(row => [...row]);

    for (let pass = 0; pass < 3; pass++) {
      for (let r = 0; r < resolvedTable.length; r++) {
        for (let c = 0; c < resolvedTable[r].length; c++) {
          const original = table[r]?.[c] ?? "";
          if (original.startsWith("=")) {
            resolvedTable[r][c] = evaluateTableFormula(original, resolvedTable, allValues);
          }
        }
      }
      allValues[key] = JSON.stringify(resolvedTable);
    }

    resolved[key] = JSON.stringify(resolvedTable);
  }

  return resolved;
}