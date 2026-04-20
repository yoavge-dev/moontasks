"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Image from "next/image";
import { ArrowLeft, Upload, X, PenTool, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WIDGET_CATEGORIES, WIDGET_KPIS, WIDGET_STATUSES, WIDGET_PLACEMENTS, WIDGET_PLATFORMS } from "@/lib/library-constants";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  hypothesis: z.string().min(1, "Hypothesis is required"),
  targetKpi: z.string().min(1, "Target KPI is required"),
  status: z.enum(["draft", "active", "deprecated"]),
  figmaUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  placement: z.string().optional(),
  platform: z.string().optional(),
  ppcOwner: z.string().max(200).optional(),
});
type FormValues = z.infer<typeof schema>;

type ScreenshotState =
  | { type: "existing"; url: string }
  | { type: "new"; file: File; preview: string }
  | { type: "figma"; imageUrl: string }
  | { type: "none" };

export default function EditLibraryWidgetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [screenshot, setScreenshot] = useState<ScreenshotState>({ type: "none" });
  const [screenshotTab, setScreenshotTab] = useState<"upload" | "figma">("upload");
  const [figmaFrameUrl, setFigmaFrameUrl] = useState("");
  const [figmaLoading, setFigmaLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    fetch(`/api/library/${id}`)
      .then((r) => r.json())
      .then((json) => {
        const w = json.data;
        if (!w) return;
        reset({
          name: w.name,
          description: w.description ?? "",
          category: w.category,
          hypothesis: w.hypothesis,
          targetKpi: w.targetKpi,
          status: w.status,
          figmaUrl: w.figmaUrl ?? "",
          placement: w.placement ?? "",
          platform: w.platform ?? "",
          ppcOwner: w.ppcOwner ?? "",
        });
        if (w.screenshotUrl) setScreenshot({ type: "existing", url: w.screenshotUrl });
        setLoading(false);
      });
  }, [id, reset]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setScreenshot({ type: "new", file: f, preview: URL.createObjectURL(f) });
  };

  const importFromFigma = async () => {
    if (!figmaFrameUrl) return;
    setFigmaLoading(true);
    const res = await fetch(`/api/library/figma?url=${encodeURIComponent(figmaFrameUrl)}`);
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Failed to import from Figma"); setFigmaLoading(false); return; }
    setScreenshot({ type: "figma", imageUrl: json.data.imageUrl });
    setFigmaLoading(false);
    toast.success("Preview imported from Figma");
  };

  const clearScreenshot = () => {
    setScreenshot({ type: "none" });
    if (fileRef.current) fileRef.current.value = "";
  };

  const previewUrl =
    screenshot.type === "existing" ? screenshot.url :
    screenshot.type === "new" ? screenshot.preview :
    screenshot.type === "figma" ? screenshot.imageUrl :
    null;

  const onSubmit = async (values: FormValues) => {
    const res = await fetch(`/api/library/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Failed to save"); return; }

    // Upload new screenshot if changed
    if (screenshot.type === "new") {
      const fd = new FormData();
      fd.append("file", screenshot.file);
      const uploadRes = await fetch(`/api/library/${id}/screenshot`, { method: "POST", body: fd });
      if (!uploadRes.ok) {
        const uploadJson = await uploadRes.json().catch(() => ({}));
        toast.error(uploadJson.error ?? "Screenshot upload failed");
        return;
      }
    } else if (screenshot.type === "figma") {
      const uploadRes = await fetch(`/api/library/${id}/screenshot/figma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: screenshot.imageUrl }),
      });
      if (!uploadRes.ok) {
        toast.error("Figma screenshot failed");
        return;
      }
    }

    toast.success("Widget updated");
    router.push(`/library/${id}`);
  };

  if (loading) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/library/${id}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Widget</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Update this widget's details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Widget name *</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                {...register("description")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="category">Category *</Label>
                <select id="category" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" {...register("category")}>
                  <option value="">Select category</option>
                  {WIDGET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="status">Status</Label>
                <select id="status" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" {...register("status")}>
                  {WIDGET_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ppcOwner">PPC Owner</Label>
              <Input id="ppcOwner" placeholder="e.g. Sarah M." {...register("ppcOwner")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="placement">Placement</Label>
                <select id="placement" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" {...register("placement")}>
                  <option value="">Select placement</option>
                  {WIDGET_PLACEMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="platform">Platform</Label>
                <select id="platform" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" {...register("platform")}>
                  <option value="">Select platform</option>
                  {WIDGET_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Hypothesis & KPI</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="hypothesis">Hypothesis *</Label>
              <textarea
                id="hypothesis"
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                {...register("hypothesis")}
              />
              {errors.hypothesis && <p className="text-xs text-red-500">{errors.hypothesis.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="targetKpi">Target KPI *</Label>
              <select id="targetKpi" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" {...register("targetKpi")}>
                <option value="">Select KPI</option>
                {WIDGET_KPIS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              {errors.targetKpi && <p className="text-xs text-red-500">{errors.targetKpi.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Assets</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
              {(["upload", "figma"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => { if (tab !== screenshotTab) { setScreenshotTab(tab); clearScreenshot(); } }}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    screenshotTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {tab === "figma" ? <PenTool className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                  {tab === "upload" ? "Upload" : "Import from Figma"}
                </button>
              ))}
            </div>

            {previewUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-border aspect-video bg-muted">
                <Image src={previewUrl} alt="Preview" fill className="object-cover" unoptimized />
                <button type="button" onClick={clearScreenshot}
                  className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : screenshotTab === "upload" ? (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors p-8 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground">
                <Upload className="h-6 w-6" />
                <span className="text-sm">Click to upload screenshot</span>
                <span className="text-xs opacity-60">PNG, JPG, WebP up to 10 MB</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input placeholder="https://www.figma.com/design/..." value={figmaFrameUrl} onChange={(e) => setFigmaFrameUrl(e.target.value)} />
                  <Button type="button" variant="outline" onClick={importFromFigma} disabled={figmaLoading || !figmaFrameUrl}>
                    {figmaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Right-click a frame in Figma → Copy link → paste here</p>
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

            <div className="space-y-1">
              <Label htmlFor="figmaUrl">Figma design link</Label>
              <Input id="figmaUrl" placeholder="https://www.figma.com/design/..." {...register("figmaUrl")} />
              {errors.figmaUrl && <p className="text-xs text-red-500">{errors.figmaUrl.message}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save Changes"}
          </Button>
          <LinkButton href={`/library/${id}`} variant="outline">Cancel</LinkButton>
        </div>
      </form>
    </div>
  );
}
