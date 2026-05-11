"use client";

import { useState } from "react";
import { Share2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  projectId: string;
  publicSlug: string | null;
}

export function ShareRoadmapButton({ projectId, publicSlug: initialSlug }: Props) {
  const [slug, setSlug] = useState(initialSlug);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const getUrl = (s: string) => `${window.location.origin}/roadmap/${s}`;

  const handleShare = async () => {
    if (slug) {
      await navigator.clipboard.writeText(getUrl(slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied to clipboard");
      return;
    }

    // Generate slug for existing projects that don't have one
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateSlug: true }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error("Failed to generate link"); return; }
      const newSlug = json.data.publicSlug;
      setSlug(newSlug);
      await navigator.clipboard.writeText(getUrl(newSlug));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Public link generated and copied");
    } catch {
      toast.error("Failed to generate link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare} disabled={loading} className="gap-1.5 h-8 text-xs">
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Share2 className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied!" : "Share roadmap"}
    </Button>
  );
}
