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
import { UserPlus, Link2, Copy, Check } from "lucide-react";

export function InviteMemberDialog({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const invite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(json.error ?? "Failed to invite");
      return;
    }
    toast.success("Member added!");
    setEmail("");
    setOpen(false);
    router.refresh();
  };

  const generateLink = async () => {
    setGeneratingLink(true);
    const res = await fetch(`/api/teams/${teamId}/invite`, { method: "POST" });
    const json = await res.json();
    setGeneratingLink(false);
    if (!res.ok) {
      toast.error(json.error ?? "Failed to generate link");
      return;
    }
    const url = `${window.location.origin}/invite/${json.data.token}`;
    setInviteLink(url);
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setInviteLink(null);
      setEmail("");
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            Add someone who already has an account, or share an invite link for new sign-ups.
          </DialogDescription>
        </DialogHeader>

        {/* Invite by email */}
        <div className="space-y-2 pt-1">
          <Label htmlFor="invite-email">Invite by email (existing account)</Label>
          <div className="flex gap-2">
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && invite()}
            />
            <Button onClick={invite} disabled={loading || !email.trim()} size="sm">
              {loading ? "Adding…" : "Add"}
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        {/* Invite link */}
        <div className="space-y-2">
          <Label>Share invite link (for new users)</Label>
          {inviteLink ? (
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly className="text-xs" />
              <Button variant="outline" size="sm" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={generateLink}
              disabled={generatingLink}
            >
              <Link2 className="h-4 w-4 mr-2" />
              {generatingLink ? "Generating…" : "Generate invite link"}
            </Button>
          )}
          {inviteLink && (
            <p className="text-[11px] text-muted-foreground">
              Valid for 7 days. Anyone with this link can create an account and join the team.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
