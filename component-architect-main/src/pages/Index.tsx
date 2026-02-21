import { motion } from "framer-motion";
import { Toaster } from "sonner";
import { LeftPanel } from "@/components/LeftPanel";
import { MiddlePanel } from "@/components/MiddlePanel";
import { RightPanel } from "@/components/RightPanel";
import { useComponentGenerator } from "@/hooks/useComponentGenerator";

const Index = () => {
  const generator = useComponentGenerator();

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "hsl(var(--background))" }}>
      {/* Left Panel - Controller */}
      <motion.div
        className="w-[30%] min-w-[280px] h-full flex-shrink-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <LeftPanel
          prompt={generator.prompt}
          setPrompt={generator.setPrompt}
          refinePrompt={generator.refinePrompt}
          setRefinePrompt={generator.setRefinePrompt}
          onGenerate={generator.generate}
          onRefine={generator.refine}
          isProcessing={generator.isProcessing}
          status={generator.status}
          statusMessage={generator.statusMessage}
          componentData={generator.componentData}
          hasGenerated={generator.hasGenerated}
        />
      </motion.div>

      {/* Middle Panel - Editor */}
      <motion.div
        className="w-[35%] h-full flex-shrink-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <MiddlePanel
          componentData={generator.componentData}
          isProcessing={generator.isProcessing}
        />
      </motion.div>

      {/* Right Panel - Preview */}
      <motion.div
        className="flex-1 h-full"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <RightPanel
          componentData={generator.componentData}
          isProcessing={generator.isProcessing}
        />
      </motion.div>

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "hsl(215 28% 17%)",
            border: "1px solid hsl(215 28% 25%)",
            color: "hsl(210 40% 98%)",
          },
        }}
      />
    </div>
  );
};

export default Index;
