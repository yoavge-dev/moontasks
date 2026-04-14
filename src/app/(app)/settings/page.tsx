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
import { CheckCircle2, ExternalLink, Trash2, ChevronDown, ChevronUp, CalendarDays } from "lucide-react";

const schema = z.object({
  jiraDomain: z.string().min(1, "Domain is required"),
  jiraEmail: z.string().email("Valid email required"),
  jiraToken: z.string().min(1, "API token is required"),
});
type FormValues = z.infer<typeof schema>;

const calSchema = z.object({
  calendarUrl: z.string().url("Must be a valid URL"),
});
type CalFormValues = z.infer<typeof calSchema>;

export default function SettingsPage() {
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Calendar state
  const [calConnected, setCalConnected] = useState(false);
  const [calLoading, setCalLoading] = useState(true);
  const [calGuideOpen, setCalGuideOpen] = useState(false);
  const [calDisconnecting, setCalDisconnecting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const { register: calRegister, handleSubmit: calHandleSubmit, formState: { errors: calErrors, isSubmitting: calSubmitting } } = useForm<CalFormValues>({
    resolver: zodResolver(calSchema),
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

    fetch("/api/settings/calendar")
      .then((r) => r.json())
      .then((cal) => {
        setCalConnected(!!cal.data?.connected);
        setCalLoading(false);
      });
  }, [reset]);

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

  const onCalSubmit = async (values: CalFormValues) => {
    const res = await fetch("/api/settings/calendar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to save");
      return;
    }
    setCalConnected(true);
    toast.success("Google Calendar connected!");
  };

  const disconnectCal = async () => {
    setCalDisconnecting(true);
    await fetch("/api/settings/calendar", { method: "DELETE" });
    setCalConnected(false);
    setCalDisconnecting(false);
    toast.success("Google Calendar disconnected");
  };

  if (loading || calLoading) return null;

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

      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Google Calendar
              {calConnected && (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Show your upcoming Google Calendar meetings on the dashboard.
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={calHandleSubmit(onCalSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="calendarUrl">
                Secret iCal URL
                {calConnected && <span className="text-muted-foreground font-normal"> — paste a new URL to replace</span>}
              </Label>
              <Input
                id="calendarUrl"
                placeholder="https://calendar.google.com/calendar/ical/..."
                {...calRegister("calendarUrl")}
              />
              {calErrors.calendarUrl && <p className="text-xs text-red-500">{calErrors.calendarUrl.message}</p>}

              {/* How-to guide */}
              <div className="rounded-lg border border-border bg-muted/40 mt-2">
                <button
                  type="button"
                  onClick={() => setCalGuideOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>How to get your secret iCal URL</span>
                  {calGuideOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {calGuideOpen && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border">
                    <ol className="mt-2 space-y-2 text-xs text-muted-foreground list-none">
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">1</span>
                        <span>Open <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">Google Calendar <ExternalLink className="h-2.5 w-2.5" /></a> and click the gear icon → <strong className="text-foreground">Settings</strong></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">2</span>
                        <span>In the left sidebar, click on the calendar you want to add under <strong className="text-foreground">Settings for my calendars</strong></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">3</span>
                        <span>Scroll down to <strong className="text-foreground">Integrate calendar</strong></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">4</span>
                        <span>Copy the <strong className="text-foreground">Secret address in iCal format</strong> and paste it above</span>
                      </li>
                    </ol>
                    <p className="text-xs text-muted-foreground mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                      Keep this URL private — anyone with it can read your calendar events.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex items-center gap-3">
            <Button type="submit" disabled={calSubmitting}>
              {calSubmitting ? "Saving…" : calConnected ? "Update" : "Connect Calendar"}
            </Button>
            {calConnected && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={disconnectCal}
                disabled={calDisconnecting}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Disconnect
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
