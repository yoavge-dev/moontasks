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
import { CheckCircle2, ExternalLink, Trash2 } from "lucide-react";

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
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Generate one at{" "}
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline inline-flex items-center gap-0.5"
                >
                  id.atlassian.com
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </p>
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
    </div>
  );
}
