"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Link2, Copy, Check, Users } from "lucide-react";

export function CreateTeamDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 2 state
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [createdTeamName, setCreatedTeamName] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [inviting, setInviting] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(json.error ?? "Failed to create team");
      return;
    }
    setCreatedTeamId(json.data.id);
    setCreatedTeamName(json.data.name);
    router.refresh();
  };

  const generateLink = async () => {
    if (!createdTeamId) return;
    setGeneratingLink(true);
    const res = await fetch(`/api/teams/${createdTeamId}/invite`, { method: "POST" });
    const json = await res.json();
    setGeneratingLink(false);
    if (!res.ok) { toast.error(json.error ?? "Failed to generate link"); return; }
    setInviteLink(`${window.location.origin}/invite/${json.data.token}`);
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteByEmail = async () => {
    if (!emailInput.trim() || !createdTeamId) return;
    setInviting(true);
    const res = await fetch(`/api/teams/${createdTeamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailInput }),
    });
    const json = await res.json();
    setInviting(false);
    if (!res.ok) { toast.error(json.error ?? "Failed to invite"); return; }
    toast.success("Member added!");
    setEmailInput("");
    router.refresh();
  };

  const finish = () => {
    if (createdTeamId) router.push(`/team/${createdTeamId}`);
    handleOpenChange(false);
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setName("");
      setCreatedTeamId(null);
      setCreatedTeamName("");
      setInviteLink(null);
      setCopied(false);
      setEmailInput("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Team
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        {!createdTeamId ? (
          // Step 1: Name the team
          <>
            <DialogHeader>
              <DialogTitle>Create a team</DialogTitle>
              <DialogDescription>Give your team a name to get started.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                placeholder="e.g. Product Team"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={create} disabled={loading || !name.trim()}>
                {loading ? "Creating…" : "Create Team"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Step 2: Invite members
          <>
            <DialogHeader>
              <div className="mx-auto h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <DialogTitle className="text-center">"{createdTeamName}" is ready!</DialogTitle>
              <DialogDescription className="text-center">
                Invite your teammates to get started.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {/* Invite link */}
              <div className="space-y-2">
                <Label>Share an invite link</Label>
                {inviteLink ? (
                  <div className="flex gap-2">
                    <Input value={inviteLink} readOnly className="text-xs" />
                    <Button variant="outline" size="sm" onClick={copyLink}>
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={generateLink} disabled={generatingLink}>
                    <Link2 className="h-4 w-4 mr-2" />
                    {generatingLink ? "Generating…" : "Generate invite link"}
                  </Button>
                )}
                {inviteLink && (
                  <p className="text-[11px] text-muted-foreground">Valid for 7 days — anyone with this link can join.</p>
                )}
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or add by email</span>
                </div>
              </div>

              {/* Email invite */}
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && inviteByEmail()}
                />
                <Button size="sm" onClick={inviteByEmail} disabled={inviting || !emailInput.trim()}>
                  {inviting ? "Adding…" : "Add"}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={finish} className="w-full">Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
