import { useState } from "react";
import { Button } from "./ui/button";
import { MdPreview } from "react-icons/md";
import useDesigner from "./hooks/useDesigner";
import PDFDocument from "./PDFComponent";
import { FormElementInstance } from "./FormElements";
import { pdf } from "@react-pdf/renderer";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { prepareResolvedElements } from "./prepareResolvedElements";
import { saveFormAction } from "../actions/form";

function PreviewPDFDialogBtn({ id, formName, revision }: { id: string; formName: string; revision: number }) {
  const { elements, setSelectedElement } = useDesigner();
  const [loading, setLoading] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [pageSize, setPageSize] = useState<"A4" | "A3">("A4");

  const saveBeforePreview = async () => {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("content", JSON.stringify(elements));

    await saveFormAction(formData);
  };

  const generateAndOpenPDF = async () => {
    setSelectedElement(null);
    setLoading(true);
    await saveBeforePreview();
    const groups: FormElementInstance[][] = [];
    const repeatables: FormElementInstance[] = [];
    let current: FormElementInstance[] = [];
    let firstPage = true;

    elements.forEach((el) => {
      if (el.type === "PageBreakField") {
        if (current.length > 0) {
          groups.push(firstPage ? [...current] : [...repeatables, ...current]);
          current = [];
          firstPage = false;
        }
      } else {
        if (el.extraAttributes?.repeatOnPageBreak && firstPage) {
          repeatables.push(el);
        }
        current.push(el);
      }
    });

    if (current.length > 0) {
      groups.push(firstPage ? [...current] : [...repeatables, ...current]);
    }

    // 🔧 resolve image URLs *before* passing to the component
    const resolvedGroups = await prepareResolvedElements(groups);

    const blob = await pdf(
      <PDFDocument
        elements={resolvedGroups} 
        responses={{}}
        formName={formName || "Unknown Document Number"}
        revision={revision}
        orientation={orientation}
        pageSize={pageSize}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setLoading(false);
  };


  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={loading}>
          <MdPreview className="h-6 w-6" />
          {loading ? "Generating..." : "Preview PDF"}
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

          <Select value={pageSize} onValueChange={(v) => setPageSize(v as "A3" | "A4")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Page Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A4">A4</SelectItem>
              <SelectItem value="A3">A3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button className="w-full" onClick={generateAndOpenPDF} disabled={loading}>
          {loading ? "Generating..." : "Generate PDF"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export default PreviewPDFDialogBtn;
