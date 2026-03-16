/**
 * useFileUpload
 * Handles transcript file upload and template insertion.
 */

import { useRef, type ChangeEvent } from "react";
import { toast } from "sonner";
import { extractTranscriptFromFile } from "@/lib/ptbiz-api";
import { transcriptTemplate, sourceTypeLabel } from "../utils";

export interface UseFileUploadReturn {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleInsertTemplate: () => void;
}

export function useFileUpload(
  setTranscript: React.Dispatch<React.SetStateAction<string>>
): UseFileUploadReturn {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const extracted = await extractTranscriptFromFile(file);
      if (extracted.error || !extracted.text) {
        toast.error(extracted.error || "Could not read transcript file");
        return;
      }

      setTranscript(extracted.text);
      toast.success(
        `Loaded transcript from ${file.name} (${sourceTypeLabel(extracted.sourceType)})`
      );
    } catch (error) {
      console.error(error);
      toast.error(
        "Could not read transcript file. Use PDF, TXT, MD, CSV, JSON, RTF, XLSX, PNG, JPG, or WEBP."
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleInsertTemplate = (): void => {
    setTranscript((prev) => {
      if (!prev.trim()) return transcriptTemplate;
      return `${prev.trimEnd()}\n\n${transcriptTemplate}`;
    });
    toast.success("Template inserted");
  };

  return { fileInputRef, handleFileUpload, handleInsertTemplate };
}
