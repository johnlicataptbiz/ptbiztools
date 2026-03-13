import React, { DragEvent } from 'react';
import { Upload, FileText } from 'lucide-react';
import type { DannyComponentProps } from './types';

interface FileUploadZoneProps extends DannyComponentProps {
  onFileUpload: (file: File) => Promise<void>;
  fileLoading: boolean;
  uploadedFile: { name: string; type: string; text: string } | null;
  onClearFile: () => void;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileUpload,
  fileLoading,
  uploadedFile,
  onClearFile,
  className = ''
}) => {
  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      await onFileUpload(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClick = () => {
    const input = document.getElementById('danny-file-input') as HTMLInputElement;
    input?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  if (uploadedFile) {
    return (
      <div className={`danny-file-upload-success ${className}`}>
        <div className="file-success-header">
          <FileText className="file-icon" />
          <div>
            <span className="file-name">{uploadedFile.name}</span>
            <span className="file-meta">
              {(uploadedFile.text || '').split(/\s+/).filter(Boolean).length} words extracted from {uploadedFile.type?.toUpperCase() || 'file'}
            </span>
          </div>
        </div>
        <button onClick={onClearFile} className="file-clear-btn">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`danny-file-upload-zone ${className}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleClick}
    >
      <input
        id="danny-file-input"
        type="file"
        accept=".pdf,.txt,.md,.csv,.json,.rtf,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {fileLoading ? (
        <div className="upload-loading">
          <div className="loading-spinner" />
          <span>Reading file...</span>
        </div>
      ) : (
        <div className="upload-content">
          <Upload className="upload-icon" />
          <div className="upload-text">
            <div className="upload-primary">
              Drop a file here or <span className="upload-cta">click to upload</span>
            </div>
            <div className="upload-formats">
              PDF, TXT, CSV, JSON, RTF, XLSX, PNG/JPG — or paste below
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { FileUploadZone };
export type { FileUploadZoneProps };
