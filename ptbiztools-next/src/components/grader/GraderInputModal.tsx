"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { GraderInputModalProps, UploadedFile, TranscriptStats } from "./types";

const MIN_WORDS = 120;

export function GraderInputModal({
  isOpen,
  onClose,
  onSubmit,
  badgeSrc,
  badgeAlt,
  title,
  subtitle,
  isGrading,
  minWords = MIN_WORDS,
  defaultValues = {},
  showProgram = true,
  showOutcome = true,
  programs = ["Rainmaker", "Mastermind"],
  outcomes = ["Won", "Lost"],
}: GraderInputModalProps) {
  const [transcript, setTranscript] = useState("");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [coachName, setCoachName] = useState(defaultValues.coachName || "");
  const [clientName, setClientName] = useState(defaultValues.clientName || "");
  const [callDate, setCallDate] = useState(defaultValues.callDate || "");
  const [outcome, setOutcome] = useState(defaultValues.outcome || outcomes[0]);
  const [program, setProgram] = useState(defaultValues.program || programs[0]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getStats = useCallback((text: string): TranscriptStats => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
    return {
      wordCount: words.length,
      charCount: text.length,
      lineCount: trimmed ? trimmed.split(/\n+/).length : 0,
      questionCount: (text.match(/\?/g) || []).length,
      estimatedMinutes: words.length > 0 ? Math.max(1, Math.round(words.length / 145)) : 0,
    };
  }, []);

  const stats = getStats(uploadedFile?.text || transcript);
  const meetsMinWords = stats.wordCount >= minWords;

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    
    setFileLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);

      const response = await fetch("/api/transcripts/extract", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok || data.error) {
        toast.error(data.error || "Failed to extract transcript");
        return;
      }

      setUploadedFile({
        name: file.name,
        type: data.sourceType || "text",
        text: data.text || "",
      });
      setTranscript("");
      toast.success(`Loaded ${data.wordCount?.toLocaleString() || ""} words from ${file.name}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to read file. Try pasting the transcript instead.");
    } finally {
      setFileLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const clearFile = useCallback(() => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const finalTranscript = uploadedFile?.text || transcript;
    
    if (!finalTranscript.trim()) {
      toast.error("Please paste or upload a transcript");
      return;
    }

    if (stats.wordCount < minWords) {
      toast.error(`Transcript must be at least ${minWords} words. Current: ${stats.wordCount}`);
      return;
    }

    onSubmit({
      transcript: finalTranscript,
      coachName: coachName.trim() || "Unknown",
      clientName: clientName.trim() || "Unknown",
      callDate: callDate || new Date().toISOString().slice(0, 10),
      outcome: showOutcome ? outcome : undefined,
      program: showProgram ? program : undefined,
    });
  }, [transcript, uploadedFile, coachName, clientName, callDate, outcome, program, stats.wordCount, minWords, onSubmit, showOutcome, showProgram]);

  const handleClose = useCallback(() => {
    if (!isGrading) {
      onClose();
    }
  }, [isGrading, onClose]);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTranscript("");
      setUploadedFile(null);
      setCoachName(defaultValues.coachName || "");
      setClientName(defaultValues.clientName || "");
      setCallDate(defaultValues.callDate || "");
      setOutcome(defaultValues.outcome || outcomes[0]);
      setProgram(defaultValues.program || programs[0]);
    }
  }, [isOpen, defaultValues, outcomes, programs]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="grade-modal-overlay" onClick={handleClose}>
        <motion.div
          className="grade-modal-container grade-input-modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Badge */}
          <div className="grade-modal-header">
            <button className="grade-modal-close" onClick={handleClose} disabled={isGrading}>
              <X size={20} />
            </button>
            
            <div className="grade-modal-badge-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={badgeSrc} 
                alt={badgeAlt} 
                className="grade-modal-badge"
              />
            </div>
            
            <h2 className="grade-modal-title">{title}</h2>
            <p className="grade-modal-subtitle">{subtitle}</p>
          </div>

          {/* Content */}
          <div className="grade-modal-content">
            {/* Metadata Fields */}
            <div className="grader-meta-grid">
              <div className="grade-modal-field">
                <label>Coach/Closer Name</label>
                <input
                  type="text"
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="Enter name"
                  disabled={isGrading}
                />
              </div>
              
              <div className="grade-modal-field">
                <label>Client/Prospect Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter name"
                  disabled={isGrading}
                />
              </div>
              
              <div className="grade-modal-field">
                <label>Call Date</label>
                <input
                  type="date"
                  value={callDate}
                  onChange={(e) => setCallDate(e.target.value)}
                  disabled={isGrading}
                />
              </div>
            </div>

            {/* Program & Outcome Selection */}
            {(showProgram || showOutcome) && (
              <div className="grader-selection-row">
                {showProgram && (
                  <div className="grader-selection-group">
                    <label>Program</label>
                    <div className="grader-pill-group">
                      {programs.map((p) => (
                        <button
                          key={p}
                          onClick={() => setProgram(p)}
                          disabled={isGrading}
                          className={`grader-pill ${program === p ? "active" : ""}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {showOutcome && (
                  <div className="grader-selection-group">
                    <label>Outcome</label>
                    <div className="grader-pill-group">
                      {outcomes.map((o) => (
                        <button
                          key={o}
                          onClick={() => setOutcome(o)}
                          disabled={isGrading}
                          className={`grader-pill ${outcome === o ? "active" : ""}`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* File Upload / Transcript Input */}
            <div className="grader-input-section">
              {uploadedFile ? (
                <div className="grader-file-uploaded">
                  <div className="grader-file-info">
                    <FileText size={20} />
                    <span className="grader-file-name">{uploadedFile.name}</span>
                    <span className="grader-file-stats">
                      {uploadedFile.text.split(/\s+/).filter(Boolean).length.toLocaleString()} words
                    </span>
                  </div>
                  <button 
                    onClick={clearFile} 
                    className="grader-file-remove"
                    disabled={isGrading}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className={`grader-dropzone ${isDragging ? "dragging" : ""}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.md,.csv,.json,.rtf,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
                      style={{ display: "none" }}
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      disabled={isGrading}
                    />
                    {fileLoading ? (
                      <span className="grader-dropzone-text">Reading file...</span>
                    ) : (
                      <>
                        <Upload size={24} className="grader-dropzone-icon" />
                        <span className="grader-dropzone-text">
                          Drop a file or <span className="grader-dropzone-link">click to upload</span>
                        </span>
                        <span className="grader-dropzone-hint">
                          PDF, TXT, CSV, JSON, RTF, XLSX, PNG/JPG
                        </span>
                      </>
                    )}
                  </div>
                  
                  <textarea
                    ref={textareaRef}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Or paste the transcript here..."
                    rows={6}
                    disabled={isGrading || !!uploadedFile}
                    className="grader-textarea"
                  />
                </>
              )}
            </div>

            {/* Stats & Validation */}
            <div className="grader-stats-bar">
              <div className="grader-stat">
                <span className="grader-stat-label">Words</span>
                <span className={`grader-stat-value ${meetsMinWords ? "valid" : "invalid"}`}>
                  {stats.wordCount.toLocaleString()}
                </span>
              </div>
              <div className="grader-stat">
                <span className="grader-stat-label">Est. Minutes</span>
                <span className="grader-stat-value">{stats.estimatedMinutes}</span>
              </div>
              <div className="grader-stat">
                <span className="grader-stat-label">Questions</span>
                <span className="grader-stat-value">{stats.questionCount}</span>
              </div>
              <div className="grader-validation">
                {meetsMinWords ? (
                  <span className="grader-validation-success">✓ Ready to grade</span>
                ) : (
                  <span className="grader-validation-error">
                    Need {minWords - stats.wordCount} more words
                  </span>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              className="grade-modal-download-btn"
              onClick={handleSubmit}
              disabled={!meetsMinWords || isGrading}
            >
              {isGrading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Grading...
                </>
              ) : (
                <>
                  Grade This Call
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
