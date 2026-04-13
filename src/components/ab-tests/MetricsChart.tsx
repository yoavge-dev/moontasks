"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Variant {
  id: string;
  name: string;
  metrics: { metricName: string; value: number }[];
}

interface MetricsChartProps {
  variants: Variant[];
}

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

export function MetricsChart({ variants }: MetricsChartProps) {
  // Build a map: metricName -> { metricName, [variantName]: latestValue }
  const metricNames = Array.from(
    new Set(variants.flatMap((v) => v.metrics.map((m) => m.metricName)))
  );

  if (metricNames.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No metrics logged yet.</p>;
  }

  // For each metric, take the latest value per variant
  const chartData = metricNames.map((metricName) => {
    const entry: Record<string, string | number> = { metricName };
    for (const variant of variants) {
      const variantMetrics = variant.metrics.filter((m) => m.metricName === metricName);
      if (variantMetrics.length > 0) {
        entry[variant.name] = variantMetrics[0].value; // most recent (ordered desc)
      }
    }
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="metricName" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {variants.map((v, i) => (
          <Bar key={v.id} dataKey={v.name} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
