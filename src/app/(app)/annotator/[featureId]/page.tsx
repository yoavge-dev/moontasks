import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Annotator } from "@/components/annotator/Annotator";

export default async function FeaturePage({ params }: { params: Promise<{ featureId: string }> }) {
  const { featureId } = await params;

  const feature = await prisma.annotatedFeature.findUnique({ where: { id: featureId } });
  if (!feature) notFound();

  let annotations = [];
  try { annotations = JSON.parse(feature.annotations); } catch { /* */ }

  return (
    <Annotator
      featureId={feature.id}
      initialName={feature.name}
      initialScreenshotUrl={feature.screenshotUrl}
      initialAnnotations={annotations}
    />
  );
}
