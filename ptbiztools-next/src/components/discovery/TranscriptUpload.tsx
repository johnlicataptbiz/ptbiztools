"use client";

import { useRef, type ChangeEvent } from "react";
import { Upload, FileText } from "lucide-react";
import { MIN_WORDS } from "./constants";

interface TranscriptUploadProps {
  transcript: string;
  onTranscriptChange: (value: string) => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onInsertTemplate: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function TranscriptUpload({
  transcript,
  onTranscriptChange,
  onFileUpload,
  onInsertTemplate,
  fileInputRef,
}: TranscriptUploadProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="form-group">
      <label htmlFor="transcript-input">Call Transcript</label>
      <div className="grader-intake-toolbar" style={{ marginBottom: "12px" }}>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} />
          Upload Transcript
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={onInsertTemplate}
        >
          <FileText size={16} />
          Insert Template
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.csv,.json,.rtf,.pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.docx,.doc"
          className="grader-file-input"
          onChange={onFileUpload}
          aria-label="Upload transcript file"
        />
      </div>
      <textarea
        id="transcript-input"
        ref={textareaRef}
        value={transcript}
        onChange={(e) => onTranscriptChange(e.target.value)}
        placeholder="Paste the full transcript or upload a text file..."
        rows={6}
      />
      <div className="textarea-hint">
        The transcript is automatically de-identified before grading. Minimum{" "}
        {MIN_WORDS} words required.
      </div>
    </div>
  );
}
