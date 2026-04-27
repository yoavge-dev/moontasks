import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  LayoutDashboard, CheckSquare, Users, FlaskConical, FolderKanban,
  Map, BookOpen, Radar, CalendarCheck, ArrowRight, Users2,
} from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";

const SECTIONS = [
  { icon: LayoutDashboard, label: "Dashboard",       hint: "Team overview",        shared: true  },
  { icon: CheckSquare,     label: "Tasks",            hint: "Track & assign work",  shared: true  },
  { icon: FlaskConical,    label: "Experiments",      hint: "Run A/B tests",        shared: true  },
  { icon: Map,             label: "Roadmaps",         hint: "Plan what's next",     shared: true  },
  { icon: BookOpen,        label: "Widget Library",   hint: "Shared UI patterns",   shared: true  },
  { icon: FolderKanban,    label: "Projects",         hint: "Group your work",      shared: false },
  { icon: Users,           label: "Team",             hint: "Members & Kanban",     shared: false },
  { icon: Radar,           label: "CRO Audit",        hint: "Monitor competitors",  shared: false },
  { icon: CalendarCheck,   label: "Daily Update",     hint: "Today's standup",      shared: false },
];

export default async function WelcomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-10">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/30 mb-4">
          <span className="text-white font-black text-xl">M</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Hey {firstName}, welcome to MoonTasks</h1>
        <p className="text-muted-foreground">Your team's workspace for tasks, experiments, and roadmaps.</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3">
        {SECTIONS.map(({ icon: Icon, label, hint, shared }) => (
          <div key={label} className="relative rounded-xl border bg-card px-4 py-4 flex flex-col items-center text-center gap-2 hover:border-primary/40 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
            </div>
            {shared && (
              <div className="absolute top-2.5 right-2.5">
                <Users2 className="h-3 w-3 text-primary/50" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dashboard preview */}
      <div className="rounded-xl border overflow-hidden shadow-sm">
        <div className="px-3 py-2 bg-muted/60 border-b text-xs text-muted-foreground font-medium">Dashboard — at a glance</div>
        <div className="relative w-full overflow-hidden" style={{ height: 120 }}>
          <img
            src="/dashboard-preview.png"
            alt="Dashboard preview"
            style={{ position: "absolute", top: -48, left: 0, width: "100%", objectFit: "cover", objectPosition: "top" }}
          />
        </div>
      </div>

      {/* Legend + CTA */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users2 className="h-3.5 w-3.5" /> Shared with your whole team
        </span>
        <LinkButton href="/dashboard">
          Go to Dashboard
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </LinkButton>
      </div>
    </div>
  );
}
