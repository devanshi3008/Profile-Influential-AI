import * as React from "react"
import { cn } from "@/lib/utils"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { api, PersonalisationData, LinkedInProfile, RunResult, PostDraft } from "@/lib/api";
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
  AlertCircle,
  Calendar,          // FIX: was used in JSX but never imported → runtime crash
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
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // FIX: capture taskId once from location.state into a ref so that the
  // navigate(..., { state: {} }) call we make on completion doesn't cause
  // taskId to flip back to null mid-poll and restart/kill the interval.
  const initialTaskId = useRef<string | null>(location.state?.taskId ?? null);
  const [taskId, setTaskId] = useState<string | null>(initialTaskId.current);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [generatedDrafts, setGeneratedDrafts] = useState<PostDraft[]>([]);
  const [generatedSchedules, setGeneratedSchedules] = useState<any[]>([]);
  const [hasCustomRun, setHasCustomRun] = useState<boolean>(false);
  const [showOverlay, setShowOverlay] = useState<boolean>(!!initialTaskId.current);

  useEffect(() => {
    if (!taskId) return;

    // FIX: deps array only contains taskId — navigate/queryClient/location.pathname
    // are stable references but including them caused the interval to be torn down
    // and recreated on every navigation event, producing duplicate polls.
    const interval = setInterval(async () => {
      try {
        const result = await api.getRunResult(taskId);
        console.log("RunResult polled:", result);
        setRunResult(result);

        if (result.status === "completed") {
          clearInterval(interval);

          // FIX: guard against undefined — backend initial dict was missing
          // the schedules key so result.schedules was undefined, not []
          const drafts = Array.isArray(result.drafts) ? result.drafts : [];
          const schedules = Array.isArray(result.schedules) ? result.schedules : [];

          console.log("Completed. Drafts:", drafts.length, "Schedules:", schedules.length);

          setGeneratedDrafts(drafts);
          setGeneratedSchedules(schedules);
          setHasCustomRun(true);

          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["drafts"] });

          // Clear the location state so a hard-refresh doesn't re-trigger the overlay
          navigate(location.pathname, { replace: true, state: {} });

          setTimeout(() => setShowOverlay(false), 1500);
          toast.success(`${drafts.length} AI drafts generated!`);

        } else if (result.status === "failed") {
          clearInterval(interval);
          setTimeout(() => setShowOverlay(false), 4000); // keep overlay to show error
        } else if (result.status === "not_found") {
          clearInterval(interval);
          setShowOverlay(false);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboardSummary,
    refetchInterval: showOverlay ? false : 30000, // FIX: was 10s → LinkedIn scrape every 10s; raised to 30s
  });

  if (isLoading && !showOverlay) return <DashboardSkeleton />;

  // FIX: confidence_score stored as e.g. 85 (not 0.85) in some DB rows →
  // clamp before multiplying so we never show 8500%
  const rawConfidence = data?.niche?.confidence_score ?? 0;
  const confidencePct = rawConfidence > 1
    ? Math.min(rawConfidence, 100)           // already a percentage (e.g. 85)
    : Math.min(rawConfidence * 100, 100);    // fraction (e.g. 0.85)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ── Agent orchestration overlay ── */}
      {showOverlay && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            {runResult?.status === "failed" ? (
              <div className="text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h2 className="text-xl font-bold text-zinc-50">Analysis Failed</h2>
                <p className="text-zinc-400 text-sm">{runResult.error || "An unexpected error occurred."}</p>
                <Button
                  onClick={() => { setShowOverlay(false); navigate("/setup"); }}
                  variant="outline"
                  className="mt-4 border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
                >
                  Return to Setup
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-zinc-50 mb-2">
                    {runResult?.status === "completed" ? "Analysis Complete!" : "AI Agent Orchestration"}
                  </h2>
                  <p className="text-zinc-400 text-sm h-5 font-mono">
                    {runResult?.current_step || "Initializing..."}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-zinc-500 uppercase tracking-wider">
                    <span>Progress</span>
                    <span>{runResult?.progress ?? 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000 ease-out rounded-full"
                      style={{ width: `${runResult?.progress ?? 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-center text-zinc-500 mt-4 italic">
                    This usually takes 30–90 seconds depending on profile complexity.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Impressions"
          value={data?.total_impressions?.toLocaleString() ?? "0"}
          delta={data?.impressions_delta_pct}
          icon={TrendingUp}
        />
        <MetricCard
          label="Avg Engagement"
          value={`${(data?.avg_engagement_rate ?? 0).toFixed(1)}%`}
          delta={data?.engagement_delta_pp}
          isPP
          icon={Activity}
        />
        <MetricCard
          label="Posts This Month"
          value={data?.posts_this_month?.toString() ?? "0"}
          icon={MessageSquare}
        />
        {/* FIX: clamp confidence so 85 stored in DB doesn't render as 8500% */}
        <MetricCard
          label="Niche Confidence"
          value={`${confidencePct.toFixed(0)}%`}
          subtitle={data?.niche?.primary_niche}
          icon={Target}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-8">
          <ProfileCard profile={data?.profile} />
          <PersonalisationPanel />
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-8">

          {/* Impressions chart */}
          <Card>
            <CardHeader>
              <CardTitle>Impressions Overview</CardTitle>
              <CardDescription>Weekly aggregates for the last 8 weeks</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.weekly_impressions ?? []}>
                  <XAxis dataKey="week" stroke="#52525b" fontSize={12} axisLine={false} tickLine={false} dy={10} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "rgba(99,102,241,0.1)" }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-xs">
                          <p className="text-zinc-400 mb-1">{payload[0].payload.week}</p>
                          <p className="font-bold text-zinc-100">{payload[0].value?.toLocaleString()} impressions</p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="impressions" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Drafts / top posts card */}
          <Card className={cn(
            "transition-all duration-500",
            hasCustomRun && "border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
          )}>
            <CardHeader>
              <CardTitle>{hasCustomRun ? "New AI-Generated Drafts" : "Top Performing Posts"}</CardTitle>
              <CardDescription>
                {hasCustomRun
                  ? `${generatedDrafts.length} draft${generatedDrafts.length !== 1 ? "s" : ""} ready — review your freshly generated content`
                  : "Content with highest engagement this month"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-800">
                {/* FIX: was checking hasCustomRun && generatedDrafts.length === 0 then
                    falling through to map — if hasCustomRun is true but drafts empty,
                    it showed the empty state correctly, but when drafts arrived the
                    conditional picked the wrong branch because of operator precedence.
                    Rewritten as an explicit if/else for clarity. */}
                {hasCustomRun ? (
                  generatedDrafts.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-sm">
                      No drafts were generated during this run.
                    </div>
                  ) : (
                    generatedDrafts.slice(0, 5).map((post: any) => (
                      <DraftRow key={post.id} post={post} onClick={() => navigate("/drafts")} isNew />
                    ))
                  )
                ) : (
                  (data?.top_posts ?? []).length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-sm">
                      No published posts yet. Run a cycle to generate drafts.
                    </div>
                  ) : (
                    (data?.top_posts ?? []).map((post: any) => (
                      <DraftRow key={post.id} post={post} isNew={false} />
                    ))
                  )
                )}

                {hasCustomRun && generatedDrafts.length > 0 && (
                  <div
                    className="p-3 text-center text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/20 cursor-pointer font-mono uppercase tracking-widest transition-colors"
                    onClick={() => navigate("/drafts")}
                  >
                    View all {generatedDrafts.length} drafts →
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Schedules card — only when we have them */}
          {hasCustomRun && generatedSchedules.length > 0 && (
            <Card className="border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all duration-500">
              <CardHeader>
                <CardTitle>Suggested Publishing Schedule</CardTitle>
                <CardDescription>When to post your new drafts for maximum impact</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-800">
                  {generatedSchedules.map((schedule: any, idx: number) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-indigo-950/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">Draft {idx + 1}</p>
                          <p className="text-xs text-zinc-400">
                            {new Date(schedule.scheduled_at).toLocaleDateString(undefined, {
                              weekday: "short", month: "short", day: "numeric",
                              hour: "numeric", minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase text-emerald-400 border-emerald-500/30 bg-emerald-950">
                        {schedule.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">{data?.niche?.primary_niche ?? "Niche not set"}</CardTitle>
            <CardDescription>Current personalized branding strategy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono uppercase text-zinc-500">
                <span>Strategy Alignment</span>
                <span>{confidencePct.toFixed(0)}%</span>
              </div>
              <Progress value={confidencePct} className="h-1.5" />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-mono uppercase text-zinc-500">Content Angles</p>
              {(data?.niche?.content_angles ?? []).map((angle: string, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <p className="text-sm text-zinc-300 leading-tight">{angle}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Algorithm Insights</CardTitle>
            <CardDescription>Automated findings from your performance reports</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data?.latest_insights ?? []).map((insight: any, i: number) => (
              <div key={i} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/50 flex gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  insight.type === "up" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-500"
                )}>
                  {insight.type === "up"
                    ? <ArrowUpRight className="w-5 h-5" />
                    : <ArrowDownRight className="w-5 h-5" />}
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

// ── Extracted draft/post row to remove duplicated JSX ──────────────────────
function DraftRow({ post, isNew, onClick }: { post: any; isNew: boolean; onClick?: () => void }) {
  return (
    <div
      className={cn(
        "p-4 flex flex-col justify-center transition-colors gap-2",
        isNew ? "hover:bg-indigo-950/30 cursor-pointer" : "hover:bg-zinc-800/50"
      )}
      onClick={onClick}
    >
      <div className="space-y-1 overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="indigo" className="text-[10px] uppercase">{post.format_type}</Badge>
          {post.tier && (
            <Badge
              variant={post.tier === "high" ? "emerald" : "amber"}
              className="text-[10px] uppercase text-zinc-900"
            >
              {post.tier}
            </Badge>
          )}
          {isNew && (
            <Badge variant="secondary" className="text-[10px] uppercase text-emerald-400 bg-emerald-950 border border-emerald-500/30">
              NEW DRAFT
            </Badge>
          )}
        </div>
        <p className="text-sm text-zinc-300 line-clamp-3 pr-4 leading-relaxed whitespace-pre-wrap">
          {post.hook || post.body}
        </p>
      </div>
      {!isNew && (
        <div className="text-left shrink-0 mt-2">
          <span className="text-sm font-semibold text-zinc-100">{post.impressions?.toLocaleString()} </span>
          <span className="text-[10px] text-zinc-500 font-mono italic">({post.engagement_rate?.toFixed(1)}% eng)</span>
        </div>
      )}
      {isNew && (
        <span className="text-[10px] text-indigo-400 flex items-center gap-1 font-mono uppercase mt-1">
          Click to Edit &amp; Publish <ExternalLink className="w-3 h-3" />
        </span>
      )}
    </div>
  );
}

// ── Profile card ────────────────────────────────────────────────────────────
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
    ? profile.full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden group">
      <div className="h-12 bg-gradient-to-r from-indigo-950 to-purple-900" />
      <CardContent className="pt-0 relative px-6 pb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-4 border-zinc-950 flex items-center justify-center -mt-8 mb-3 shadow-lg group-hover:scale-105 transition-transform">
          <span className="text-white font-bold text-xl">{initials}</span>
        </div>
        <div className="space-y-1">
          {/* FIX: was showing "Unknown" when full_name is null/empty from scraper */}
          <h3 className="text-base font-semibold text-zinc-50">
            {profile.full_name || "Profile loaded"}
          </h3>
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{profile.headline}</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="secondary" className="bg-zinc-900 text-zinc-400 border-zinc-800 text-[10px] gap-1 px-1.5">
            <Users className="w-3 h-3" />
            {profile.connections ?? "—"}
          </Badge>
          <Badge variant="secondary" className="bg-zinc-900 text-zinc-400 border-zinc-800 text-[10px] gap-1 px-1.5">
            <Briefcase className="w-3 h-3" />
            {profile.current_role ?? "—"}
          </Badge>
          <Badge variant="secondary" className="bg-zinc-900 text-zinc-400 border-zinc-800 text-[10px] gap-1 px-1.5">
            <MapPin className="w-3 h-3" />
            {profile.location ?? "—"}
          </Badge>
        </div>
        <div className="h-px bg-zinc-800 my-4" />
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-mono uppercase text-zinc-500 mb-2">About</p>
            <p className="text-xs text-zinc-400 leading-relaxed italic">
              "{profile.about
                ? profile.about.slice(0, 200) + (profile.about.length > 200 ? "…" : "")
                : "No about section found"}"
            </p>
          </div>
          {(profile.skills ?? []).length > 0 && (
            <div>
              <p className="text-[10px] font-mono uppercase text-zinc-500 mb-2">Top Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.slice(0, 8).map((skill: string) => (
                  <Badge key={skill} variant="outline" className="text-[10px] font-mono bg-zinc-900 border-zinc-800 text-zinc-400">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {profile.profile_url && (
            <a
              href={profile.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-2"
            >
              <ExternalLink className="w-3 h-3" />
              {profile.profile_url.replace("https://www.", "")}
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Personalisation panel (unchanged) ───────────────────────────────────────
function PersonalisationPanel() {
  const queryClient = useQueryClient();
  const { data: initialData, isLoading } = useQuery({
    queryKey: ["personalisation"],
    queryFn: api.getPersonalisation,
  });

  const [data, setData] = React.useState<PersonalisationData>({
    skills: [], interests: [], post_ideas: [],
    topics_to_avoid: [], tone_descriptors: [], phrases_to_avoid: [],
  });

  React.useEffect(() => { if (initialData) setData(initialData); }, [initialData]);

  const mutation = useMutation({
    mutationFn: api.savePersonalisation,
    onSuccess: () => { queryClient.setQueryData(["personalisation"], data); toast.success("Settings saved"); },
    onError: () => toast.error("Save failed"),
  });

  const addTag = (key: keyof PersonalisationData, val: string) => {
    if (!val.trim() || data[key].includes(val.trim())) return;
    setData(prev => ({ ...prev, [key]: [...prev[key], val.trim()] }));
  };
  const removeTag = (key: keyof PersonalisationData, tag: string) => {
    setData(prev => ({ ...prev, [key]: prev[key].filter((t: string) => t !== tag) }));
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
              <TagField label="Skills" dataKey="skills" tags={data.skills} onAdd={addTag} onRemove={removeTag} colorClass="bg-indigo-500/10 text-indigo-400 border-indigo-500/20" />
              <TagField label="Interests" dataKey="interests" tags={data.interests} onAdd={addTag} onRemove={removeTag} colorClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" />
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
              <TagField label="Avoid Topics" dataKey="topics_to_avoid" tags={data.topics_to_avoid} onAdd={addTag} onRemove={removeTag} colorClass="bg-amber-500/10 text-amber-400 border-amber-500/20" />
            </TabsContent>
            <TabsContent value="tone" className="m-0 space-y-4">
              <TagField label="Writing Tone" dataKey="tone_descriptors" tags={data.tone_descriptors} onAdd={addTag} onRemove={removeTag} />
              <TagField label="Avoid Phrases" dataKey="phrases_to_avoid" tags={data.phrases_to_avoid} onAdd={addTag} onRemove={removeTag} colorClass="bg-amber-500/10 text-amber-400 border-amber-500/20" />
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
          onKeyDown={e => { if (e.key === "Enter") { onAdd(dataKey, val); setVal(""); } }}
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
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-zinc-900" />)}
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
