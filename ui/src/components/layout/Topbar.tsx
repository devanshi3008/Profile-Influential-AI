import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, Send, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: `Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` },
  "/drafts": { title: "Content Drafts", subtitle: "Review and approve your weekly posts" },
  "/published": { title: "Published History", subtitle: "Tracking your LinkedIn growth" },
  "/analytics": { title: "Deep Analytics", subtitle: "Algorithmic insights and trends" },
  "/niche": { title: "Niche Analysis", subtitle: "Personal brand strategy" },
};

export function Topbar() {
  const location = useLocation();
  const [isRunning, setIsRunning] = useState(false);
  const info = pageTitles[location.pathname] || { title: "Booster", subtitle: "AI Management" };

  const handleRunCycle = async () => {
    setIsRunning(true);
    const promise = api.runCrew();
    toast.promise(promise, {
      loading: 'Triggering AI content cycle...',
      success: (data) => `Cycle started: ${data.message}`,
      error: 'Failed to start cycle',
    });
    try { await promise; } finally { setIsRunning(false); }
  };

  const handlePublishAll = async () => {
    const promise = api.publishApproved();
    toast.promise(promise, {
      loading: 'Publishing approved posts...',
      success: (data) => `Successfully published ${data.published} posts!`,
      error: 'Publication failed',
    });
  };

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold text-zinc-50 tracking-tight">
          {info.title}
        </h1>
        <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
          {info.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button 
          variant="secondary" 
          size="sm" 
          className="h-9 px-4 text-xs font-semibold gap-2 border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
          onClick={handleRunCycle}
          disabled={isRunning}
        >
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          Run cycle
        </Button>
        <Button 
          size="sm" 
          className="h-9 px-4 text-xs font-semibold gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
          onClick={handlePublishAll}
        >
          <Send className="w-3.5 h-3.5" />
          Publish approved
        </Button>
      </div>
    </header>
  );
}
