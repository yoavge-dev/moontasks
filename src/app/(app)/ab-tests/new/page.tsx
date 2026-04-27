"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const step1Schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  hypothesis: z.string().min(1, "Hypothesis is required").max(2000),
  projectId: z.string().optional(),
});
type Step1Values = z.infer<typeof step1Schema>;

interface Project {
  id: string;
  name: string;
}

export default function NewABTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId") ?? "";
  const prefilledName = searchParams.get("name") ?? "";
  const prefilledHypothesis = searchParams.get("hypothesis") ?? "";

  const [step, setStep] = useState(1);
  const [testData, setTestData] = useState<Step1Values | null>(null);
  const [variants, setVariants] = useState([{ name: "Control" }, { name: "Variant A" }]);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then((j) => setProjects(j.data ?? []));
  }, []);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { projectId: preselectedProjectId, name: prefilledName, hypothesis: prefilledHypothesis },
  });

  const projectId = watch("projectId");

  const onStep1 = (values: Step1Values) => {
    setTestData(values);
    setStep(2);
  };

  const createTest = async () => {
    if (!testData) return;
    setSaving(true);

    const testRes = await fetch("/api/ab-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: testData.name,
        hypothesis: testData.hypothesis,
        projectId: testData.projectId || null,
      }),
    });
    const testJson = await testRes.json();
    if (!testRes.ok) {
      toast.error(testJson.error ?? "Failed to create experiment");
      setSaving(false);
      return;
    }

    const createdTestId = testJson.data.id;

    for (const v of variants.filter((v) => v.name.trim())) {
      await fetch(`/api/ab-tests/${createdTestId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: v.name }),
      });
    }

    toast.success("Experiment created!");
    if (testData.projectId) {
      router.push(`/ab-tests/projects/${testData.projectId}`);
    } else {
      router.push(`/ab-tests/${createdTestId}`);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Experiment</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            1 Details
          </span>
          <div className="h-px flex-1 bg-muted" />
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            2 Variants
          </span>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Experiment Details</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit(onStep1)}>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Experiment name *</Label>
                <Input id="name" placeholder="e.g. Checkout Button Color" {...register("name")} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="hypothesis">Hypothesis *</Label>
                <Textarea
                  id="hypothesis"
                  placeholder="We believe that… will result in… because…"
                  rows={4}
                  {...register("hypothesis")}
                />
                {errors.hypothesis && <p className="text-xs text-red-500">{errors.hypothesis.message}</p>}
              </div>
              {projects.length > 0 && (
                <div className="space-y-1">
                  <Label>Project (optional)</Label>
                  <Select
                    value={projectId ?? ""}
                    onValueChange={(v) => setValue("projectId", v || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {projectId ? (projects.find((p) => p.id === projectId)?.name ?? "No project") : <span className="text-muted-foreground">No project</span>}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No project</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit">Next: Add Variants</Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Variants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {variants.map((v, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={v.name}
                  placeholder={`Variant ${i + 1}`}
                  onChange={(e) => {
                    const updated = [...variants];
                    updated[i] = { name: e.target.value };
                    setVariants(updated);
                  }}
                />
                {variants.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVariants([...variants, { name: `Variant ${String.fromCharCode(64 + variants.length)}` }])}
            >
              + Add Variant
            </Button>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button onClick={createTest} disabled={saving || variants.filter((v) => v.name.trim()).length < 2}>
              {saving ? "Creating…" : "Create Experiment"}
            </Button>
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
