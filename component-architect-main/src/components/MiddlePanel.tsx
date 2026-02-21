import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Editor from "@monaco-editor/react";
import { Copy, Check, Download, FileCode, FileText } from "lucide-react";
import { toast } from "sonner";
import { ComponentData } from "@/hooks/useComponentGenerator";

interface MiddlePanelProps {
  componentData: ComponentData | null;
  isProcessing: boolean;
}

type TabType = "typescript" | "html";

const MONACO_OPTIONS = {
  readOnly: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 13,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  fontLigatures: true,
  lineNumbers: "on" as const,
  renderLineHighlight: "line" as const,
  theme: "vs-dark",
  padding: { top: 16, bottom: 16 },
  scrollbar: {
    verticalScrollbarSize: 6,
    horizontalScrollbarSize: 6,
  },
  contextmenu: false,
  selectionHighlight: true,
  occurrencesHighlight: "off" as const,
  wordWrap: "on" as const,
  automaticLayout: true,
};

const SKELETON_CODE = `// Waiting for generation...
// Your Angular TypeScript component will appear here.

@Component({
  selector: 'app-generated',
  template: '<p>...</p>'
})
export class GeneratedComponent {
  // Component logic will be generated
}`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-elevated hover:bg-surface-hover border border-border/50 hover:border-primary/30 text-xs text-muted-foreground hover:text-foreground transition-all duration-200"
    >
      {copied ? (
        <>
          <Check size={12} className="text-success" />
          <span className="text-success">Copied!</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

export function MiddlePanel({ componentData, isProcessing }: MiddlePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("typescript");

  const currentCode =
    activeTab === "typescript"
      ? componentData?.ts || SKELETON_CODE
      : componentData?.html || "<!-- HTML template will appear here -->";

  const handleDownload = () => {
    if (!componentData) return;

    const combined = `// Angular Component - TypeScript\n${componentData.ts}\n\n// Angular Component - HTML Template\n/*\n${componentData.html}\n*/`;
    const blob = new Blob([combined], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated.component.ts";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded generated.component.ts");
  };

  return (
    <div className="flex flex-col h-full border-r border-border/50" style={{ background: "hsl(var(--surface))" }}>
      {/* Tab Bar */}
      <div className="flex items-center justify-between px-4 border-b border-border/50" style={{ background: "hsl(var(--background))" }}>
        <div className="flex items-center">
          <button
            className={`code-tab flex items-center gap-1.5 ${activeTab === "typescript" ? "active" : ""}`}
            onClick={() => setActiveTab("typescript")}
          >
            <FileCode size={13} />
            TypeScript
          </button>
          <button
            className={`code-tab flex items-center gap-1.5 ${activeTab === "html" ? "active" : ""}`}
            onClick={() => setActiveTab("html")}
          >
            <FileText size={13} />
            HTML
          </button>
        </div>

        <div className="flex items-center gap-2 py-2">
          <CopyButton text={currentCode} />
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden">
        {isProcessing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: "hsl(var(--surface) / 0.8)" }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Generating code...</span>
            </div>
          </div>
        )}

        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          <Editor
            height="100%"
            language={activeTab === "typescript" ? "typescript" : "html"}
            value={currentCode}
            theme="vs-dark"
            options={MONACO_OPTIONS}
            beforeMount={(monaco) => {
              monaco.editor.defineTheme("slate-dark", {
                base: "vs-dark",
                inherit: true,
                rules: [
                  { token: "comment", foreground: "4a5568", fontStyle: "italic" },
                  { token: "keyword", foreground: "6366f1" },
                  { token: "string", foreground: "22d3ee" },
                  { token: "number", foreground: "f59e0b" },
                  { token: "type", foreground: "a78bfa" },
                ],
                colors: {
                  "editor.background": "#0f172a",
                  "editor.foreground": "#f8fafc",
                  "editor.lineHighlightBackground": "#1e293b60",
                  "editor.selectionBackground": "#6366f130",
                  "editorGutter.background": "#0f172a",
                  "editorLineNumber.foreground": "#334155",
                  "editorLineNumber.activeForeground": "#6366f1",
                  "editor.inactiveSelectionBackground": "#6366f115",
                  "editorBracketMatch.background": "#6366f120",
                  "editorBracketMatch.border": "#6366f160",
                },
              });
              monaco.editor.setTheme("slate-dark");
            }}
          />
        </motion.div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/50" style={{ background: "hsl(var(--background))" }}>
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          {componentData ? (
            <>
              <span>{activeTab === "typescript" ? componentData.ts.split("\n").length : componentData.html.split("\n").length} lines</span>
              <span className="text-border">|</span>
              <span>Angular Component</span>
            </>
          ) : (
            <span>No component generated yet</span>
          )}
        </div>
        <button
          onClick={handleDownload}
          disabled={!componentData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={12} />
          Download .ts File
        </button>
      </div>
    </div>
  );
}
