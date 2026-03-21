const BASE = import.meta.env.VITE_API_URL ?? "";

export interface LinkedInProfile {
  full_name: string;
  headline: string;
  location: string;
  about: string;
  current_role: string;
  current_company: string;
  skills: string[];
  recent_posts: string[];
  education: string[];
  connections: string;
  profile_url: string;
}

export interface DashboardSummary {
  total_impressions: number;
  impressions_delta_pct: number;
  avg_engagement_rate: number;
  engagement_delta_pp: number;
  posts_this_month: number;
  niche: {
    primary_niche: string;
    confidence_score: number;
    content_angles: string[];
  };
  weekly_impressions: { week: string; impressions: number }[];
  top_posts: {
    id: string;
    hook: string;
    format_type: string;
    impressions: number;
    engagement_rate: number;
    tier: string;
  }[];
  pending_drafts_count: number;
  latest_insights: { type: "up" | "down"; finding: string; explanation: string }[];
  profile: LinkedInProfile | null;
}

export interface PostDraft {
  id: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  format_type: string;
  estimated_read_time: number;
  created_at: string;
  status: "pending" | "approved" | "rejected" | "published";
  scheduled_for: string;
}

export interface PersonalisationData {
  skills: string[];
  interests: string[];
  post_ideas: string[];
  topics_to_avoid: string[];
  tone_descriptors: string[];
  phrases_to_avoid: string[];
}

export interface PublishedPost {
  id: string;
  format_type: string;
  hook: string;
  published_at: string;
  impressions: number;
  clicks: number;
  reactions: number;
  engagement_rate: number;
  tier: string;
  body: string;
}

export interface AnalyticsSummary {
  impressions_over_time: { date: string; impressions: number; tier: string; hook: string }[];
  format_performance: { format_type: string; avg_impressions: number; post_count: number }[];
  time_heatmap: { day: string; hour: number; avg_impressions: number; count: number }[];
  recommendation_history: {
    week: string;
    content_recs: string[];
    timing_recs: string[];
    analysed_at: string;
  }[];
}

export const api = {
  getDashboardSummary: (): Promise<DashboardSummary> =>
    fetch(`${BASE}/api/dashboard/summary`).then((r) => r.json()),
    
  getDrafts: (status: string = "all"): Promise<PostDraft[]> =>
    fetch(`${BASE}/api/drafts?status=${status}`).then((r) => r.json()),
    
  updateDraft: (id: string, data: { status?: string; body?: string }): Promise<void> =>
    fetch(`${BASE}/api/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(() => {}),
    
  publishApproved: (): Promise<{ published: number; failed: number }> =>
    fetch(`${BASE}/api/drafts/publish-approved`, { method: "POST" }).then((r) => r.json()),
    
  getPosts: (sort: string, days: string, search: string): Promise<PublishedPost[]> =>
    fetch(`${BASE}/api/posts?sort=${sort}&days=${days}&search=${search}`).then((r) => r.json()),
    
  getAnalyticsSummary: (days: number = 30): Promise<AnalyticsSummary> =>
    fetch(`${BASE}/api/analytics/summary?days=${days}`).then((r) => r.json()),
    
  getPersonalisation: (): Promise<PersonalisationData> =>
    fetch(`${BASE}/api/personalise`).then((r) => r.json()),
    
  savePersonalisation: (data: PersonalisationData): Promise<PersonalisationData> =>
    fetch(`${BASE}/api/personalise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  runCrew: (): Promise<{ status: string; message: string }> =>
    fetch(`${BASE}/api/crew/run`, { method: "POST" }).then((r) => r.json()),
};
