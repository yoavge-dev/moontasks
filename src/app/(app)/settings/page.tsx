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
import { CheckCircle2, ExternalLink, Trash2, ChevronDown, ChevronUp, MessageCircle, PenTool } from "lucide-react";

const schema = z.object({
  jiraDomain: z.string().min(1, "Domain is required"),
  jiraEmail: z.string().email("Valid email required"),
  jiraToken: z.string().min(1, "API token is required"),
});
type FormValues = z.infer<typeof schema>;

const whatsappSchema = z.object({
  phone: z.string().min(7, "Enter a valid phone number"),
});
type WhatsappFormValues = z.infer<typeof whatsappSchema>;

function WhatsappCard() {
  const [linkedPhone, setLinkedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<WhatsappFormValues>({
    resolver: zodResolver(whatsappSchema),
  });

  useEffect(() => {
    fetch("/api/settings/whatsapp")
      .then((r) => r.json())
      .then((json) => {
        setLinkedPhone(json.data?.whatsappPhone ?? null);
        setLoading(false);
      });
  }, []);

  const onSubmit = async (values: WhatsappFormValues) => {
    const res = await fetch("/api/settings/whatsapp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: values.phone }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Failed to save"); return; }
    setLinkedPhone(json.data.whatsappPhone);
    reset({ phone: "" });
    toast.success("WhatsApp connected!");
  };

  const disconnect = async () => {
    setDisconnecting(true);
    await fetch("/api/settings/whatsapp", { method: "DELETE" });
    setLinkedPhone(null);
    setDisconnecting(false);
    toast.success("WhatsApp disconnected");
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp Bot
              {linkedPhone && (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Add tasks from WhatsApp by messaging your Twilio number.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {linkedPhone ? (
        <CardContent className="space-y-4">
          <p className="text-sm">
            Linked number: <span className="font-mono font-medium">{linkedPhone}</span>
          </p>
          <div className="rounded-lg border border-border bg-muted/40">
            <button
              type="button"
              onClick={() => setCommandsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Available commands</span>
              {commandsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {commandsOpen && (
              <div className="px-3 pb-3 border-t border-border space-y-1 mt-2">
                {[
                  ["add <title>", "Create a task"],
                  ["add <title> | high", "Create with priority"],
                  ["add <title> | high | due friday", "Create with due date"],
                  ["list", "Show your 5 most recent open tasks"],
                  ["help", "Show all commands"],
                ].map(([cmd, desc]) => (
                  <div key={cmd} className="flex gap-3 text-xs">
                    <code className="shrink-0 font-mono text-foreground">{cmd}</code>
                    <span className="text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="wa-phone">Your WhatsApp number</Label>
              <Input
                id="wa-phone"
                placeholder="+1234567890"
                {...register("phone")}
              />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
              <p className="text-xs text-muted-foreground">International format with country code, e.g. +1234567890</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Connect WhatsApp"}
            </Button>
          </CardFooter>
        </form>
      )}

      {linkedPhone && (
        <CardFooter>
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
        </CardFooter>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

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

  if (loading) return null;

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

      <WhatsappCard />
      <FigmaCard />
    </div>
  );
}

function FigmaCard() {
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [token, setToken] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    fetch("/api/settings/figma")
      .then((r) => r.json())
      .then((json) => { setHasToken(json.data?.hasToken ?? false); setLoading(false); });
  }, []);

  const save = async () => {
    if (!token) return;
    setSaving(true);
    const res = await fetch("/api/settings/figma", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Failed to save"); setSaving(false); return; }
    setHasToken(true);
    setToken("");
    setSaving(false);
    toast.success("Figma connected!");
  };

  const disconnect = async () => {
    setDisconnecting(true);
    await fetch("/api/settings/figma", { method: "DELETE" });
    setHasToken(false);
    setDisconnecting(false);
    toast.success("Figma disconnected");
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-4 w-4" />
          Figma
          {hasToken && (
            <span className="inline-flex items-center gap-1 text-xs font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </span>
          )}
        </CardTitle>
        <CardDescription>Import frames from Figma directly into the Widget Library.</CardDescription>
      </CardHeader>

      {!hasToken ? (
        <>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="figma-token">
                Personal access token
              </Label>
              <Input
                id="figma-token"
                type="password"
                placeholder="figd_..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <div className="rounded-lg border border-border bg-muted/40 mt-2">
                <button
                  type="button"
                  onClick={() => setGuideOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>How to get your Figma token</span>
                  {guideOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {guideOpen && (
                  <div className="px-3 pb-3 border-t border-border">
                    <ol className="mt-2 space-y-2 text-xs text-muted-foreground list-none">
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">1</span>
                        <span>In Figma, go to <strong className="text-foreground">Account Settings</strong> (click your avatar)</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">2</span>
                        <span>Scroll to <strong className="text-foreground">Personal access tokens</strong> → Generate new token</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">3</span>
                        <span>Copy the token (starts with <code className="bg-muted px-1 rounded">figd_</code>) and paste above</span>
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={save} disabled={saving || !token}>
              {saving ? "Connecting…" : "Connect Figma"}
            </Button>
          </CardFooter>
        </>
      ) : (
        <CardFooter>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={disconnect}
            disabled={disconnecting}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Disconnect
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
