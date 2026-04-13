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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";

interface Variant {
  id: string;
  name: string;
}

interface MetricLoggerProps {
  testId: string;
  variants: Variant[];
}

export function MetricLogger({ testId, variants }: MetricLoggerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [variantId, setVariantId] = useState("");
  const [metricName, setMetricName] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!variantId || !metricName || !value) return;
    setLoading(true);
    const res = await fetch(`/api/ab-tests/${testId}/metrics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, metricName, value: parseFloat(value), notes: notes || undefined }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(json.error ?? "Failed to log metric");
      return;
    }
    toast.success("Metric logged!");
    setVariantId("");
    setMetricName("");
    setValue("");
    setNotes("");
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <PlusCircle className="h-4 w-4 mr-2" />
            Log Metric
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a metric</DialogTitle>
          <DialogDescription>Record a measurement for one of your experiment variants.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Variant</Label>
            <Select value={variantId} onValueChange={(v) => setVariantId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select variant" />
              </SelectTrigger>
              <SelectContent>
                {variants.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Metric name</Label>
            <Input placeholder="e.g. conversion_rate" value={metricName} onChange={(e) => setMetricName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Value</Label>
            <Input type="number" step="any" placeholder="e.g. 4.2" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Input placeholder="Any context about this measurement" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !variantId || !metricName || !value}>
            {loading ? "Logging…" : "Log Metric"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
