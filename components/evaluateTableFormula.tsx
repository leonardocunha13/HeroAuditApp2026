// TableField.tsx - move these OUTSIDE the FormComponent

export function getCellNumericValue(raw: string): number {
    if (!raw || typeof raw !== "string") return 0;
    const trimmed = raw.trim();
    if (!trimmed) return 0; // handles " " space cells ← THIS WAS YOUR NaN SOURCE
    if (trimmed.startsWith("=")) return 0;
    if (trimmed.startsWith("[number:")) {
        const match = trimmed.match(/^\[number:(.*?)\]$/);
        const v = match?.[1]?.trim();
        return parseFloat(v || "0") || 0;
    }
    if (trimmed.startsWith("[")) return 0; // any other special cell type
    return parseFloat(trimmed) || 0;
}

export function cellRefToIndexes(ref: string) {
    const match = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!match) return null;
    const letters = match[1].toUpperCase();
    const row = Number(match[2]) - 1;
    let col = 0;
    for (let i = 0; i < letters.length; i++) {
        col = col * 26 + (letters.charCodeAt(i) - 64);
    }
    col -= 1;
    return { row, col };
}

export function evaluateTableFormula(
    formula: string,
    currentTable: string[][],
    allValues: Record<string, unknown>,
    visited = new Set<string>()
): string {
    if (!formula.startsWith("=")) return formula;
    let expression = formula.slice(1);
    if (visited.has(formula)) return "CIRC";
    visited.add(formula);

    expression = expression.replace(/\{(\w+)\}/g, (_, fieldId) => {
        const value = allValues[fieldId];
        if (value === undefined || value === null) return "0";
        if (typeof value === "string") {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) return "0";
            } catch { /* normal value */ }
        }
        return String(parseFloat(String(value)) || 0);
    });

    expression = expression.replace(/\{(\w+):([A-Z]+\d+)\}/g, (_, fieldId, cellRef) => {
        const tableValue = allValues[String(fieldId)];
        console.log(`Cross-ref {${fieldId}:${cellRef}} => tableValue:`, tableValue);
        if (!tableValue) return "0";
        let table: string[][];
        try {
            table = typeof tableValue === "string" ? JSON.parse(tableValue) : tableValue as string[][];
        } catch { return "0"; }
        if (!Array.isArray(table)) return "0";
        const pos = cellRefToIndexes(cellRef);
        if (!pos) return "0";
        const raw = table[pos.row]?.[pos.col] ?? "";
        if (typeof raw === "string" && raw.startsWith("=")) {
            return evaluateTableFormula(raw, table, allValues, visited);
        }
        return String(getCellNumericValue(raw));
    });

    expression = expression.replace(/\b([A-Z]+\d+)\b/g, (_, cellRef) => {
        const pos = cellRefToIndexes(cellRef);
        if (!pos) return "0";
        const raw = currentTable[pos.row]?.[pos.col] ?? "";
        if (typeof raw === "string" && raw.startsWith("=")) {
            return evaluateTableFormula(raw, currentTable, allValues, visited);
        }
        return String(getCellNumericValue(raw));
    });

    expression = expression.replace(/\^/g, "**");

    try {
        const ROUND = (value: number, decimals = 0) => {
            const factor = Math.pow(10, decimals);
            return Math.round(value * factor) / factor;
        };
        const DEG = (rad: number) => (rad * 180) / Math.PI;
        const RAD = (deg: number) => (deg * Math.PI) / 180;
        const result = Function("Math", "ROUND", "DEG", "RAD",
            `"use strict"; return (${expression})`)(Math, ROUND, DEG, RAD);
        return String(result);
    } catch {
        return "ERR";
    }
}