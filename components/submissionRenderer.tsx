import { useEffect, useRef, useState, useMemo } from "react";
import { FormElementInstance } from "./FormElements";
import { Button } from "./ui/button";
import { GetFormNameFromSubmissionId } from "../actions/form";
import PDFDocument from "./PDFComponent";
import { pdf } from "@react-pdf/renderer";
import { FormElements } from "./FormElements";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { prepareResolvedElements } from "./prepareResolvedElements";
import { toast } from "./ui/use-toast";
import { Label, Input } from "@aws-amplify/ui-react";
import { X } from "lucide-react";
import { ImShare } from "react-icons/im";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import SignatureCanvas from "react-signature-canvas";
const STAMP_SRC = "/Stamp.png";

interface Props {
  elements: FormElementInstance[];
  responses: { [key: string]: unknown };
  submissionID: string;
}

function FirstPageStampPreview({
  elements,
  responses,
  orientation,
  pageSize,
  stamp,
  previewScale = 0.7,
}: {
  elements: FormElementInstance[];
  responses: Record<string, unknown>;
  orientation: "portrait" | "landscape";
  pageSize: "A4" | "A3";
  stamp?: {
    issuedDate: string;
    signedDate: string;
    reviewer?: string;
    reviewerRole?: string;
    status?: string;
    signed?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  previewScale?: number;
}) {
  function buildRows(elements: FormElementInstance[]) {
    const rows: FormElementInstance[][] = [];
    let currentRow: FormElementInstance[] = [];
    let currentWidth = 0;

    elements.forEach((el) => {
      const width = el.width || 100;

      if (currentWidth + width > 100) {
        rows.push(currentRow);
        currentRow = [];
        currentWidth = 0;
      }

      currentRow.push(el);
      currentWidth += width;
    });

    if (currentRow.length) rows.push(currentRow);

    return rows;
  }

  const basePage =
    pageSize === "A4"
      ? orientation === "portrait"
        ? { width: 595.28, height: 841.89 }
        : { width: 841.89, height: 595.28 }
      : orientation === "portrait"
        ? { width: 841.89, height: 1190.55 }
        : { width: 1190.55, height: 841.89 };

  const scaledPage = {
    width: basePage.width * previewScale,
    height: basePage.height * previewScale,
  };

  const rows = buildRows(
    elements.filter((el) => el.type !== "PageBreakField")
  );

  return (
    <div
      data-stamp-page
      data-page-width={basePage.width}
      data-page-height={basePage.height}
      data-preview-scale={previewScale}
      style={{
        position: "relative",
        width: scaledPage.width,
        height: scaledPage.height,
        background: "white",
        margin: "0 auto",
        padding: 24 * previewScale,
        boxSizing: "border-box",
        boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
        overflow: "hidden",
        transformOrigin: "top center",
      }}
    >
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: "flex",
            width: "100%",
            gap: 12 * previewScale,
            marginBottom: 12 * previewScale,
          }}
        >
          {row.map((element) => {
            const FormComponent = FormElements[element.type].formComponent;
            const rawValue = responses[element.id];
            const value =
              rawValue !== undefined && rawValue !== null
                ? String(rawValue)
                : undefined;

            return (
              <div
                key={element.id}
                style={{
                  width: `${element.width || 100}%`,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                }}
              >
                <div
                  style={{
                    width: `${100 / previewScale}%`,
                  }}
                >
                  <FormComponent
                    elementInstance={element}
                    defaultValue={value}
                    isInvalid={false}
                    submitValue={() => { }}
                    readOnly={true}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {stamp && (
        <div
          style={{
            position: "absolute",
            left: (stamp.x ?? 10) * previewScale,
            top: (stamp.y ?? 10) * previewScale,
            width: (stamp.width ?? 200) * previewScale,
            height: (stamp.height ?? 100) * previewScale,
            boxSizing: "border-box",
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <img
            src={STAMP_SRC}
            alt="stamp"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 29.5 * previewScale,
              left: 83 * previewScale,
              fontSize: 6 * previewScale,
              color: "#000",
              whiteSpace: "nowrap",
            }}
          >
            {stamp.issuedDate}
          </div>

          <div
            style={{
              position: "absolute",
              top: 35 * previewScale,
              left: 83 * previewScale,
              fontSize: 6 * previewScale,
              color: "#000",
              whiteSpace: "nowrap",
            }}
          >
            {stamp.reviewer}
          </div>

          <div
            style={{
              position: "absolute",
              top: 41 * previewScale,
              left: 83 * previewScale,
              fontSize: 6 * previewScale,
              color: "#000",
              whiteSpace: "nowrap",
            }}
          >
            {stamp.reviewerRole}
          </div>

          {stamp.signed && (
            <img
              src={stamp.signed}
              alt="signature"
              style={{
                position: "absolute",
                top: 45 * previewScale,
                left: 40 * previewScale,
                width: 110 * previewScale,
                height: 13 * previewScale,
                objectFit: "contain",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function resolveTablesForPDF(responses: Record<string, unknown>) {
  const resolved: Record<string, unknown> = { ...responses };

  type TableCell = string | number | null;
  type TableRow = TableCell[];
  type Table = TableRow[];

  const stripMerge = (s: string) =>
    s.replace(/^\[merge:(right|down):\d+\]/, "").trim();

  const getNumeric = (raw: unknown): number => {
    if (raw === null || raw === undefined) return 0;

    const s = stripMerge(String(raw).trim());

    const m = s.match(/\[number:\s*([-+]?\d*\.?\d+)\s*\]/i);
    if (m) return parseFloat(m[1]);

    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const cellRefToRC = (ref: string) => {
    const m = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!m) return null;

    const letters = m[1].toUpperCase();
    const r = Number(m[2]) - 1;

    let c = 0;
    for (let i = 0; i < letters.length; i++) {
      c = c * 26 + (letters.charCodeAt(i) - 64);
    }

    return { r, c: c - 1 };
  };

  const evalFormula = (
    formula: string,
    table: Table,
    visiting = new Set<string>()
  ): string => {
    if (!formula.startsWith("=")) return formula;

    let expr = formula.slice(1);
    // {fieldId}
    expr = expr.replace(/\{([\w-]+)\}(?!:)/g, (_, fieldId) => {
      const value = resolved[fieldId];

      if (value === undefined || value === null) return "0";

      const n = Number(String(value));
      return Number.isFinite(n) ? String(n) : "0";
    });

    // {tableId:A1}
    expr = expr.replace(/\{([\w-]+):([A-Z]+\d+)\}/g, (_, tableId, cellRef) => {
      const tableValue = resolved[tableId];
      if (!tableValue) return "0";

      let table: Table;

      try {
        table =
          typeof tableValue === "string"
            ? JSON.parse(tableValue)
            : tableValue;
      } catch {
        return "0";
      }

      if (!Array.isArray(table)) return "0";

      const pos = cellRefToRC(cellRef);
      if (!pos) return "0";

      const raw = stripMerge(String(table[pos.r]?.[pos.c] ?? ""));

      if (raw.startsWith("=")) {
        const next = new Set(visiting);
        next.add(`${tableId}:${pos.r}:${pos.c}`);
        return evalFormula(raw, table, next);
      }

      return String(getNumeric(raw));
    });
    expr = expr.replace(/\b([A-Z]+\d+)\b/g, (cellRef) => {
      const pos = cellRefToRC(cellRef);
      if (!pos) return "0";

      const key = `${pos.r}:${pos.c}`;
      if (visiting.has(key)) return "0";

      const raw = stripMerge(String(table[pos.r]?.[pos.c] ?? "").trim());

      if (raw.startsWith("=")) {
        const next = new Set(visiting);
        next.add(key);
        const v = evalFormula(raw, table, next);
        return String(getNumeric(v));
      }

      return String(getNumeric(raw));
    });

    expr = expr.replace(/\^/g, "**");

    const ROUND = (value: number, decimals = 0) => {
      const factor = Math.pow(10, decimals);
      return Math.round(value * factor) / factor;
    };

    const DEG = (rad: number) => (rad * 180) / Math.PI;
    const RAD = (deg: number) => (deg * Math.PI) / 180;

    try {
      return String(
        Function("Math", "ROUND", "DEG", "RAD", `"use strict"; return (${expr})`)(
          Math,
          ROUND,
          DEG,
          RAD
        )
      );
    } catch {
      return "ERR";
    }
  };

  for (const key in resolved) {
    const value = resolved[key];
    if (typeof value !== "string") continue;

    try {
      const parsed = JSON.parse(value) as Table;
      if (!Array.isArray(parsed)) continue;

      const evaluated: Table = parsed.map((row) =>
        (row ?? []).map((cell) => {
          const raw = stripMerge(String(cell ?? "").trim());
          if (raw.startsWith("=")) return evalFormula(raw, parsed);
          return cell;
        })
      );

      resolved[key] = JSON.stringify(evaluated);
    } catch {
      // not a table JSON
    }
  }

  return resolved;
}

function getFirstPageElements(elements: FormElementInstance[]): FormElementInstance[] {
  const firstPage: FormElementInstance[] = [];

  for (const el of elements) {
    if (el.type === "PageBreakField") break;
    firstPage.push(el);
  }

  return firstPage;
}

export default function SubmissionRenderer({ submissionID, elements, responses }: Props) {
  const [formName, setFormName] = useState<string>("Loading...");
  const [equipmentName, setEquipmentName] = useState<string>("Loading...");
  const [equipmentTag, setEquipmentTag] = useState<string>("Loading...");
  const [projectName, setProjectName] = useState<string>("Loading...");
  const [clientName, setClientName] = useState<string>("Loading...");
  const [revision, setRevision] = useState<number | string>("Loading...");
  const [docNumber, setDocNumber] = useState<string>("Loading...");
  const [docNumberRevision, setDocNumberRevision] = useState<number | string>("Loading...");
  const [pageGroups, setPageGroups] = useState<FormElementInstance[][]>([]);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [pageSize, setPageSize] = useState<"A4" | "A3">("A4");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [users] = useState<{ email: string; name: string }[]>([]);
  const [includeStamp, setIncludeStamp] = useState(false);
  const sigRef = useRef<SignatureCanvas | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [sigChanged, setSigChanged] = useState(false);
  const [sigStatus, setSigStatus] = useState(""); // "" | "Saving..." | "Saved"
  const [pdfLoading, setPdfLoading] = useState(false);
  const [stampData, setStampData] = useState({
    issuedDate: "",
    signedDate: "",
    reviewer: "",
    reviewerRole: "",
    status: "", // APPROVED / RESUBMIT etc
    signed: "",
    x: 10,      // left offset in PDF units
    y: 10,      // top offset
    width: 200,
    height: 100,
  });
  const [stampPreview, setStampPreview] = useState(stampData);
  useEffect(() => {
    const fetchFormName = async () => {
      try {
        const result = await GetFormNameFromSubmissionId(submissionID);
        setFormName(result.formName || "Untitled Form");
        setRevision(result.revision || "0");
        setDocNumber(result.docNumber || "Untitled Form");
        setDocNumberRevision(result.docNumberRevision || "0");
        setEquipmentName(result.equipmentName || "Untitled Equipment");
        setEquipmentTag(result.equipmentTag || "Untitled Tag");
        setProjectName(result.projectName || "Untitled Project");
        setClientName(result.clientName || "Untitled Client");
      } catch {
        setFormName("Unknown");
      }
    };
    fetchFormName();
  }, [submissionID]);

  useEffect(() => {
    const groups: FormElementInstance[][] = [];
    let current: FormElementInstance[] = [];
    const repeatables: FormElementInstance[] = [];

    let firstPage = true;

    elements.forEach((el) => {
      if (el.type === "PageBreakField") {
        if (current.length > 0) {
          groups.push(firstPage ? [...current] : [...repeatables, ...current]);
          firstPage = false;
        }
        current = [];
      } else {
        if (el.extraAttributes?.repeatOnPageBreak) repeatables.push(el);
        current.push(el);
      }
    });

    if (current.length > 0) {
      groups.push(firstPage ? [...current] : [...repeatables, ...current]);
    }

    setPageGroups(groups);
  }, [elements]);

  const formattedDate =
    stampData.issuedDate
      ? new Date(stampData.issuedDate)
        .toLocaleDateString("en-GB")
      : "";
  const formattedSignedDate =
    stampData.signedDate
      ? new Date(stampData.signedDate)
        .toLocaleDateString("en-GB")
      : "";

  const memoFirstPageElements = useMemo(
    () => getFirstPageElements(elements),
    [elements]
  );
  const memoResponses = useMemo(
    () => resolveTablesForPDF(responses),
    [responses]
  );

  const memoStamp = useMemo(() => {
    if (!includeStamp) return undefined;
    return {
      ...stampData,
      issuedDate: formattedDate,
      signedDate: formattedSignedDate,
    };
  }, [includeStamp, stampData, formattedDate, formattedSignedDate]);

  const handleExportPDF = async () => {
    setLoading(true);
    const resolvedElements = await prepareResolvedElements(elements);
    const resolvedResponses = resolveTablesForPDF(responses);

    const blob = await pdf(
      <PDFDocument
        elements={resolvedElements}
        responses={resolvedResponses}
        formName={formName}
        revision={revision}
        orientation={orientation}
        pageSize={pageSize}
        docNumber={docNumber}
        docNumberRevision={docNumberRevision}
        equipmentName={equipmentName}
        equipmentTag={equipmentTag}
        stamp={
          includeStamp
            ? { ...stampData, issuedDate: formattedDate, signedDate: formattedSignedDate }
            : undefined
        }
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const fileName = `${formName} REV. ${revision}_${docNumber} REV. ${docNumberRevision}.pdf`;
    link.download = fileName;
    link.click();
    setLoading(false);
  };

  const handleAddUser = () => {
    const value = inputValue.trim();
    if (!value) return;
    if (!selectedUsers.includes(value)) {
      setSelectedUsers((prev) => [...prev, value]);
    }
    setInputValue("");
  };

  const handleRemoveUser = (email: string) => {
    setSelectedUsers((prev) => prev.filter((e) => e !== email));
  };

  const handleSharePDF = async () => {
    setPdfLoading(true);
    try {
      const resolvedElements = await prepareResolvedElements(elements);
      const resolvedResponses = resolveTablesForPDF(responses);
      const blob = await pdf(
        <PDFDocument
          elements={resolvedElements}
          responses={resolvedResponses}
          formName={formName}
          revision={revision}
          orientation={orientation}
          pageSize={pageSize}
          docNumber={docNumber}
          docNumberRevision={docNumberRevision}
          equipmentName={equipmentName}
          equipmentTag={equipmentTag}
          stamp={
            includeStamp
              ? { ...stampData, issuedDate: formattedDate, signedDate: formattedSignedDate }
              : undefined
          }
        />
      ).toBlob();

      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64PDF = btoa(binary);

      await fetch("https://p3bobv2zxft32b7wxdse5ma33u0vduup.lambda-url.ap-southeast-2.on.aws/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmails: selectedUsers,
          subject: `Issued Document ${docNumber} | Revision ${docNumberRevision}`,
          equipmentName,
          equipmentTag,
          body: `
              <p>Hello, ${clientName}</p>
              <p>
                Please find attached the PDF generated from the submitted form for the ${projectName}.
              </p>
              <p>
                <strong>Form:</strong> ${formName} Rev. ${revision}<br/> 
                <strong>Document number:</strong> ${docNumber} Rev. ${docNumberRevision}<br/>
                <strong>Equipment:</strong> ${equipmentName} (${equipmentTag})
              </p>
              <p>
                If you have any questions or need further information, feel free to reach out.
              </p>
              <p>
                Kind regards,<br/>
                Hero Engineering Team
              </p>
            `,
          attachment: {
            filename: `${formName}_REV${revision}.pdf`,
            content: base64PDF,
          },
        }),
      });

      toast({
        variant: "default",
        title: "PDF sent!",
        description: `PDF emailed successfully to: ${selectedUsers.join(", ")}`,
      });
      setOpen(false);
      setSelectedUsers([]);
      setInputValue("");
    } catch (err) {
      console.error("Send PDF error:", err);
      toast({
        title: "Error",
        description: "Failed to send PDF",
        variant: "destructive",
      });
    } finally {
      setPdfLoading(false);
    }
  };


 /* const handleDownloadPDF = async () => {
    setLoading(true);

    try {
      const resolvedElements = await prepareResolvedElements(elements);
      const resolvedResponses = resolveTablesForPDF(responses);

      const blob = await pdf(
        <PDFDocument
          elements={resolvedElements}
          responses={resolvedResponses}
          formName={formName}
          revision={revision}
          orientation={orientation}
          pageSize={pageSize}
          docNumber={docNumber}
          docNumberRevision={docNumberRevision}
          equipmentName={equipmentName}
          equipmentTag={equipmentTag}
          stamp={
            includeStamp
              ? {
                ...stampData,
                issuedDate: formattedDate,
                signedDate: formattedSignedDate,
              }
              : undefined
          }
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${formName} REV. ${revision}_${docNumber} REV. ${docNumberRevision}_TEST.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast({
        title: "Error",
        description: "Failed to generate test PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };*/
  function buildRows(elements: FormElementInstance[]) {
    const rows: FormElementInstance[][] = [];
    let currentRow: FormElementInstance[] = [];
    let currentWidth = 0;

    elements.forEach(el => {
      const width = el.width || 100;

      if (currentWidth + width > 100) {
        rows.push(currentRow);
        currentRow = [];
        currentWidth = 0;
      }

      currentRow.push(el);
      currentWidth += width;
    });

    if (currentRow.length) rows.push(currentRow);

    return rows;
  }
  return (
    <div className="flex flex-col items-center w-full h-full">
      {/* Top Bar */}
      <div className="fixed h-24 top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-4 border-b bg-white shadow-sm w-full">
        {/* Left: Export with config */}
        <div className="self-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" className="h-8 px-3 bg-background text-foreground border border-border hover:bg-muted">
                {loading ? "Preparing..." : "Export as PDF"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 space-y-3">
              <div className="text-sm font-medium">Select Page Configuration</div>
              <div className="space-y-2">
                <Select value={orientation} onValueChange={(v) => setOrientation(v as "portrait" | "landscape")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Orientation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={pageSize} onValueChange={(v) => setPageSize(v as "A4" | "A3")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Page Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="A3">A3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={handleExportPDF} disabled={loading}>
                {loading ? "Generating..." : "Download PDF"}
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full flex items-center justify-center gap-2">
                    <ImShare className="h-4 w-4" />
                    Share PDF
                  </Button>
                </DialogTrigger>

                <DialogContent
                  className="bg-white dark:bg-neutral-900 text-black dark:text-white
     shadow-xl border border-gray-300 dark:border-neutral-700
     rounded-lg fixed left-1/2 -translate-x-1/2 w-[98vw] max-w-[1200px] max-h-[95vh]
     flex flex-col overflow-visible"
                >
                  <DialogHeader className="flex flex-row items-center justify-between">
                    <DialogTitle>Share PDF</DialogTitle>
                    <DialogDescription>
                      Share PDF with stakeholders via email. You can also include a client stamp on the PDF for added authenticity.
                    </DialogDescription>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setOpen(false)}
                      className="h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </DialogHeader>

                  <div className="flex flex-col md:flex-row gap-6 overflow-hidden px-4 pb-4 h-full">
                    {/* Left panel - fixed width */}
                    <div
                      className="flex flex-col gap-4  w-[500px] flex-shrink-0 transition-all duration-300"
                      style={{ maxHeight: includeStamp ? "85vh" : "40vh" }}
                    >
                      {/* Left panel content */}
                      {/* Email input */}
                      <div className="flex flex-col gap-2">
                        <Label>Add recipients</Label>
                        <div className="flex gap-2">
                          <Input
                            list="user-suggestions"
                            placeholder="Enter email"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddUser();
                              }
                            }}
                            className="flex-1"
                          />
                          <Button onClick={handleAddUser} disabled={!inputValue.trim()}>
                            Add
                          </Button>
                        </div>
                        <datalist id="user-suggestions">
                          {users.map((user) => (
                            <option key={user.email} value={user.email}>
                              {user.name}
                            </option>
                          ))}
                        </datalist>
                      </div>

                      {/* Selected emails */}
                      {selectedUsers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedUsers.map((email) => (
                            <div
                              key={email}
                              className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-neutral-800 rounded-full text-sm"
                            >
                              {email}
                              <button onClick={() => handleRemoveUser(email)}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Stamp controls */}
                      <div className="border-t pt-4 space-y-3">
                        <Label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={includeStamp}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setIncludeStamp(checked);

                              if (checked) {
                                setStampPreview(stampData); // copy ONCE
                              }
                            }}
                          />
                          Include Client Stamp
                        </Label>
                        <Button
                          className="mt-2 w-full"
                          onClick={handleSharePDF}
                          disabled={pdfLoading || selectedUsers.length === 0}
                        >
                          {pdfLoading ? "Sending..." : "Send PDF via Email"}
                        </Button>
                        {/*<Button onClick={handleDownloadPDF} className="mt-2 w-full" disabled={loading}>
                          {loading ? "Generating..." : "Download PDF for Test"}
                        </Button>*/}
                        {includeStamp && (
                          <div className="flex flex-col gap-3  max-h-[70vh]">
                            <Label style={{ fontSize: 14 }}>
                              After filling in the details, press "Apply Stamp" and then click on the PDF preview to place the stamp.
                            </Label>
                            <div>
                              <Label>Reviewed Date</Label>
                              <Input
                                type="date"
                                value={stampPreview.issuedDate}
                                onChange={(e) =>
                                  setStampPreview({ ...stampPreview, issuedDate: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label>Reviewer</Label>
                              <Input
                                value={stampPreview.reviewer}
                                onChange={(e) =>
                                  setStampPreview({ ...stampPreview, reviewer: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label>Reviewer Role</Label>
                              <Input
                                value={stampPreview.reviewerRole}
                                onChange={(e) =>
                                  setStampPreview({ ...stampPreview, reviewerRole: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label>Signature</Label>

                              <div className="border rounded bg-white">
                                <SignatureCanvas
                                  ref={sigRef}
                                  penColor="black"
                                  canvasProps={{ width: 600, height: 100, className: "signatureCanvas" }}
                                  onEnd={() => {
                                    setSigChanged(true);      // mark as changed
                                    setSigStatus("");          // reset the status to show "Save Signature"
                                  }}
                                />
                              </div>

                              <div className="flex gap-2 mt-2">
                                <Button
                                  type="button"
                                  onClick={() => {
                                    sigRef.current?.clear();
                                    setSigChanged(true); // mark as changed
                                    setSigStatus("");    // reset the label
                                  }}
                                  variant="outline"
                                >
                                  Clear
                                </Button>

                                <Button
                                  type="button"
                                  onClick={() => {
                                    if (!sigRef.current) return;

                                    setSigStatus("Saving...");

                                    const dataURL = sigRef.current.getCanvas().toDataURL("image/png");
                                    setStampPreview({ ...stampPreview, signed: dataURL });

                                    setTimeout(() => {
                                      setSigStatus("Saved");
                                      setSigChanged(false); // mark as saved
                                    }, 500);
                                  }}
                                  disabled={!sigChanged}
                                >
                                  {sigStatus || "Save Signature"}
                                </Button>
                              </div>

                              <Button className="mt-2 w-full" onClick={() => setStampData(stampPreview)}>Apply Stamp</Button>

                            </div>

                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right panel: PDF preview only if stamp is included */}
                    <div className="flex-1 min-w-0 overflow-auto">
                      <div className="flex-1 min-w-0 overflow-auto">
                        {includeStamp && pageGroups.length > 0 && (
                          <div
                            ref={viewerRef}
                            className="relative border rounded-md bg-gray-50 w-full h-[75vh] overflow-auto p-4"
                            onClick={(e) => {
                              const target = e.target as HTMLElement;
                              const pageEl = target.closest("[data-stamp-page]") as HTMLDivElement | null;
                              if (!pageEl) return;

                              const rect = pageEl.getBoundingClientRect();
                              const pageWidth = Number(pageEl.dataset.pageWidth || 595.28);
                              const pageHeight = Number(pageEl.dataset.pageHeight || 841.89);
                              const previewScale = Number(pageEl.dataset.previewScale || 1);

                              const clickX = e.clientX - rect.left;
                              const clickY = e.clientY - rect.top;

                              const xPdf = clickX / previewScale - stampData.width / 2;
                              const yPdf = clickY / previewScale - stampData.height / 2;

                              setStampData((prev) => ({
                                ...prev,
                                x: Math.min(pageWidth - prev.width, Math.max(0, xPdf)),
                                y: Math.min(pageHeight - prev.height, Math.max(0, yPdf)),
                              }));
                            }}
                          >
                            <FirstPageStampPreview
                              elements={memoFirstPageElements}
                              responses={memoResponses}
                              orientation={orientation}
                              pageSize={pageSize}
                              stamp={memoStamp}
                              previewScale={0.7}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </PopoverContent>
          </Popover>
        </div>
        <div className="text-sm font-semibold text-center text-muted-foreground truncate max-w-[60%]">
          {formName} REV. {revision} | {docNumber} REV. {docNumberRevision}
        </div>

        {/* Right: Close Button */}
        <Button
          onClick={() => window.history.back()}
          className="self-end flex items-center justify-center w-8 h-8 rounded-sm 
          opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 
          focus:ring-ring text-foreground bg-background border border-border 
          font-bold text-lg hover:bg-neutral-700 dark:hover:bg-neutral-300 dark:hover:text-black"
        >
          X
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {/* Form Preview */}
      <div
        className="w-full flex flex-col gap-4 bg-background rounded-2xl p-8 pt-8 overflow-y-auto"
        style={{ paddingTop: "94px", maxHeight: "100vh" }}
      >

        {pageGroups.map((group, idx) => {
          const visibleElements = group.filter((el) => {
            const shouldRepeat = el.extraAttributes?.repeatOnPageBreak === true;
            return idx === 0 || !shouldRepeat;
          });

          const rows = buildRows(visibleElements);

          return (
            <div key={idx} className="pdf-page mb-8 space-y-4">
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex w-full gap-4">
                  {row.map((element) => {
                    const FormComponent = FormElements[element.type].formComponent;
                    const rawValue = memoResponses[element.id];
                    const value =
                      rawValue !== undefined && rawValue !== null
                        ? String(rawValue)
                        : undefined;

                    return (
                      <div
                        key={element.id}
                        style={{ width: `calc(${element.width || 100}% - 1rem)` }}
                      >
                        <FormComponent
                          elementInstance={element}
                          defaultValue={value}
                          isInvalid={false}
                          submitValue={() => { }}
                          readOnly={true}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}

      </div>
    </div>
  );
}
