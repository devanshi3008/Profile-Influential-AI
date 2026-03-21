import * as React from "react"
import { cn } from "@/lib/utils"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PersonalisationData, LinkedInProfile } from "@/lib/api";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  MessageSquare, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Briefcase,
  MapPin,
  ExternalLink,
  Plus,
  Save,
  X,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboardSummary,
    refetchInterval: 10000,
  });

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="Total Impressions" 
          value={data?.total_impressions.toLocaleString()} 
          delta={data?.impressions_delta_pct} 
          icon={TrendingUp} 
        />
        <MetricCard 
          label="Avg Engagement" 
          value={`${data?.avg_engagement_rate.toFixed(1)}%`} 
          delta={data?.engagement_delta_pp} 
          isPP
          icon={Activity} 
        />
        <MetricCard 
          label="Posts This Month" 
          value={data?.posts_this_month.toString()} 
          icon={MessageSquare} 
        />
        <MetricCard 
          label="Niche Confidence" 
          value={`${((data?.niche.confidence_score ?? 0) * 100).toFixed(0)}%`} 
          subtitle={data?.niche.primary_niche}
          icon={Target} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile and Personalisation Column */}
        <div className="lg:col-span-1 space-y-8">
           <ProfileCard profile={data?.profile} />
           <PersonalisationPanel />
        </div>

        {/* Charts and Niche Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Impressions Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Impressions Overview</CardTitle>
              <CardDescription>Weekly aggregates for the last 8 weeks</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.weekly_impressions}>
                  <XAxis dataKey="week" stroke="#52525b" fontSize={12} axisLine={false} tickLine={false} dy={10} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-xs">
                            <p className="text-zinc-400 mb-1">{payload[0].payload.week}</p>
                            <p className="font-bold text-zinc-100">{payload[0].value?.toLocaleString()} impressions</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="impressions" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Posts Section */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Posts</CardTitle>
              <CardDescription>Content with highest engagement this month</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y divide-zinc-800">
                 {data?.top_posts.map((post) => (
                    <div key={post.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <Badge variant="indigo" className="text-[10px] uppercase">{post.format_type}</Badge>
                          <Badge variant={post.tier === 'high' ? 'emerald' : 'amber'} className="text-[10px] uppercase text-zinc-900">{post.tier}</Badge>
                        </div>
                        <p className="text-sm text-zinc-300 truncate pr-4">{post.hook}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-zinc-100">{post.impressions.toLocaleString()}</p>
                        <p className="text-[10px] text-zinc-500 font-mono italic">{post.engagement_rate.toFixed(1)}% eng</p>
                      </div>
                    </div>
                 ))}
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Niche Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">{data?.niche.primary_niche}</CardTitle>
            <CardDescription>Current personalized branding strategy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-2">
               <div className="flex justify-between text-xs font-mono uppercase text-zinc-500">
                 <span>Strategy Alignment</span>
                 <span>{((data?.niche.confidence_score ?? 0) * 100).toFixed(0)}%</span>
               </div>
               <Progress value={(data?.niche.confidence_score ?? 0) * 100} className="h-1.5" />
             </div>
             
             <div className="space-y-3">
               <p className="text-xs font-mono uppercase text-zinc-500">Content Angles</p>
               {data?.niche.content_angles.map((angle, i) => (
                 <div key={i} className="flex items-start gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                   <p className="text-sm text-zinc-300 leading-tight">{angle}</p>
                 </div>
               ))}
             </div>
          </CardContent>
        </Card>

        {/* Insights Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Algorithm Insights</CardTitle>
            <CardDescription>Automated findings from your performance reports</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.latest_insights.map((insight, i) => (
               <div key={i} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/50 flex gap-4">
                 <div className={cn(
                   "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                   insight.type === 'up' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-500"
                 )}>
                   {insight.type === 'up' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                 </div>
                 <div className="space-y-1">
                   <p className="text-sm font-semibold text-zinc-100">{insight.finding}</p>
                   <p className="text-xs text-zinc-400 leading-relaxed">{insight.explanation}</p>
                 </div>
               </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileCard({ profile }: { profile: LinkedInProfile | null | undefined }) {
  if (!profile) {
    return (
      <Card className="bg-zinc-950 border-zinc-800 border-dashed">
        <CardContent className="py-10 flex flex-col items-center text-center px-6">
          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
             <AlertCircle className="w-6 h-6 text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Profile not loaded</p>
          <p className="text-xs text-zinc-500 mt-1">Check your LINKEDIN_PROFILE_URL and session</p>
        </CardContent>
      </Card>
    );
  }

  const initials = profile.full_name
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden group">
      <div className="h-12 bg-gradient-to-r from-indigo-950 to-purple-900" />
      <CardContent className="pt-0 relative px-6 pb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-4 border-zinc-950 flex items-center justify-center -mt-8 mb-3 shadow-lg group-hover:scale-105 transition-transform">
          <span className="text-white font-bold text-xl">{initials}</span>
        </div>
        
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-zinc-50">{profile.full_name}</h3>
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{profile.headline}</p>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="secondary" className="bg-zinc-900 text-zinc-400 border-zinc-800 text-[10px] gap-1 px-1.5">
            <Users className="w-3 h-3" />
            {profile.connections}
          </Badge>
          <Badge variant="secondary" className="bg-zinc-900 text-zinc-400 border-zinc-800 text-[10px] gap-1 px-1.5">
            <Briefcase className="w-3 h-3" />
            {profile.current_role}
          </Badge>
          <Badge variant="secondary" className="bg-zinc-900 text-zinc-400 border-zinc-800 text-[10px] gap-1 px-1.5">
            <MapPin className="w-3 h-3" />
            {profile.location}
          </Badge>
        </div>

        <div className="h-px bg-zinc-800 my-4" />

        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-mono uppercase text-zinc-500 mb-2">About</p>
            <p className="text-xs text-zinc-400 leading-relaxed italic">
              "{profile.about ? profile.about.slice(0, 200) + (profile.about.length > 200 ? "..." : "") : "No about section found"}"
            </p>
          </div>

          <div>
            <p className="text-[10px] font-mono uppercase text-zinc-500 mb-2">Top Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.slice(0, 8).map(skill => (
                <Badge key={skill} variant="outline" className="text-[10px] font-mono bg-zinc-900 border-zinc-800 text-zinc-400">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          <a 
            href={profile.profile_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-2"
          >
            <ExternalLink className="w-3 h-3" />
            {profile.profile_url.replace("https://www.", "")}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function PersonalisationPanel() {
  const queryClient = useQueryClient();
  const { data: initialData, isLoading } = useQuery({
    queryKey: ["personalisation"],
    queryFn: api.getPersonalisation,
  });

  const [data, setData] = React.useState<PersonalisationData>({
    skills: [],
    interests: [],
    post_ideas: [],
    topics_to_avoid: [],
    tone_descriptors: [],
    phrases_to_avoid: [],
  });

  React.useEffect(() => {
    if (initialData) setData(initialData);
  }, [initialData]);

  const mutation = useMutation({
    mutationFn: api.savePersonalisation,
    onSuccess: () => {
      queryClient.setQueryData(["personalisation"], data);
      toast.success("Settings saved");
    },
    onError: () => toast.error("Save failed"),
  });

  const addTag = (key: keyof PersonalisationData, val: string) => {
    if (!val.trim() || data[key].includes(val.trim())) return;
    setData(prev => ({ ...prev, [key]: [...prev[key], val.trim()] }));
  };

  const removeTag = (key: keyof PersonalisationData, tag: string) => {
    setData(prev => ({ ...prev, [key]: prev[key].filter(t => t !== tag) }));
  };

  if (isLoading) return <Skeleton className="h-[400px] w-full" />;

  return (
    <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden">
      <CardHeader className="border-b border-zinc-900 bg-zinc-900/10 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            AI Persona
          </CardTitle>
          <Button 
            size="sm" 
            className="h-7 px-2 text-[10px] gap-1 bg-indigo-600 hover:bg-indigo-500 text-white"
            onClick={() => mutation.mutate(data)}
            disabled={mutation.isPending}
          >
            <Save className="w-3 h-3" />
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="skills" className="w-full">
          <TabsList className="w-full justify-start rounded-none bg-zinc-900/50 border-b border-zinc-800 h-9 p-0">
            <TabsTrigger value="skills" className="text-[10px] uppercase font-mono px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent">Skills</TabsTrigger>
            <TabsTrigger value="ideas" className="text-[10px] uppercase font-mono px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent">Ideas</TabsTrigger>
            <TabsTrigger value="tone" className="text-[10px] uppercase font-mono px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent">Tone</TabsTrigger>
          </TabsList>
          
          <div className="p-4 space-y-4">
            <TabsContent value="skills" className="m-0 space-y-4">
              <TagField 
                label="Skills" 
                dataKey="skills" 
                tags={data.skills} 
                onAdd={addTag} 
                onRemove={removeTag} 
                colorClass="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
              />
              <TagField 
                label="Interests" 
                dataKey="interests" 
                tags={data.interests} 
                onAdd={addTag} 
                onRemove={removeTag} 
                colorClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              />
            </TabsContent>

            <TabsContent value="ideas" className="m-0 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-500">Post Ideas (one per line)</label>
                <Textarea 
                  className="bg-zinc-900 border-zinc-800 text-xs min-h-[100px] resize-none"
                  value={data.post_ideas.join("\n")}
                  onChange={e => setData(prev => ({ ...prev, post_ideas: e.target.value.split("\n") }))}
                />
              </div>
              <TagField 
                label="Avoid Topics" 
                dataKey="topics_to_avoid" 
                tags={data.topics_to_avoid} 
                onAdd={addTag} 
                onRemove={removeTag} 
                colorClass="bg-amber-500/10 text-amber-400 border-amber-500/20"
              />
            </TabsContent>

            <TabsContent value="tone" className="m-0 space-y-4">
              <TagField 
                label="Writing Tone" 
                dataKey="tone_descriptors" 
                tags={data.tone_descriptors} 
                onAdd={addTag} 
                onRemove={removeTag} 
              />
              <TagField 
                label="Avoid Phrases" 
                dataKey="phrases_to_avoid" 
                tags={data.phrases_to_avoid} 
                onAdd={addTag} 
                onRemove={removeTag} 
                colorClass="bg-amber-500/10 text-amber-400 border-amber-500/20"
              />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TagField({ label, dataKey, tags, onAdd, onRemove, colorClass = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" }: any) {
  const [val, setVal] = React.useState("");
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-mono uppercase text-zinc-500">{label}</label>
      <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-900 border border-zinc-800 rounded-md min-h-[60px] items-start">
        {tags.map((t: string) => (
          <Badge key={t} variant="secondary" className={cn("text-[9px] h-5 gap-1 pr-1 border shadow-sm", colorClass)}>
            {t}
            <X className="w-2.5 h-2.5 hover:text-white cursor-pointer" onClick={() => onRemove(dataKey, t)} />
          </Badge>
        ))}
        <Input 
          className="bg-transparent border-none focus-visible:ring-0 h-5 text-xs p-0 flex-1 min-w-[60px]"
          placeholder="Add..."
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onAdd(dataKey, val);
              setVal("");
            }
          }}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value, delta, isPP, icon: Icon, subtitle }: any) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 shadow-lg relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-12 h-12" />
      </div>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-2">
          <p className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider font-medium">{label}</p>
          <Icon className="w-4 h-4 text-zinc-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-zinc-50 tracking-tight">{value ?? "—"}</span>
          {delta !== undefined && (
            <Badge className={cn(
              "text-[10px] py-0 px-1.5 font-bold",
              delta >= 0 ? "bg-emerald-500 text-zinc-950" : "bg-red-500 text-zinc-950"
            )}>
              {delta >= 0 ? "+" : ""}{delta}{isPP ? "pp" : "%"}
            </Badge>
          )}
        </div>
        {subtitle && <p className="text-[10px] text-zinc-500 mt-1 truncate">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}


function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse p-8">
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-zinc-900" />)}
      </div>
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-1 space-y-8">
          <Skeleton className="h-[250px] rounded-xl bg-zinc-900" />
          <Skeleton className="h-[400px] rounded-xl bg-zinc-900" />
        </div>
        <div className="col-span-2 space-y-8">
           <Skeleton className="h-[400px] rounded-xl bg-zinc-900" />
           <Skeleton className="h-[300px] rounded-xl bg-zinc-900" />
        </div>
      </div>
    </div>
  );
}
