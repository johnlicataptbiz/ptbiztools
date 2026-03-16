"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import { GradeModal } from "@/components/grader/GradeModal";
import { TOOL_BADGES } from "@/constants/tool-badges";
import { logAction, ActionTypes } from "@/lib/ptbiz-api";

import { PHASES, RED_FLAGS, MIN_WORDS } from "./constants";
import { getTranscriptStats, adaptLegacyGradeToResult } from "./utils";
import { useGrading } from "./hooks/useGrading";
import { useFileUpload } from "./hooks/useFileUpload";
import { useGradingProgress } from "./hooks/useGradingProgress";

import { TranscriptUpload } from "./TranscriptUpload";
import { CallDetails } from "./CallDetails";
import { GradingProgress } from "./GradingProgress";
import { PhaseCard } from "./PhaseCard";
import { RedFlagsPanel } from "./RedFlagsPanel";
import { ScoreBar } from "./ScoreBar";
import { FeedbackTab } from "./FeedbackTab";
import { SidePanel } from "./SidePanel";

export default function DiscoveryCallGrader() {
  // ── Core state ──────────────────────────────────────────────────────────
  const [transcript, setTranscript] = useState("");
  const [coachName, setCoachName] = useState("");
  const [clientName, setClientName] = useState("");
  const [callDate, setCallDate] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());

  // ── Tab / UI state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"grading" | "feedback">("grading");
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(PHASES.map((p) => [p.id, 0]))
  );
  const [phaseNotes, setPhaseNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(PHASES.map((p) => [p.id, ""]))
  );
  const [flags, setFlags] = useState<string[]>([]);
  const [openPhase, setOpenPhase] = useState<string | null>(null);
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [flagNotes, setFlagNotes] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);

  // ── Hooks ────────────────────────────────────────────────────────────────
  const { fileInputRef, handleFileUpload, handleInsertTemplate } =
    useFileUpload(setTranscript);

  const { grade, isGrading, isModalOpen, setIsModalOpen, handleGrade, handleGeneratePDF } =
    useGrading(transcript, coachName, clientName, callDate, sessionId);

  const { gradingElapsed, gradingPulseDots, gradingProgressPct, activeStage } =
    useGradingProgress(isGrading);

  // ── Derived values ───────────────────────────────────────────────────────
  const stats = useMemo(() => getTranscriptStats(transcript), [transcript]);
  const canGrade = stats.wordCount >= MIN_WORDS;

  const baseScore = useMemo(
    () => Object.values(scores).reduce((a, b) => a + b, 0),
    [scores]
  );
  const deductions = useMemo(
    () =>
      flags.reduce((sum, id) => {
        const f = RED_FLAGS.find((x) => x.id === id);
        return sum + (f ? f.deduction : 0);
      }, 0),
    [flags]
  );
  const totalScore = Math.max(0, baseScore + deductions);

  // ── Session start ────────────────────────────────────────────────────────
  useEffect(() => {
    void logAction({
      actionType: ActionTypes.SESSION_STARTED,
      description: "User started a new grading session",
      sessionId,
    });
  }, [sessionId]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const onScore = useCallback((id: string, val: number) => {
    setScores((p) => ({ ...p, [id]: val }));
  }, []);

  const onNotes = useCallback((id: string, val: string) => {
    setPhaseNotes((p) => ({ ...p, [id]: val }));
  }, []);

  const onToggleFlag = useCallback((id: string) => {
    setFlags((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleReset = useCallback(() => {
    setScores(Object.fromEntries(PHASES.map((p) => [p.id, 0])));
    setPhaseNotes(Object.fromEntries(PHASES.map((p) => [p.id, ""])));
    setFlags([]);
    setStrengths("");
    setImprovements("");
    setFlagNotes("");
    setOpenPhase(null);
    setShowResetConfirm(false);
    setSelectedOutcome(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="grader-page">
      <div className="container tool-page">
        <div className="no-print" style={{ textAlign: "center", marginBottom: "16px" }}>
          <h1 className="tool-page-title" style={{ margin: "0 0 6px 0", fontSize: "22px" }}>
            Discovery Call Grader
          </h1>
          <p className="tool-page-subtitle" style={{ margin: 0, fontSize: "13px" }}>
            Grade discovery calls and export a coach-ready report.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="grader-tabs">
          {(["grading", "feedback"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`grader-tab ${activeTab === tab ? "active" : ""}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <motion.div
          className="grader-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* ── GRADING TAB ── */}
          {activeTab === "grading" && (
            <div className="grader-workbench">
              <section className="grader-main-pane">
                <TranscriptUpload
                  transcript={transcript}
                  onTranscriptChange={setTranscript}
                  onFileUpload={handleFileUpload}
                  onInsertTemplate={handleInsertTemplate}
                  fileInputRef={fileInputRef}
                />

                {/* Grade / Reset actions */}
                <div className="form-actions">
                  {!showResetConfirm ? (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowResetConfirm(true)}
                      disabled={!transcript && totalScore === 0}
                    >
                      <RotateCcw size={16} />
                      Reset
                    </button>
                  ) : (
                    <div className="reset-confirm">
                      <button className="reset-confirm-btn confirm" onClick={handleReset}>
                        Confirm
                      </button>
                      <button
                        className="reset-confirm-btn cancel"
                        onClick={() => setShowResetConfirm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={handleGrade}
                    disabled={!canGrade || isGrading}
                  >
                    {isGrading ? (
                      <>
                        <span className="spinner" />
                        Grading...
                      </>
                    ) : (
                      <>
                        Grade with AI
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>

                {isGrading && (
                  <GradingProgress
                    gradingElapsed={gradingElapsed}
                    gradingPulseDots={gradingPulseDots}
                    gradingProgressPct={gradingProgressPct}
                    activeStage={activeStage}
                  />
                )}

                <CallDetails
                  coachName={coachName}
                  clientName={clientName}
                  callDate={callDate}
                  selectedOutcome={selectedOutcome}
                  onCoachName={setCoachName}
                  onClientName={setClientName}
                  onCallDate={setCallDate}
                  onOutcome={setSelectedOutcome}
                />

                <div style={{ marginTop: "24px" }}>
                  {PHASES.map((p) => (
                    <PhaseCard
                      key={p.id}
                      phase={p}
                      score={scores[p.id]}
                      notes={phaseNotes[p.id]}
                      onScore={onScore}
                      onNotes={onNotes}
                      isOpen={openPhase === p.id}
                      onToggle={(id) => setOpenPhase(openPhase === id ? null : id)}
                    />
                  ))}
                </div>

                <div style={{ marginTop: "8px" }}>
                  <RedFlagsPanel flags={flags} onToggle={onToggleFlag} />
                </div>

                <ScoreBar
                  baseScore={baseScore}
                  deductions={deductions}
                  totalScore={totalScore}
                />
              </section>

              <SidePanel
                stats={transcript.trim() ? stats : null}
                redFlagCount={flags.length}
                totalScore={totalScore}
              />
            </div>
          )}

          {/* ── FEEDBACK TAB ── */}
          {activeTab === "feedback" && (
            <FeedbackTab
              strengths={strengths}
              improvements={improvements}
              flagNotes={flagNotes}
              onStrengths={setStrengths}
              onImprovements={setImprovements}
              onFlagNotes={setFlagNotes}
            />
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {isModalOpen && grade && (
          <GradeModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            result={adaptLegacyGradeToResult(grade)}
            badgeSrc={TOOL_BADGES.discovery}
            badgeAlt="Discovery Call Grader"
            title="Discovery Call Audit"
            subtitle="AI-powered call analysis & coaching insights"
            coachName={coachName}
            setCoachName={setCoachName}
            clientName={clientName}
            setClientName={setClientName}
            callDate={callDate}
            setCallDate={setCallDate}
            onGeneratePDF={handleGeneratePDF}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
