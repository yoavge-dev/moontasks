import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface JiraIssue {
  id: string;
  key: string;
  url: string;
  title: string;
  status: string;
  statusCategory: "todo" | "in_progress" | "done";
  priority: string;
  priorityNormalized: "low" | "medium" | "high" | "urgent";
  projectName: string;
  projectKey: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  type: string;
  role: "assignee" | "reporter" | "both";
}

function normalizePriority(jiraPriority: string): JiraIssue["priorityNormalized"] {
  const p = jiraPriority.toLowerCase();
  if (p === "highest" || p === "blocker" || p === "critical") return "urgent";
  if (p === "high") return "high";
  if (p === "low" || p === "lowest" || p === "minor" || p === "trivial") return "low";
  return "medium";
}

function normalizeStatusCategory(cat: string): JiraIssue["statusCategory"] {
  if (cat === "indeterminate") return "in_progress";
  if (cat === "done") return "done";
  return "todo";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const settings = await prisma.userSettings.findUnique({ where: { userId } });

  if (!settings?.jiraDomain || !settings?.jiraEmail || !settings?.jiraToken) {
    return NextResponse.json({ data: [], configured: false });
  }

  const domain = settings.jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const credentials = Buffer.from(`${settings.jiraEmail}:${settings.jiraToken}`).toString("base64");

  const res = await fetch(
    `https://${domain}/rest/api/3/search/jql`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        jql: "(assignee = currentUser() OR reporter = currentUser()) AND statusCategory != Done ORDER BY updated DESC",
        maxResults: 50,
        fields: ["summary", "status", "priority", "project", "created", "updated", "duedate", "issuetype", "assignee", "reporter"],
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Jira API error:", res.status, text);
    let detail = "";
    try {
      const parsed = JSON.parse(text);
      detail = parsed.message ?? parsed.errorMessages?.[0] ?? "";
    } catch {
      detail = text.slice(0, 200);
    }
    return NextResponse.json(
      { error: `Jira ${res.status}: ${detail || "Check your domain and credentials."}` },
      { status: 502 }
    );
  }

  const json = await res.json();

  const issues: JiraIssue[] = (json.issues ?? []).map((issue: Record<string, unknown>) => {
    const fields = issue.fields as Record<string, unknown>;
    const status = fields.status as Record<string, unknown>;
    const statusCategory = (status?.statusCategory as Record<string, unknown>)?.key as string ?? "new";
    const priority = fields.priority as Record<string, unknown> | null;
    const project = fields.project as Record<string, unknown>;
    const issuetype = fields.issuetype as Record<string, unknown>;

    const assigneeAcc = fields.assignee as Record<string, unknown> | null;
    const reporterAcc = fields.reporter as Record<string, unknown> | null;
    const assigneeEmail = (assigneeAcc?.emailAddress as string) ?? "";
    const reporterEmail = (reporterAcc?.emailAddress as string) ?? "";
    const isAssignee = assigneeEmail === settings.jiraEmail;
    const isReporter = reporterEmail === settings.jiraEmail;
    const role: JiraIssue["role"] = isAssignee && isReporter ? "both" : isAssignee ? "assignee" : "reporter";

    return {
      id: issue.id as string,
      key: issue.key as string,
      url: `https://${domain}/browse/${issue.key}`,
      title: fields.summary as string,
      status: (status?.name as string) ?? "Unknown",
      statusCategory: normalizeStatusCategory(statusCategory),
      priority: (priority?.name as string) ?? "Medium",
      priorityNormalized: normalizePriority((priority?.name as string) ?? "Medium"),
      projectName: (project?.name as string) ?? "",
      projectKey: (project?.key as string) ?? "",
      createdAt: fields.created as string,
      updatedAt: fields.updated as string,
      dueDate: (fields.duedate as string | null) ?? null,
      type: (issuetype?.name as string) ?? "Task",
      role,
    };
  });

  return NextResponse.json({ data: issues, configured: true });
}
