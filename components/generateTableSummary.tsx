import { useEffect, useState } from "react";
import { GetFormsContent } from "../actions/form";

type TableData = string[][];

interface ExtraAttributes {
  data?: string[][];
}

interface FormContentItem {
  id: string;
  type: string;
  value?: unknown;
  extraAttributes?: ExtraAttributes;
}

interface ParsedContent {
  formContent: FormContentItem[];
  responses?: Record<string, unknown>;
}

interface TableSummary {
  checkbox: { checked: number; unchecked: number; neutral: number };
  passFail: { pass: number; fail: number; notapplicable: number };
}

function stripMergePrefix(cell: string): string {
  return cell.replace(/^\[merge:(right|down):\d+\]/, "").trim();
}

function parseMaybeTable(value: unknown): TableData | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    return value as TableData;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as TableData) : null;
    } catch {
      return null;
    }
  }

  return null;
}

function generateTableSummary(tables: TableData[]): TableSummary {
  const summary: TableSummary = {
    checkbox: { checked: 0, unchecked: 0, neutral: 0 },
    passFail: { pass: 0, fail: 0, notapplicable: 0 },
  };

  for (const table of tables) {
    for (const row of table) {
      for (const rawCell of row) {
        const cell = stripMergePrefix(String(rawCell || ""));

        if (!cell) continue;

        // checkbox counting
        if (cell.startsWith("[checkbox")) {
          if (cell === "[checkbox:true]") summary.checkbox.checked++;
          else if (cell === "[checkbox:false]") summary.checkbox.unchecked++;
          else summary.checkbox.neutral++;
          continue;
        }

        // pass/fail counting
        if (cell === "[PASS]") {
          summary.passFail.pass++;
          continue;
        }

        if (cell === "[FAIL]") {
          summary.passFail.fail++;
          continue;
        }

        if (cell === "[SUMMARY]" || cell === "[N/A]") {
          summary.passFail.notapplicable++;
          continue;
        }
      }
    }
  }

  return summary;
}

export function SubmissionSummary({ submissionId }: { submissionId: string }) {
  const [tablesData, setTablesData] = useState<TableData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!submissionId || submissionId.trim() === "") return;

        const contentRaw = await GetFormsContent(submissionId);
        let content: ParsedContent;

        if (typeof contentRaw === "string") {
          try {
            content = JSON.parse(contentRaw) as ParsedContent;
          } catch {
            setError("Failed to parse content");
            return;
          }
        } else if (contentRaw && typeof contentRaw === "object") {
          content = contentRaw as ParsedContent;
        } else {
          setError("Content is empty or invalid");
          return;
        }

        if (!Array.isArray(content.formContent)) {
          setError("Invalid content format");
          return;
        }

        const tableDataArrays: TableData[] = content.formContent
          .filter((item) => item.type === "TableField")
          .map((item) => {
            const responseValue = content.responses?.[item.id];

            const submittedTable = parseMaybeTable(responseValue);

            if (submittedTable) return submittedTable;

            return item.extraAttributes?.data || [];
          });

        setTablesData(tableDataArrays);
      } catch (err) {
        console.error("Error fetching content:", err);
        setError("Failed to fetch content");
      }
    };

    fetchData();
  }, [submissionId]);

  if (error) {
    return <p className="text-red-500">⚠ {error}</p>;
  }

  if (!tablesData) {
    return <p className="text-muted-foreground text-sm">Loading summary...</p>;
  }

  const summary = generateTableSummary(tablesData);

  return (
    <div className="text-sm bg-muted p-4 rounded border flex items-start gap-4">
      <div className="flex flex-col gap-2">
        <p className="font-semibold">Checkbox Summary:</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded text-white bg-green-500">✔</span>
            <span>{summary.checkbox.checked}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded text-black bg-gray-300">✖</span>
            <span>{summary.checkbox.unchecked}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded border border-gray-500 text-gray-400 bg-white">–</span>
            <span>{summary.checkbox.neutral}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-l border-gray-400 pl-4">
        <p className="font-semibold">Pass/Fail Summary:</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded text-white bg-green-500">PASS</span>
            <span>{summary.passFail.pass}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded text-white bg-red-600">FAIL</span>
            <span>{summary.passFail.fail}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded border border-gray-500 text-gray-400 bg-white">N/A</span>
            <span>{summary.passFail.notapplicable}</span>
          </div>
        </div>
      </div>
    </div>
  );
}