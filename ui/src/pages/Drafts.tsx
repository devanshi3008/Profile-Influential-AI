import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils"
import { api, PostDraft } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Check, 
  X, 
  Edit3, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Quote,
  CalendarDays
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function Drafts() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");

  const { data: drafts, isLoading } = useQuery({
    queryKey: ["drafts", activeTab],
    queryFn: () => api.getDrafts(activeTab),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => api.updateDraft(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-64" />)}</div>;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">This week's drafts</h2>
        <p className="text-zinc-500 text-sm">Generated for {drafts?.[0]?.niche ?? "your niche"}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <div className="mt-8 space-y-6">
          {drafts?.length === 0 ? (
            <Card className="border-dashed border-zinc-800 bg-transparent flex flex-col items-center justify-center p-12">
               <p className="text-zinc-500 italic">No {activeTab} drafts found.</p>
            </Card>
          ) : (
            drafts?.map((draft) => (
              <DraftCard 
                key={draft.id} 
                draft={draft} 
                onStatusUpdate={(status) => {
                  updateMutation.mutate({ id: draft.id, data: { status } });
                  toast.success(`Draft marked as ${status}`);
                }}
                onEdit={(body) => {
                  updateMutation.mutate({ id: draft.id, data: { body } });
                  toast.success("Draft updated successfully");
                }}
              />
            ))
          )}
        </div>
      </Tabs>
      
      {activeTab === 'approved' && drafts && drafts.length > 0 && (
         <div className="fixed bottom-8 right-8 animate-in zoom-in duration-300">
           <Button 
             className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 shadow-2xl px-6 gap-2"
             onClick={() => {
               toast.promise(api.publishApproved(), {
                 loading: 'Publishing approved posts...',
                 success: 'Posts published!',
                 error: 'Failed to publish'
               });
             }}
           >
             <Check className="w-5 h-5" />
             Publish {drafts.length} approved posts
           </Button>
         </div>
      )}
    </div>
  );
}

function DraftCard({ draft, onStatusUpdate, onEdit }: { draft: PostDraft, onStatusUpdate: (s: string) => void, onEdit: (b: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editText, setEditText] = useState(draft.body);

  const formatColors: Record<string, string> = {
    STORYTELLING: "purple",
    TIPS: "blue",
    OPINION: "amber",
    "HOW-TO": "emerald",
  };

  return (
    <Card className={cn(
      "transition-all duration-300",
      draft.status === 'approved' ? "border-emerald-500/50 bg-emerald-500/[0.02]" : "hover:border-zinc-700"
    )}>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3">
          <Badge variant={formatColors[draft.format_type.toUpperCase()] as any || "secondary"} className="uppercase">
            {draft.format_type}
          </Badge>
          <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-mono">
            <Clock className="w-3 h-3" />
            {Math.floor(draft.estimated_read_time / 60)}m read
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="indigo" className="text-[10px] py-0 px-2 uppercase">AI Predicted High</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-lg font-semibold text-zinc-100 leading-snug">{draft.hook}</p>
        
        <div className="relative">
          <div className={cn(
            "text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap transition-all",
            !expanded && "line-clamp-3"
          )}>
            {draft.body}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-zinc-500 hover:text-zinc-300 h-6 px-0 mt-1 gap-1 text-[11px]" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Show less" : "Show more"}
          </Button>
        </div>

        <div className="flex items-start gap-2 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
          <Quote className="w-3 h-3 text-zinc-600 shrink-0 mt-1" />
          <p className="text-xs italic text-zinc-400 leading-relaxed">{draft.cta}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {draft.hashtags.map((h, i) => (
            <span key={i} className="text-[10px] font-mono text-zinc-500">#{h}</span>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex-row justify-between border-t border-zinc-800/50 pt-4">
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-mono tracking-wider">
           <CalendarDays className="w-3 h-3" />
           {new Date(draft.scheduled_for).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog>
             <DialogTrigger asChild>
               <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[11px] border-zinc-800 bg-zinc-900">
                 <Edit3 className="w-3 h-3" /> Edit
               </Button>
             </DialogTrigger>
             <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800">
               <DialogHeader>
                 <DialogTitle>Edit post draft</DialogTitle>
                 <DialogDescription>Refine the hook and body before publishing.</DialogDescription>
               </DialogHeader>
               <div className="space-y-4 py-4">
                  <Textarea 
                    value={editText} 
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[300px] bg-zinc-900 border-zinc-800 focus:ring-indigo-500" 
                  />
                  <div className="text-right text-[10px] font-mono text-zinc-500">
                    {editText.length} characters
                  </div>
               </div>
               <DialogFooter>
                 <DialogTrigger asChild>
                    <Button variant="ghost" className="text-xs">Cancel</Button>
                 </DialogTrigger>
                 <DialogTrigger asChild>
                    <Button onClick={() => onEdit(editText)} className="bg-indigo-600 hover:bg-indigo-500 text-xs">Save changes</Button>
                 </DialogTrigger>
               </DialogFooter>
             </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-1.5 text-[11px] border-zinc-800 bg-zinc-900 text-red-400 hover:text-red-300"
            onClick={() => onStatusUpdate('rejected')}
          >
            <X className="w-3 h-3" /> Reject
          </Button>

          <Button 
            size="sm" 
            className="h-8 gap-1.5 text-[11px] bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20"
            onClick={() => onStatusUpdate('approved')}
          >
            <Check className="w-3 h-3" /> Approve
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
