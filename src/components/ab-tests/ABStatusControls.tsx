"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Play, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";

interface ABStatusControlsProps {
  testId: string;
  status: string;
  isOwner: boolean;
}

export function ABStatusControls({ testId, status, isOwner }: ABStatusControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const updateStatus = async (newStatus: string) => {
    setLoading(true);
    const res = await fetch(`/api/ab-tests/${testId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(json.error ?? "Failed to update status");
      return;
    }
    toast.success(`Experiment ${newStatus === "running" ? "started" : "concluded"}!`);
    router.refresh();
  };

  const deleteTest = async () => {
    setDeleting(true);
    const res = await fetch(`/api/ab-tests/${testId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Experiment deleted");
    router.push("/ab-tests");
  };

  if (!isOwner) return null;

  return (
    <div className="flex gap-2">
      <LinkButton href={`/ab-tests/${testId}/edit`} size="sm" variant="ghost">
        <Pencil className="h-4 w-4 mr-1.5" /> Edit
      </LinkButton>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this experiment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the experiment and all its variants, metrics, and results. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTest} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {status === "draft" && (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button size="sm" disabled={loading}>
                <Play className="h-4 w-4 mr-2" />
                Start Experiment
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start this experiment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the experiment as running and record the start time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => updateStatus("running")}>Start</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {status === "running" && (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button size="sm" variant="outline" disabled={loading}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Conclude Experiment
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conclude this experiment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the experiment as concluded. You can still view and log metrics but the status cannot be changed back.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => updateStatus("concluded")}>Conclude</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
