import { z } from "zod";

export const ABTestSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  hypothesis: z.string().min(1, "Hypothesis is required").max(2000),
  teamId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
});

export const ABTestUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  hypothesis: z.string().min(1).max(2000).optional(),
  status: z.enum(["draft", "running", "concluded"]).optional(),
});

export const ABVariantSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
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
