import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, 
  ExternalLink, 
  BarChart2, 
  Calendar,
  Filter
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export function Published() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts", sort, search],
    queryFn: () => api.getPosts(sort, "30", search),
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Post History</h2>
          <p className="text-zinc-500 text-sm">Review performance of your past 30 days of content</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="Search hooks..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-800" 
            />
          </div>
          <Button variant="outline" size="icon" className="border-zinc-800 bg-zinc-900">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-950/50">
            <TableRow>
              <TableHead className="w-[400px]">Post Content</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Engagement</TableHead>
              <TableHead className="text-right">Tier</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1,2,3,4,5].map(i => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : posts?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-zinc-500 italic">
                  No published posts found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              posts?.map((post) => (
                <TableRow key={post.id} className="group cursor-default">
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1 max-w-[350px]">
                      <p className="text-zinc-100 line-clamp-1">{post.hook}</p>
                      <p className="text-xs text-zinc-500 line-clamp-1 italic">{post.body}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400 font-mono text-xs">
                    {format(new Date(post.published_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{post.format_type}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-zinc-100 font-mono">
                    {post.impressions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-zinc-400">
                    {post.engagement_rate.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={post.tier === 'high' ? 'emerald' : post.tier === 'medium' ? 'amber' : 'destructive'} 
                      className="text-[10px] uppercase py-0"
                    >
                      {post.tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="bg-zinc-950/50 border-zinc-800">
           <CardContent className="pt-6">
             <div className="flex items-center gap-3 text-emerald-400 mb-2">
               <BarChart2 className="w-4 h-4" />
               <p className="text-xs font-mono uppercase tracking-widest">Growth Factor</p>
             </div>
             <p className="text-2xl font-bold">+2.4x</p>
             <p className="text-xs text-zinc-500 mt-1">Impressions vs last month</p>
           </CardContent>
         </Card>
      </div>
    </div>
  );
}
