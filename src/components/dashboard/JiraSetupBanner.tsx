"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Zap } from "lucide-react";

const DISMISSED_KEY = "jira-setup-banner-dismissed";

export function JiraSetupBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISMISSED_KEY)) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="relative flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30 px-4 py-3.5">
      <div className="shrink-0 h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center mt-0.5">
        <Zap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">
          Connect Jira to import your tasks
        </p>
        <p className="text-xs text-violet-700/80 dark:text-violet-300/70 mt-0.5">
          Link your Jira account to see all your assigned and reported issues right here in MoonTasks — no switching tabs.
        </p>
        <Link
          href="/settings"
          className="inline-block mt-2 text-xs font-semibold text-violet-700 dark:text-violet-300 underline underline-offset-2 hover:text-violet-900 dark:hover:text-violet-100 transition-colors"
        >
          Set up Jira in Settings
        </Link>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 p-1 rounded-md text-violet-400 hover:text-violet-600 dark:hover:text-violet-200 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
