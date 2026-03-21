import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PersonalisationData } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Plus, Save, Sliders } from "lucide-react";
import { toast } from "sonner";

export default function Personalise() {
  const queryClient = useQueryClient();
  const { data: initialData, isLoading } = useQuery({
    queryKey: ["personalisation"],
    queryFn: api.getPersonalisation,
  });

  const [data, setData] = useState<PersonalisationData>({
    skills: [],
    interests: [],
    post_ideas: [],
    topics_to_avoid: [],
    tone_descriptors: [],
    phrases_to_avoid: [],
  });

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const mutation = useMutation({
    mutationFn: api.savePersonalisation,
    onSuccess: () => {
      queryClient.setQueryData(["personalisation"], data);
      toast.success("Personalisation saved successfully");
    },
    onError: () => {
      toast.error("Failed to save personalisation");
    },
  });

  const addTag = (key: keyof PersonalisationData, value: string) => {
    if (!value.trim()) return;
    if (data[key].includes(value.trim())) return;
    setData((prev) => ({
      ...prev,
      [key]: [...prev[key], value.trim()],
    }));
  };

  const removeTag = (key: keyof PersonalisationData, tag: string) => {
    setData((prev) => ({
      ...prev,
      [key]: prev[key].filter((t) => t !== tag),
    }));
  };

  const TagInput = ({ 
    label, 
    dataKey, 
    placeholder, 
    colorClass = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
  }: { 
    label: string, 
    dataKey: keyof PersonalisationData, 
    placeholder: string,
    colorClass?: string
  }) => {
    const [inputValue, setInputValue] = useState("");

    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</label>
        <div className="flex flex-wrap gap-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg min-h-[100px] items-start">
          {data[dataKey].map((tag) => (
            <Badge 
              key={tag} 
              variant="secondary" 
              className={`flex items-center gap-1 py-1 px-2 ${colorClass}`}
            >
              {tag}
              <button 
                onClick={() => removeTag(dataKey, tag)}
                className="hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(dataKey, inputValue);
                setInputValue("");
              }
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none focus-visible:ring-0 h-7 text-sm min-w-[120px]"
          />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[300px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-50 flex items-center gap-3">
            <Sliders className="w-8 h-8 text-indigo-500" />
            Personalise Agent
          </h1>
          <p className="text-zinc-500 mt-1">
            Steer the AI by defining your skills, interests, and writing style.
          </p>
        </div>
        <Button 
          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 h-12 px-6 shadow-lg shadow-indigo-500/20"
          onClick={() => mutation.mutate(data)}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save All Changes
        </Button>
      </div>

      <div className="grid gap-8">
        {/* Skills & Interests */}
        <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden hover:border-zinc-700 transition-colors">
          <CardHeader className="border-b border-zinc-900 bg-zinc-900/20 px-8 py-6">
            <CardTitle className="text-xl">Skills & Interests</CardTitle>
            <CardDescription>Tell the AI what you excel at and what topics you want to be known for.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <TagInput 
              label="Professional Skills" 
              dataKey="skills" 
              placeholder="Type skill & press Enter (e.g. React, Python, Product Strategy)" 
              colorClass="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            />
            <TagInput 
              label="Topics & Interests" 
              dataKey="interests" 
              placeholder="Type interest & press Enter (e.g. AI Trends, Remote Work, Fintech)" 
              colorClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            />
          </CardContent>
        </Card>

        {/* Content Strategy */}
        <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden hover:border-zinc-700 transition-colors">
          <CardHeader className="border-b border-zinc-900 bg-zinc-900/20 px-8 py-6">
            <CardTitle className="text-xl">Content Strategy</CardTitle>
            <CardDescription>Draft specific concepts or define boundaries for the AI's creativity.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Post Ideas (Raw Concepts)</label>
              <Textarea 
                value={data.post_ideas.join("\n")}
                onChange={(e) => setData(prev => ({ ...prev, post_ideas: e.target.value.split("\n") }))}
                placeholder="Ex: My routine for learning new tech&#10;Why I prefer SQL over NoSQL&#10;The biggest challenge in scaling my team"
                className="min-h-[150px] bg-zinc-900/50 border-zinc-800 focus:border-indigo-500/50 resize-none font-sans"
              />
              <p className="text-[10px] text-zinc-500">One idea per line. The AI will flesh these out into full LinkedIn posts.</p>
            </div>
            <TagInput 
              label="Topics to Avoid" 
              dataKey="topics_to_avoid" 
              placeholder="e.g. Politics, Unfiltered personal life, Crypto" 
              colorClass="bg-amber-500/10 text-amber-400 border-amber-500/20"
            />
          </CardContent>
        </Card>

        {/* Tone & Style */}
        <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden hover:border-zinc-700 transition-colors">
          <CardHeader className="border-b border-zinc-900 bg-zinc-900/20 px-8 py-6">
            <CardTitle className="text-xl">Tone & Style</CardTitle>
            <CardDescription>Fine-tune the voice of your AI agent.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <TagInput 
              label="Tone Descriptors" 
              dataKey="tone_descriptors" 
              placeholder="e.g. Conversational, First-person, Sarcastic, Data-driven" 
              colorClass="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            />
            <TagInput 
              label="Phrases to Avoid" 
              dataKey="phrases_to_avoid" 
              placeholder="e.g. Excited to share, Game changer, Synergy, Thoughts?" 
              colorClass="bg-amber-500/10 text-amber-400 border-amber-500/20"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
