import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  LayoutDashboard, CheckSquare, Users, FlaskConical, FolderKanban,
  Map, BookOpen, Radar, CalendarCheck, ArrowRight, Users2,
} from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";

const SECTIONS = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    description: "Your team's live overview — pending tasks, Jira activity, calendar events, and Slack digest in one place.",
    shared: true,
  },
  {
    icon: CheckSquare,
    label: "My Tasks",
    description: "Create, assign, and track tasks across your team. Filter by status, priority, and assignee.",
    shared: true,
  },
  {
    icon: Users,
    label: "Team",
    description: "Manage your team members, invite collaborators, and view the team Kanban board.",
    shared: false,
  },
  {
    icon: FolderKanban,
    label: "Projects",
    description: "Organise work into projects. Each project gets its own roadmap and can be linked to experiments.",
    shared: false,
  },
  {
    icon: FlaskConical,
    label: "Experiments (A/B Tests)",
    description: "Plan, run, and analyse A/B tests. Log variant metrics, track running days, and record winners.",
    shared: true,
  },
  {
    icon: Map,
    label: "Roadmaps",
    description: "Visual roadmap boards grouped by project — drag items across columns to update their status.",
    shared: true,
  },
  {
    icon: BookOpen,
    label: "Widget Library",
    description: "A shared library of UI components and design patterns your team can reference and reuse.",
    shared: true,
  },
  {
    icon: Radar,
    label: "CRO Audit",
    description: "Monitor competitor sites for changes and run AI-powered conversion rate audits.",
    shared: false,
  },
  {
    icon: CalendarCheck,
    label: "Daily Update",
    description: "A quick daily standup view — see what's happening today across tasks and calendar.",
    shared: false,
  },
];

export default async function WelcomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {firstName}</h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          MoonTasks is your team's all-in-one workspace for tasks, experiments, roadmaps, and insights.
          Here's everything you can do.
        </p>
      </div>

      {/* Shared note */}
      <div className="flex items-center gap-2.5 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Users2 className="h-4 w-4 shrink-0 text-primary" />
        Pages marked <span className="font-semibold text-foreground mx-1">Team</span> are shared with everyone on your workspace — changes are visible to all members.
      </div>

      {/* Sections grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map(({ icon: Icon, label, description, shared }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold text-sm">{label}</span>
              </div>
              {shared && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                  Team
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-[42px]">{description}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex justify-end pt-2">
        <LinkButton href="/dashboard" size="lg">
          Go to Dashboard
          <ArrowRight className="h-4 w-4 ml-2" />
        </LinkButton>
      </div>
    </div>
  );
}
