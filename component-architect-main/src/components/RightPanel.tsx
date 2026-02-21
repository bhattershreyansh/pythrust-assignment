import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Loader2 } from "lucide-react";
import { ComponentData } from "@/hooks/useComponentGenerator";

// Dynamically import StackBlitz SDK to avoid SSR issues
let sdk: any = null;
if (typeof window !== "undefined") {
  import("@stackblitz/sdk").then((m) => {
    sdk = m.default;
  });
}

interface RightPanelProps {
  componentData: ComponentData | null;
  isProcessing: boolean;
}

const EMPTY_STATE_ILLUSTRATION = (
  <svg width="180" height="160" viewBox="0 0 180 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="20" width="140" height="95" rx="8" fill="hsl(215 28% 17%)" stroke="hsl(239 84% 67% / 0.3)" strokeWidth="1.5" />
    <rect x="30" y="30" width="120" height="70" rx="4" fill="hsl(222 47% 7%)" />
    <rect x="38" y="42" width="60" height="4" rx="2" fill="hsl(239 84% 67% / 0.4)" />
    <rect x="38" y="52" width="85" height="4" rx="2" fill="hsl(215 20% 40%)" />
    <rect x="38" y="62" width="45" height="4" rx="2" fill="hsl(200 80% 55% / 0.4)" />
    <rect x="46" y="72" width="70" height="4" rx="2" fill="hsl(215 20% 35%)" />
    <rect x="46" y="82" width="55" height="4" rx="2" fill="hsl(239 84% 67% / 0.3)" />
    <rect x="38" y="92" width="40" height="4" rx="2" fill="hsl(215 20% 40%)" />
    <rect x="75" y="115" width="30" height="16" rx="2" fill="hsl(215 28% 17%)" />
    <rect x="55" y="131" width="70" height="6" rx="3" fill="hsl(215 28% 17%)" stroke="hsl(239 84% 67% / 0.2)" strokeWidth="1" />
    <circle cx="155" cy="25" r="3" fill="hsl(239 84% 67% / 0.6)" />
    <circle cx="165" cy="40" r="2" fill="hsl(239 84% 67% / 0.4)" />
    <circle cx="148" cy="42" r="1.5" fill="hsl(239 84% 67% / 0.3)" />
    <circle cx="25" cy="118" r="2.5" fill="hsl(200 80% 55% / 0.4)" />
    <circle cx="15" cy="130" r="1.5" fill="hsl(200 80% 55% / 0.3)" />
  </svg>
);

export function RightPanel({ componentData, isProcessing }: RightPanelProps) {
  // Use a stable container div that is ALWAYS mounted (never conditionally rendered)
  // This ensures containerRef.current is always valid when the effect runs
  const containerRef = useRef<HTMLDivElement>(null);
  const vmRef = useRef<any>(null);
  const embedInProgressRef = useRef(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  // Wait for SDK to load dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;
    import("@stackblitz/sdk").then((m) => {
      sdk = m.default;
      setSdkReady(true);
    });
  }, []);

  useEffect(() => {
    // Guard: no data, sdk not ready, container not mounted, or embed already running
    if (!componentData || !sdkReady || !containerRef.current || embedInProgressRef.current) return;

    setPreviewError(null);

    const clean = (code: string) =>
      code.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();

    const tsCode = clean(componentData.ts);
    const htmlCode = clean(componentData.html);

    const hasInlineTemplate = /template\s*:\s*[`'"]/.test(tsCode);
    const hasTemplateUrl = /templateUrl\s*:\s*['"]/i.test(tsCode);

    // Accept code when either a separate HTML part exists, or the TS contains
    // an inline `template`. If `templateUrl` is present but no html part was
    // provided, treat it as an error.
    if (!tsCode || (!htmlCode && !hasInlineTemplate && !hasTemplateUrl)) {
      setPreviewError("Generated code is empty. Try regenerating.");
      return;
    }

    if (hasTemplateUrl && !htmlCode) {
      setPreviewError("Component references a templateUrl but no HTML was provided.");
      return;
    }

    const selectorMatch = tsCode.match(/selector:\s*['"]([^'"]+)['"]/);
    const classMatch = tsCode.match(/export\s+class\s+([A-Z][A-Za-z0-9_]*)/);
    let selector = selectorMatch?.[1];
    const className = classMatch?.[1] ?? "AppComponent";

    // If no explicit selector provided, derive from the exported class name (kebab-case)
    if (!selector) {
      if (classMatch?.[1]) {
        selector = classMatch[1]
          .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
          .replace(/[_\s]+/g, "-")
          .toLowerCase();
      } else {
        selector = "app-root"; // final fallback
      }
    }

    // Ensure selector contains a dash (custom elements / semantic tag). If not, prefix with `app-`.
    if (!selector.includes("-")) {
      selector = `app-${selector}`;
    }

    const files: Record<string, string> = {
      "src/main.ts": `
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ${className} } from './app/app.component';
bootstrapApplication(${className}, { providers: [provideAnimations()] })
  .catch(err => console.error(err));
`.trim(),

      "src/index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Preview</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body class="bg-slate-950 text-slate-50" style="margin:0">
  <${selector}>Loading...</${selector}>
</body>
</html>`.trim(),

      "src/styles.css": "body { margin: 0; font-family: 'Inter', sans-serif; }",
      "src/app/app.component.ts": tsCode,
      ...(htmlCode ? { "src/app/app.component.html": htmlCode } : {}),
      "src/app/app.component.css": ":host { display: block; }",

      // Minimal tsconfig so StackBlitz doesn't complain
      "tsconfig.json": JSON.stringify({
        compileOnSave: false,
        compilerOptions: {
          outDir: "./dist/out-tsc",
          strict: true,
          noImplicitOverride: true,
          noPropertyAccessFromIndexSignature: true,
          noImplicitReturns: true,
          noFallthroughCasesInSwitch: true,
          esModuleInterop: true,
          sourceMap: true,
          declaration: false,
          downlevelIteration: true,
          experimentalDecorators: true,
          moduleResolution: "node",
          importHelpers: true,
          target: "ES2022",
          module: "ES2022",
          useDefineForClassFields: false,
          lib: ["ES2022", "dom"],
        },
        angularCompilerOptions: {
          enableI18nLegacyMessageIdFormat: false,
          strictInjectionParameters: true,
          strictInputAccessModifiers: true,
          strictTemplates: true,
        },
      }, null, 2),
    };

    const updatePreview = async () => {
      embedInProgressRef.current = true;
      try {
        if (vmRef.current) {
          // Hot-update existing sandbox — much faster than re-embedding
          await vmRef.current.applyFsDiff({
            create: files,
            destroy: [],
          });
        } else {
          // First time — do a full embed
          // Small delay to ensure the container div has painted
          await new Promise((r) => setTimeout(r, 150));

          if (!containerRef.current) return; // safety check after await

          const vm = await sdk.embedProject(
            containerRef.current,
            {
              title: "Guided Component Preview",
              template: "angular-cli",
              files,
              settings: {
                compile: { trigger: "auto", clearConsole: false },
              },
            },
            {
              height: "100%",
              width: "100%",
              hideNavigation: true,
              hideDevTools: true,
              forceEmbedLayout: true,
              theme: "dark",
              view: "preview",
              clickToLoad: false,
            }
          );
          vmRef.current = vm;
        }
      } catch (err: any) {
        console.error("StackBlitz Preview Error:", err);
        setPreviewError("Preview failed to load. Check the console for details.");
        // Reset so next generate attempt tries a fresh embed
        vmRef.current = null;
      } finally {
        embedInProgressRef.current = false;
      }
    };

    updatePreview();
  }, [componentData, sdkReady]);

  return (
    <div className="flex flex-col h-full" style={{ background: "hsl(var(--surface))" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b border-border/50"
        style={{ background: "hsl(var(--background))" }}
      >
        <div className="flex items-center gap-3">
          <Monitor size={15} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Real-time Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success live-dot" />
          <span className="text-xs text-success font-medium">Live</span>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 relative overflow-hidden">

        {/* 
          IMPORTANT: containerRef div is ALWAYS rendered, never conditionally mounted.
          This prevents the ref from becoming null between renders, which was the
          main cause of the StackBlitz embed silently failing.
          We just hide it with CSS when it's not needed.
        */}
        <div
          ref={containerRef}
          className="absolute inset-0 w-full h-full"
          style={{ visibility: componentData ? "visible" : "hidden" }}
        />

        {/* Empty state — shown on top when no data */}
        <AnimatePresence>
          {!componentData && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center p-8 z-10"
              style={{ background: "hsl(var(--background))" }}
            >
              <div className="flex flex-col items-center gap-5 text-center max-w-xs">
                <div className="relative">
                  <div className="absolute inset-0 blur-2xl opacity-20 bg-primary rounded-full scale-150" />
                  <div className="relative">{EMPTY_STATE_ILLUSTRATION}</div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Build?</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Describe your Angular component and click{" "}
                    <span className="text-primary font-medium">Generate Component</span> to see it live here.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs text-primary font-medium">Powered by Angular CLI + StackBlitz</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading overlay — shown on top of the embed while processing */}
        <AnimatePresence>
          {isProcessing && componentData && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-20"
              style={{ background: "hsl(var(--background) / 0.85)", backdropFilter: "blur(4px)" }}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-2 border-primary/20 rounded-full" />
                  <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-primary rounded-full animate-spin" />
                  <div className="absolute inset-2 w-12 h-12 border border-primary/10 rounded-full" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Building component...</p>
                  <p className="text-xs text-muted-foreground mt-1">Preview will update automatically</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        <AnimatePresence>
          {previewError && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-4 left-4 right-4 z-30 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10"
            >
              <p className="text-xs text-red-400">{previewError}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {componentData && (
        <div
          className="px-4 py-2 border-t border-border/50 flex items-center gap-2"
          style={{ background: "hsl(var(--background))" }}
        >
          <Loader2 size={11} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Rendered in StackBlitz sandbox</span>
        </div>
      )}
    </div>
  );
}