import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { 
  Trophy, 
  AlertCircle, 
  Lightbulb, 
  Clock,
  Zap,
  Flame
} from "lucide-react";

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b'];

export function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.getAnalyticsSummary(30),
  });

  if (isLoading) return <AnalyticsSkeleton />;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Performance Analytics</h2>
        <p className="text-zinc-500 text-sm">Deep dive into content dynamics and algorithmic reach</p>
      </div>

      {/* Main Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Impression Velocity</CardTitle>
          <CardDescription>Daily impressions for the last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.impressions_over_time}>
              <defs>
                <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis 
                dataKey="date" 
                stroke="#52525b" 
                fontSize={10} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(str) => {
                  const d = new Date(str);
                  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis 
                stroke="#52525b" 
                fontSize={10} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(val) => `${(val/1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '11px' }}
                itemStyle={{ color: '#indigo-400' }}
              />
              <Area 
                type="monotone" 
                dataKey="impressions" 
                stroke="#6366f1" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorImp)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Format Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Format Efficiency</CardTitle>
            <CardDescription>Which content types resonate best?</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.format_performance}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="avg_impressions"
                  nameKey="format_type"
                >
                  {data?.format_performance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Algorithm Recommendations */}
        <Card>
          <CardHeader>
             <div className="flex items-center gap-2">
               <Flame className="w-5 h-5 text-amber-500" />
               <CardTitle>Algorithm Insights</CardTitle>
             </div>
            <CardDescription>Directives for your next content cycle</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {data?.recommendation_history[0]?.content_recs.slice(0, 3).map((rec, i) => (
               <div key={i} className="flex gap-4 p-4 rounded-xl bg-indigo-500/[0.03] border border-indigo-500/10">
                 <Zap className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                 <p className="text-sm text-zinc-300 leading-relaxed font-medium">{rec}</p>
               </div>
            ))}
            
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex gap-4">
              <Clock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-zinc-100 mb-1">Timing Sweet Spot</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Posts on <span className="text-emerald-400">Tuesdays at 8:15 AM</span> perform 45% better than average.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Timeline */}
      <h3 className="text-lg font-bold tracking-tight mt-12 mb-4 px-2">Recommendation History</h3>
      <div className="space-y-4">
        {data?.recommendation_history.map((week, i) => (
           <div key={i} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col md:flex-row gap-6">
             <div className="md:w-1/4 shrink-0">
               <p className="text-sm font-bold text-zinc-100">{week.week}</p>
               <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">
                 Performance Snapshot
               </p>
             </div>
             
             <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest mb-2">Content Leads</p>
                 <ul className="space-y-2">
                   {week.content_recs.slice(0, 2).map((r, idx) => (
                     <li key={idx} className="text-xs text-zinc-400 flex gap-2">
                       <span className="text-zinc-600">•</span> {r}
                     </li>
                   ))}
                 </ul>
               </div>
               <div>
                 <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2">Timing Shifts</p>
                 <ul className="space-y-2">
                   {week.timing_recs.slice(0, 2).map((r, idx) => (
                     <li key={idx} className="text-xs text-zinc-400 flex gap-2">
                       <span className="text-zinc-600">•</span> {r}
                     </li>
                   ))}
                 </ul>
               </div>
             </div>
           </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-[400px] w-full" />
      <div className="grid grid-cols-2 gap-8">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    </div>
  );
}
