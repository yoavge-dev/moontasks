"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, AlertCircle, CheckCircle } from "lucide-react";

interface Props {
  token: string;
  teamName: string;
  invitedBy: string;
  expired: boolean;
  used: boolean;
  loggedIn: boolean;
  alreadyMember: boolean;
}

export function InviteClient({ token, teamName, invitedBy, expired, used, loggedIn, alreadyMember }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (expired || used) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-semibold">{used ? "Invite already used" : "Invite expired"}</p>
          <p className="text-sm text-muted-foreground">
            {used
              ? "This invite link has already been used. Ask a team member to send a new one."
              : "This invite link expired. Ask a team member to send a new one."}
          </p>
          <Button variant="outline" onClick={() => router.push("/login")} className="mt-2">
            Go to login
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (alreadyMember) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-3">
          <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
          <p className="font-semibold">You&apos;re already a member</p>
          <p className="text-sm text-muted-foreground">You&apos;re already part of <strong>{teamName}</strong>.</p>
          <Button onClick={() => router.push("/team")} className="mt-2">Go to Teams</Button>
        </CardContent>
      </Card>
    );
  }

  const joinAsLoggedIn = async () => {
    setLoading(true);
    const res = await fetch(`/api/invite/${token}/join`, { method: "POST" });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(json.error ?? "Failed to join team");
      return;
    }
    toast.success(`Joined ${teamName}!`);
    router.push("/team");
  };

  const registerAndJoin = async () => {
    if (!email || !password) return;
    setLoading(true);

    // Register with invite token so the server auto-joins the team
    const regRes = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || undefined, email, password, inviteToken: token }),
    });
    const regJson = await regRes.json();

    if (!regRes.ok) {
      setLoading(false);
      toast.error(regJson.error ?? "Registration failed");
      return;
    }

    // Sign in
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      toast.error("Account created but sign-in failed. Please log in manually.");
      router.push("/login");
      return;
    }

    toast.success(`Welcome! You've joined ${teamName}.`);
    router.push("/team");
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">You&apos;re invited</CardTitle>
        <CardDescription>
          <strong>{invitedBy}</strong> invited you to join <strong>{teamName}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loggedIn ? (
          <Button onClick={joinAsLoggedIn} disabled={loading} className="w-full">
            {loading ? "Joining…" : `Join ${teamName}`}
          </Button>
        ) : (
          <>
            <p className="text-xs text-muted-foreground text-center">
              Create an account to join the team
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && registerAndJoin()}
                />
              </div>
            </div>
            <Button
              onClick={registerAndJoin}
              disabled={loading || !email || password.length < 8}
              className="w-full"
            >
              {loading ? "Creating account…" : `Create account & join ${teamName}`}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Already have an account?{" "}
              <a href={`/login?callbackUrl=/invite/${token}`} className="text-primary hover:underline">
                Sign in
              </a>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
