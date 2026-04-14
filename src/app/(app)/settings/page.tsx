"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ExternalLink, Trash2, ChevronDown, ChevronUp, Hash, Loader2 } from "lucide-react";

const schema = z.object({
  jiraDomain: z.string().min(1, "Domain is required"),
  jiraEmail: z.string().email("Valid email required"),
  jiraToken: z.string().min(1, "API token is required"),
});
type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Slack state
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackLoading, setSlackLoading] = useState(true);
  const [slackToken, setSlackToken] = useState("");
  const [slackChannels, setSlackChannels] = useState<{ id: string; name: string }[]>([]);
  const [slackChannelId, setSlackChannelId] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [savingSlack, setSavingSlack] = useState(false);
  const [disconnectingSlack, setDisconnectingSlack] = useState(false);
  const [slackGuideOpen, setSlackGuideOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    fetch("/api/settings/jira")
      .then((r) => r.json())
      .then((jira) => {
        if (jira.data) {
          reset({ jiraDomain: jira.data.jiraDomain, jiraEmail: jira.data.jiraEmail, jiraToken: "" });
          setHasToken(jira.data.hasToken);
        }
        setLoading(false);
      });

    fetch("/api/settings/slack")
      .then((r) => r.json())
      .then((slack) => {
        setSlackConnected(!!slack.data?.connected);
        setSlackLoading(false);
      });
  }, [reset]);

  const loadSlackChannels = async () => {
    if (!slackToken.trim()) return;
    setLoadingChannels(true);
    const res = await fetch(`/api/slack/channels?token=${encodeURIComponent(slackToken)}`);
    const json = await res.json();
    setLoadingChannels(false);
    if (!res.ok) { toast.error(json.error ?? "Failed to load channels"); return; }
    setSlackChannels(json.data ?? []);
    if (json.data?.length > 0) setSlackChannelId(json.data[0].id);
  };

  const connectSlack = async () => {
    if (!slackToken || !slackChannelId) return;
    setSavingSlack(true);
    const res = await fetch("/api/settings/slack", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slackToken, slackChannelId }),
    });
    const json = await res.json();
    setSavingSlack(false);
    if (!res.ok) { toast.error(json.error ?? "Failed to save"); return; }
    setSlackConnected(true);
    toast.success("Slack connected!");
  };

  const disconnectSlack = async () => {
    setDisconnectingSlack(true);
    await fetch("/api/settings/slack", { method: "DELETE" });
    setSlackConnected(false);
    setSlackToken("");
    setSlackChannels([]);
    setSlackChannelId("");
    setDisconnectingSlack(false);
    toast.success("Slack disconnected");
  };

  const onSubmit = async (values: FormValues) => {
    const res = await fetch("/api/settings/jira", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to save");
      return;
    }
    setHasToken(json.data.hasToken);
    toast.success("Jira connected!");
    reset({ jiraDomain: json.data.jiraDomain, jiraEmail: json.data.jiraEmail, jiraToken: "" });
  };

  const disconnect = async () => {
    setDisconnecting(true);
    await fetch("/api/settings/jira", { method: "DELETE" });
    setHasToken(false);
    reset({ jiraDomain: "", jiraEmail: "", jiraToken: "" });
    setDisconnecting(false);
    toast.success("Jira disconnected");
  };

  if (loading || slackLoading) return null;

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your integrations and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Jira Integration
                {hasToken && (
                  <span className="inline-flex items-center gap-1 text-xs font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Show your Jira assigned issues merged into My Tasks.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="jiraDomain">Jira domain</Label>
              <Input
                id="jiraDomain"
                placeholder="yourcompany.atlassian.net"
                {...register("jiraDomain")}
              />
              {errors.jiraDomain && <p className="text-xs text-red-500">{errors.jiraDomain.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="jiraEmail">Atlassian email</Label>
              <Input
                id="jiraEmail"
                type="email"
                placeholder="you@company.com"
                {...register("jiraEmail")}
              />
              {errors.jiraEmail && <p className="text-xs text-red-500">{errors.jiraEmail.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="jiraToken">
                API token
                {hasToken && <span className="text-muted-foreground font-normal"> — leave blank to keep existing</span>}
              </Label>
              <Input
                id="jiraToken"
                type="password"
                placeholder={hasToken ? "••••••••••••••••" : "Paste your Jira API token"}
                {...register("jiraToken")}
              />
              {errors.jiraToken && <p className="text-xs text-red-500">{errors.jiraToken.message}</p>}

              {/* How-to guide */}
              <div className="rounded-lg border border-border bg-muted/40 mt-2">
                <button
                  type="button"
                  onClick={() => setGuideOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>How to get your Jira API token</span>
                  {guideOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {guideOpen && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border">
                    <ol className="mt-2 space-y-2 text-xs text-muted-foreground list-none">
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">1</span>
                        <span>Go to <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">id.atlassian.com/manage-profile/security/api-tokens <ExternalLink className="h-2.5 w-2.5" /></a></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">2</span>
                        <span>Click <strong className="text-foreground">Create API token</strong>, give it a name (e.g. "MoonTasks")</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">3</span>
                        <span>Copy the token and paste it in the field above</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">4</span>
                        <span>Your <strong className="text-foreground">Jira domain</strong> is the part before <code className="bg-muted px-1 rounded">.atlassian.net</code> in your Jira URL</span>
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : hasToken ? "Update" : "Connect Jira"}
            </Button>
            {hasToken && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={disconnect}
                disabled={disconnecting}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Disconnect
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
      {/* Slack */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-[#E01E5A]" />
              Slack Digest
              {slackConnected && (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Show an AI summary of your Slack channel activity on the dashboard.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {slackConnected ? (
            <p className="text-sm text-muted-foreground">
              Slack is connected. To change the channel or token, disconnect and reconnect.
            </p>
          ) : (
            <>
              <div className="space-y-1">
                <Label htmlFor="slackToken">Bot Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="slackToken"
                    type="password"
                    placeholder="xoxb-..."
                    value={slackToken}
                    onChange={(e) => { setSlackToken(e.target.value); setSlackChannels([]); setSlackChannelId(""); }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadSlackChannels}
                    disabled={!slackToken.trim() || loadingChannels}
                    className="shrink-0"
                  >
                    {loadingChannels ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load channels"}
                  </Button>
                </div>
              </div>

              {slackChannels.length > 0 && (
                <div className="space-y-1">
                  <Label htmlFor="slackChannel">Channel</Label>
                  <select
                    id="slackChannel"
                    value={slackChannelId}
                    onChange={(e) => setSlackChannelId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {slackChannels.map((c) => (
                      <option key={c.id} value={c.id}>#{c.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Private channel not listed? Paste its ID below.</p>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="slackChannelId">
                  {slackChannels.length > 0 ? "Or enter channel ID manually" : "Channel ID"}
                </Label>
                <Input
                  id="slackChannelId"
                  placeholder="C0123ABC456"
                  value={slackChannelId}
                  onChange={(e) => setSlackChannelId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Right-click any channel in Slack → View channel details → scroll to bottom for the ID.
                  For private channels, invite the bot first: <code className="bg-muted px-1 rounded">/invite @your-app-name</code>
                </p>
              </div>

              {/* Guide */}
              <div className="rounded-lg border border-border bg-muted/40">
                <button
                  type="button"
                  onClick={() => setSlackGuideOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>How to create a Slack bot token</span>
                  {slackGuideOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {slackGuideOpen && (
                  <div className="px-3 pb-3 border-t border-border">
                    <ol className="mt-2 space-y-2 text-xs text-muted-foreground list-none">
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">1</span>
                        <span>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">api.slack.com/apps <ExternalLink className="h-2.5 w-2.5" /></a> → <strong className="text-foreground">Create New App</strong> → From scratch</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">2</span>
                        <span>Go to <strong className="text-foreground">OAuth & Permissions</strong> → add scopes: <code className="bg-muted px-1 rounded">channels:history</code>, <code className="bg-muted px-1 rounded">channels:read</code>, <code className="bg-muted px-1 rounded">groups:history</code>, <code className="bg-muted px-1 rounded">groups:read</code>, <code className="bg-muted px-1 rounded">mpim:history</code>, <code className="bg-muted px-1 rounded">mpim:read</code>, <code className="bg-muted px-1 rounded">users:read</code></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">3</span>
                        <span>Click <strong className="text-foreground">Install to Workspace</strong> and copy the <strong className="text-foreground">Bot User OAuth Token</strong> (starts with <code className="bg-muted px-1 rounded">xoxb-</code>)</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">4</span>
                        <span>Invite the bot to your channel: <code className="bg-muted px-1 rounded">/invite @your-app-name</code></span>
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex items-center gap-3">
          {!slackConnected ? (
            <Button
              type="button"
              onClick={connectSlack}
              disabled={!slackToken || !slackChannelId || savingSlack}
            >
              {savingSlack ? "Connecting…" : "Connect Slack"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={disconnectSlack}
              disabled={disconnectingSlack}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Disconnect
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
