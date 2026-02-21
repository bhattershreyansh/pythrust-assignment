import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

export type AgentStatus = "idle" | "thinking" | "writing" | "validating" | "done" | "error";

export interface ComponentData {
  ts: string;
  html: string;
  attempts: number;
  valid: boolean;
  errors: string[];
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseComponentGeneratorReturn {
  prompt: string;
  setPrompt: (p: string) => void;
  refinePrompt: string;
  setRefinePrompt: (p: string) => void;
  componentData: ComponentData | null;
  isProcessing: boolean;
  status: AgentStatus;
  statusMessage: string;
  history: HistoryMessage[];
  generate: () => Promise<void>;
  refine: () => Promise<void>;
  hasGenerated: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const STATUS_MESSAGES: Record<AgentStatus, string> = {
  idle: "Ready to build",
  thinking: "Analyzing your prompt...",
  writing: "Writing component code...",
  validating: "Validating design integrity...",
  done: "Component ready ✓",
  error: "Generation failed",
};

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [prompt, setPrompt] = useState("");
  const [refinePrompt, setRefinePrompt] = useState("");
  const [componentData, setComponentData] = useState<ComponentData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [hasGenerated, setHasGenerated] = useState(false);

  // FIX 1: Store history as clean code strings, NOT raw JSON blobs.
  // The assistant turn should be the generated TS+HTML so the LLM
  // understands what it previously built and can refine it properly.
  const [history, setHistory] = useState<HistoryMessage[]>([]);

  const statusMessage = STATUS_MESSAGES[status];

  const callAPI = useCallback(
    async (userPrompt: string, conversationHistory: HistoryMessage[]) => {
      setIsProcessing(true);
      setStatus("thinking");

      await new Promise((r) => setTimeout(r, 800));
      setStatus("writing");

      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          conversation_history: conversationHistory,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API error ${res.status}: ${errorText}`);
      }

      const data = await res.json();

      setStatus("validating");
      await new Promise((r) => setTimeout(r, 1500));

      if (data.attempts_made > 1) {
        toast.warning(`Self-correction triggered`, {
          description: `Validator caught issues — fixed in ${data.attempts_made} attempts`,
          icon: "⚡",
        });
      }

      if (!data.valid && data.errors?.length > 0) {
        toast.error("Validation warnings detected", {
          description: "Check the error log in the controller panel",
        });
      }

      return data;
    },
    []
  );

  const generate = useCallback(async () => {
    if (!prompt.trim() || isProcessing) return;

    try {
      // Fresh generate — clear history entirely
      const data = await callAPI(prompt, []);

      const newComponentData: ComponentData = {
        ts: data.ts_code || "",
        html: data.html_code || "",
        attempts: data.attempts_made || 1,
        valid: data.valid ?? true,
        errors: data.errors || [],
      };

      setComponentData(newComponentData);

      // FIX 2: Store the user prompt + the actual generated CODE as assistant
      // turn — not the raw API JSON. This gives the LLM proper context on
      // what it built so refinements work correctly.
      setHistory([
        { role: "user", content: prompt },
        {
          role: "assistant",
          content: `Here is the Angular component I generated:\n\nTypeScript:\n${data.ts_code}\n\n---HTML---\n${data.html_code}`,
        },
      ]);

      setStatus("done");
      setHasGenerated(true);
    } catch (err) {
      setStatus("error");
      toast.error("Failed to generate component", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [prompt, isProcessing, callAPI]);

  const refine = useCallback(async () => {
    if (!refinePrompt.trim() || isProcessing || !hasGenerated) return;

    try {
      // FIX 3: Pass existing history (user prompt + previous code as assistant)
      // then the new refinement request. The LLM now has full context of what
      // it built before and exactly what needs to change.
      const historyWithRefinement: HistoryMessage[] = [
        ...history,
        // Don't add the refinePrompt here — callAPI adds it via build_generation_prompt
        // on the backend. Adding it here would duplicate it.
      ];

      const data = await callAPI(refinePrompt, historyWithRefinement);

      const newComponentData: ComponentData = {
        ts: data.ts_code || "",
        html: data.html_code || "",
        attempts: data.attempts_made || 1,
        valid: data.valid ?? true,
        errors: data.errors || [],
      };

      setComponentData(newComponentData);

      // Update history: append the refinement prompt + new code
      setHistory((prev) => [
        ...prev,
        { role: "user", content: refinePrompt },
        {
          role: "assistant",
          content: `Here is the refined Angular component:\n\nTypeScript:\n${data.ts_code}\n\n---HTML---\n${data.html_code}`,
        },
      ]);

      setRefinePrompt("");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      toast.error("Failed to refine component", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [refinePrompt, isProcessing, hasGenerated, history, callAPI]);

  return {
    prompt,
    setPrompt,
    refinePrompt,
    setRefinePrompt,
    componentData,
    isProcessing,
    status,
    statusMessage,
    history,
    generate,
    refine,
    hasGenerated,
  };
}