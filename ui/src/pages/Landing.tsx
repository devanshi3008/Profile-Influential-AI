import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Rocket, Loader2 } from "lucide-react";
import { saveUserSession } from "@/lib/api"; // FIX: import session helper

export function Landing() {
  const navigate = useNavigate();
  const [name,        setName]        = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [groqApiKey,  setGroqApiKey]  = useState("");
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError("Full name is required."); return;
    }
    if (!linkedinUrl.trim() || !linkedinUrl.startsWith("http")) {
      setError("Please enter a valid LinkedIn URL starting with https."); return;
    }
    if (!groqApiKey.trim()) {
      setError("Groq API Key is required."); return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/crew/run-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         name.trim(),
          linkedin_url: linkedinUrl.trim(),
          groq_api_key: groqApiKey.trim(),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.detail || "Failed to start analysis. Check your inputs.");
      }

      const data = await response.json();

      // FIX: save name + linkedinUrl to sessionStorage BEFORE navigating
      // so getDashboardSummary immediately sends the right user context.
      // The Groq key is intentionally NOT saved — it lives only in the
      // backend's memory for the duration of the crew run.
      saveUserSession({ name: name.trim(), linkedinUrl: linkedinUrl.trim() });

      // Navigate to dashboard with the task ID for polling
      navigate("/dashboard", { state: { taskId: data.task_id } });

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">
            LinkedIn Impression Booster
          </h1>
          <p className="text-zinc-400 mt-2">
            Supercharge your personal brand with AI-driven content tailored to your unique profile.
          </p>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-50">Get Started</CardTitle>
            <CardDescription className="text-zinc-400">
              Enter your details to initialize your custom agentic workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedinUrl" className="text-zinc-300">LinkedIn Profile URL</Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  placeholder="https://www.linkedin.com/in/johndoe/"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="groqApiKey" className="text-zinc-300">Groq API Key</Label>
                <Input
                  id="groqApiKey"
                  type="password"
                  placeholder="gsk_..."
                  value={groqApiKey}
                  onChange={(e) => setGroqApiKey(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600"
                  disabled={isLoading}
                />
                <p className="text-xs text-zinc-500">
                  Used only for this session — never stored permanently.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-md text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting Analysis...</>
                ) : (
                  "Start Analysis"
                )}
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
