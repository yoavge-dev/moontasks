import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CmsFeedbackDashboard } from "@/components/cms-feedback/CmsFeedbackDashboard";

export const metadata = { title: "CMS Feedback — Admin" };

export default async function CmsFeedbackAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const items = await prisma.cmsFeedback.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return <CmsFeedbackDashboard initialItems={items} />;
}
