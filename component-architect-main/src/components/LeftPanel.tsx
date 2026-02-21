import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Send, RefreshCw, AlertTriangle, CheckCircle, Clock, Code2, Brain } from "lucide-react";
import { AgentStatus, ComponentData } from "@/hooks/useComponentGenerator";

interface LeftPanelProps {
  prompt: string;
  setPrompt: (p: string) => void;
  refinePrompt: string;
  setRefinePrompt: (p: string) => void;
  onGenerate: () => void;
  onRefine: () => void;
  isProcessing: boolean;
  status: AgentStatus;
  statusMessage: string;
  componentData: ComponentData | null;
  hasGenerated: boolean;
}

const STATUS_CONFIG: Record<AgentStatus, { color: string; bgColor: string; icon: React.ReactNode; pulse: boolean }> = {
  idle: {
    color: "text-muted-foreground",
    bgColor: "bg-muted-foreground/10",
    icon: <Clock size={14} />,
    pulse: false,
  },
  thinking: {
    color: "text-warning",
    bgColor: "bg-warning/10",
    icon: <Brain size={14} />,
    pulse: true,
  },
  writing: {
    color: "text-status-writing",
    bgColor: "bg-status-writing/10",
    icon: <Code2 size={14} />,
    pulse: true,
  },
  validating: {
    color: "text-primary",
    bgColor: "bg-primary/10",
    icon: <RefreshCw size={14} className="animate-spin-slow" />,
    pulse: true,
  },
  done: {
    color: "text-success",
    bgColor: "bg-success/10",
    icon: <CheckCircle size={14} />,
    pulse: false,
  },
  error: {
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    icon: <AlertTriangle size={14} />,
    pulse: false,
  },
};

const PROGRESS_STEPS: AgentStatus[] = ["thinking", "writing", "validating", "done"];

function getProgressWidth(status: AgentStatus): string {
  const idx = PROGRESS_STEPS.indexOf(status);
  if (idx === -1) return "0%";
  return `${((idx + 1) / PROGRESS_STEPS.length) * 100}%`;
}

export function LeftPanel({
  prompt,
  setPrompt,
  refinePrompt,
  setRefinePrompt,
  onGenerate,
  onRefine,
  isProcessing,
  status,
  statusMessage,
  componentData,
  hasGenerated,
}: LeftPanelProps) {
  const statusCfg = STATUS_CONFIG[status];
  const isActive = status !== "idle" && status !== "done" && status !== "error";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isProcessing) {
      onGenerate();
    }
  };

  const handleRefineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isProcessing) {
      onRefine();
    }
  };

  return (
    <div className="flex flex-col h-full glass-panel border-r border-border/50">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 border border-primary/30">
          <Sparkles size={16} className="text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gradient-primary">Guided Component Architect</h1>
          <p className="text-xs text-muted-foreground">Angular AI Generator</p>
        </div>
      </div>

      {/* Main Prompt Area */}
      <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
        {/* Prompt Input */}
        <div className="surface-panel rounded-lg p-3 border-glow focus-within:border-primary/50 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Describe your component</span>
          </div>
          <textarea
            className="prompt-textarea"
            placeholder="e.g. Create a responsive data table with sorting and pagination for a user management dashboard..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            rows={6}
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">⌘ + Enter to generate</span>
            <span className="text-xs text-muted-foreground">{prompt.length} chars</span>
          </div>
        </div>

        {/* Generate Button */}
        <button
          className="btn-generate w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          onClick={onGenerate}
          disabled={isProcessing || !prompt.trim()}
        >
          {isProcessing ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Zap size={16} />
              <span>Generate Component</span>
            </>
          )}
        </button>

        {/* Refinement Section */}
        <AnimatePresence>
          {hasGenerated && (
            <motion.div
              initial={{ opacity: 0, y: 12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -12, height: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="surface-panel rounded-lg p-3 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw size={12} className="text-primary/70" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Refine Component</span>
                </div>
                <input
                  type="text"
                  className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                  placeholder='e.g. "Add a dark mode toggle" or "Make it mobile responsive"'
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  onKeyDown={handleRefineKeyDown}
                  disabled={isProcessing}
                />
                <button
                  className="mt-3 w-full py-2 px-3 rounded-md bg-primary/15 border border-primary/30 text-primary text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={onRefine}
                  disabled={isProcessing || !refinePrompt.trim()}
                >
                  <Send size={13} />
                  Apply Changes
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Agent Status Center */}
        <div className="surface-panel rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent Status</span>
          </div>

          {/* Status Badge */}
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-2 px-3 py-2 rounded-md ${statusCfg.bgColor} mb-3`}
            >
              <span className={`${statusCfg.color} ${statusCfg.pulse ? "animate-pulse" : ""}`}>
                {statusCfg.icon}
              </span>
              <span className={`text-sm font-medium ${statusCfg.color}`}>{statusMessage}</span>
              {statusCfg.pulse && (
                <div className="ml-auto flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${statusCfg.color.replace("text-", "bg-")}`}
                      style={{
                        animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Progress Bar */}
          {isActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-3"
            >
              <div className="h-1 bg-surface-elevated rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: getProgressWidth(status) }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          )}

          {/* Stats */}
          {componentData && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 text-xs"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Attempts:</span>
                <span className={`font-mono font-semibold ${componentData.attempts > 1 ? "text-warning" : "text-success"}`}>
                  {componentData.attempts}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Valid:</span>
                <span className={`font-mono font-semibold ${componentData.valid ? "text-success" : "text-destructive"}`}>
                  {componentData.valid ? "✓" : "✗"}
                </span>
              </div>
            </motion.div>
          )}

          {/* Error Box */}
          <AnimatePresence>
            {componentData && componentData.errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <div className="error-alert-box rounded-md p-3 max-h-32 overflow-y-auto">
                  <div className="flex items-center gap-1.5 mb-2 font-sans">
                    <AlertTriangle size={12} />
                    <span className="font-medium font-sans text-xs">Validation Errors</span>
                  </div>
                  {componentData.errors.map((err, i) => (
                    <div key={i} className="mb-1 leading-relaxed">
                      <span className="text-destructive/60">›</span> {err}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
