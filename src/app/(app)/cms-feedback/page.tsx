import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { CmsFeedbackForm } from "@/components/cms-feedback/CmsFeedbackForm";

export const metadata = { title: "CMS Feedback" };

export default async function CmsFeedbackPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return <CmsFeedbackForm />;
}
