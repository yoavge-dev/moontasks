import { z } from "zod";

export const ABTestSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  hypothesis: z.string().min(1, "Hypothesis is required").max(2000),
  plannedDays: z.number().int().min(1).max(365).default(30),
  pageUrl: z.string().optional().nullable(),
  kpi: z.string().max(100).optional().nullable(),
  targetUplift: z.string().max(50).optional().nullable(),
  startedAt: z.string().datetime().optional().nullable(),
  teamId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
});

export const ABTestUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  hypothesis: z.string().min(1).max(2000).optional(),
  status: z.enum(["draft", "running", "concluded"]).optional(),
  plannedDays: z.number().int().min(1).max(365).optional(),
  pageUrl: z.string().nullable().optional(),
  kpi: z.string().max(100).nullable().optional(),
  targetUplift: z.string().max(50).nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  concludedAt: z.string().datetime().nullable().optional(),
  winner: z.string().max(200).nullable().optional(),
  resultsSummary: z.string().max(5000).nullable().optional(),
  resultsImageUrl: z.string().url().nullable().optional(),
});

export const ABVariantSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  screenshotUrl: z.string().url().optional().nullable(),
});

export const ABMetricSchema = z.object({
  variantId: z.string(),
  metricName: z.string().min(1).max(100),
  value: z.number(),
  notes: z.string().max(500).optional(),
});

export type ABTestInput = z.infer<typeof ABTestSchema>;
export type ABVariantInput = z.infer<typeof ABVariantSchema>;
export type ABMetricInput = z.infer<typeof ABMetricSchema>;
