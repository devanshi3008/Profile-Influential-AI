import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  BarChart3, 
  Target, 
  Settings,
  Grid,
  ChevronRight,
  Sliders
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { group: "Overview", items: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ]},
  { group: "Content", items: [
    { name: "Drafts", href: "/drafts", icon: FileText, badge: 5 },
    { name: "Published", href: "/published", icon: CheckSquare },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
  ]},
  { group: "System", items: [
    { name: "Niche", href: "/niche", icon: Target },
    { name: "Personalise", href: "/personalise", icon: Sliders },
    { name: "Settings", href: "/settings", icon: Settings },
  ]},
];

export function Sidebar() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboardSummary,
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  const profile = data?.profile;
  const fullName = profile?.full_name || "LinkedIn User";
  const role = profile?.current_role || "Connect profile";
  
  const initials = fullName
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "LI";

  return (
    <aside className="w-[220px] h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center">
            <Grid className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-zinc-50 tracking-tight">LI Booster</span>
        </div>
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest pl-8">
          AI Content System
        </p>
      </div>

      <nav className="flex-1 px-3 space-y-6 overflow-y-auto pt-4">
        {navItems.map((group) => (
          <div key={group.group}>
            <h3 className="px-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
              {group.group}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors group",
                    isActive 
                      ? "bg-zinc-800 text-white" 
                      : "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-medium">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className={cn(
                    "w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity",
                    "ml-auto"
                  )} />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800 mt-auto">
        <div className="flex items-center gap-3 px-2">
          <Avatar className="w-8 h-8 ring-1 ring-zinc-800">
            <AvatarFallback className="bg-indigo-500/10 text-indigo-400 text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-zinc-100 truncate">{fullName}</span>
            <span className="text-[10px] text-zinc-500 truncate">{role}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
