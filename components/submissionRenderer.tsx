import { useEffect, useState } from "react";
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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
interface Props {
  elements: FormElementInstance[];
  responses: { [key: string]: unknown };
  submissionID: string;
}

export default function SubmissionRenderer({ submissionID, elements, responses }: Props) {
  const [formName, setFormName] = useState<string>("Loading...");
  const [equipmentName, setEquipmentName] = useState<string>("Loading...");
  const [equipmentTag, setEquipmentTag] = useState<string>("Loading...");
  const [revision, setRevision] = useState<number | string>("Loading...");
  const [docNumber, setDocNumber] = useState<string>("Loading...");
  const [docNumberRevision, setDocNumberRevision] = useState<number | string>("Loading...");
  const [pageGroups, setPageGroups] = useState<FormElementInstance[][]>([]);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [pageSize, setPageSize] = useState<"A4" | "A3">("A4");
  const [loading, setLoading] = useState(false);

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

  const handleExportPDF = async () => {
    setLoading(true);
    const resolvedGroups = await prepareResolvedElements(pageGroups);
    const blob = await pdf(
      <PDFDocument
        elements={resolvedGroups}
        responses={responses}
        formName={formName}
        revision={revision}
        orientation={orientation}
        pageSize={pageSize}
        docNumber={docNumber}
        docNumberRevision={docNumberRevision}
        equipmentName={equipmentName}
        equipmentTag={equipmentTag}
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

  const [pdfLoading, setPdfLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [users] = useState<{ email: string; name: string }[]>([]);

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
    const resolvedGroups = await prepareResolvedElements(pageGroups);

    const blob = await pdf(
      <PDFDocument
        elements={resolvedGroups}
        responses={responses}
        formName={formName}
        revision={revision}
        orientation={orientation}
        pageSize={pageSize}
        docNumber={docNumber}
        docNumberRevision={docNumberRevision}
        equipmentName={equipmentName}
        equipmentTag={equipmentTag}
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
        subject: `Form PDF: ${formName} REV.${revision}`,
        body: `<p>Please find the attached PDF.</p>`,
        attachment: {
          filename: `${formName}_REV${revision}.pdf`,
          content: base64PDF,
        },
      }),
    });

    toast({
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
                  <Button className="w-[140px] md:w-[200px] text-sm md:text-md mt-2 gap-2">
                    <ImShare className="mr-2 h-4 w-4" />
                    Share PDF
                  </Button>
                </DialogTrigger>

                <DialogContent className="w-[700px] bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xl">
                  <DialogHeader>
                    <DialogTitle>Share PDF</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label>Add people</Label>
                      <div className="flex gap-2">
                        <Input
                          list="user-suggestions"
                          placeholder="Enter email or name"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddUser();
                            }
                          }}
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

                    {selectedUsers.length > 0 && (
                      <div>
                        <Label>Selected:</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedUsers.map((email) => (
                            <div
                              key={email}
                              className="flex items-center gap-2 px-2 py-1 rounded bg-neutral-200 dark:bg-neutral-800 text-sm"
                            >
                              {email}
                              <button onClick={() => handleRemoveUser(email)}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      className="w-full mt-2"
                      onClick={handleSharePDF}
                      disabled={pdfLoading || selectedUsers.length === 0}
                    >
                      {pdfLoading ? "Sending..." : "Send PDF via Email"}
                    </Button>
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

        {pageGroups.map((group, idx) => (
          <div key={idx} className="pdf-page mb-8">
            {group
              .filter((el) => {
                const shouldRepeat = el.extraAttributes?.repeatOnPageBreak === true;
                return idx === 0 || !shouldRepeat;
              })
              .map((element) => {
                const FormComponent = FormElements[element.type].formComponent;
                const rawValue = responses[element.id];
                const value = typeof rawValue === "string" ? rawValue : undefined;

                return (
                  <div key={element.id}>
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
    </div>
  );
}
