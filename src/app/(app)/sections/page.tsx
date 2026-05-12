import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionLibrary } from "@/components/sections/SectionLibrary";

export const metadata = { title: "Section Library" };

export default async function SectionLibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const items = await prisma.sectionLibraryItem.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return <SectionLibrary initialItems={items} />;
}
