import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create two users
  const passwordHash = await bcrypt.hash("password123", 12);

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      name: "Alice",
      email: "alice@example.com",
      passwordHash,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      name: "Bob",
      email: "bob@example.com",
      passwordHash,
    },
  });

  // Create a team
  const team = await prisma.team.upsert({
    where: { id: "seed-team-1" },
    update: {},
    create: {
      id: "seed-team-1",
      name: "Product Team",
      createdById: alice.id,
    },
  });

  // Add both to the team
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: alice.id } },
    update: {},
    create: { teamId: team.id, userId: alice.id, role: "owner" },
  });
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: bob.id } },
    update: {},
    create: { teamId: team.id, userId: bob.id, role: "member" },
  });

  // Sample tasks
  const taskCount = await prisma.task.count();
  if (taskCount === 0) {
    await prisma.task.createMany({
      data: [
        {
          title: "Set up CI/CD pipeline",
          description: "Configure GitHub Actions for automated testing and deployment.",
          priority: "high",
          status: "in_progress",
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          tags: JSON.stringify(["devops", "infrastructure"]),
          ownerId: alice.id,
          teamId: team.id,
        },
        {
          title: "Design new onboarding flow",
          description: "Revamp the user onboarding experience based on recent feedback.",
          priority: "medium",
          status: "todo",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          tags: JSON.stringify(["design", "ux"]),
          ownerId: alice.id,
          assigneeId: bob.id,
          teamId: team.id,
        },
        {
          title: "Fix payment gateway bug",
          description: "Stripe webhook events are occasionally missing.",
          priority: "urgent",
          status: "todo",
          dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          tags: JSON.stringify(["bug", "payments"]),
          ownerId: bob.id,
          teamId: team.id,
        },
        {
          title: "Write Q2 OKR report",
          description: "Summarize key results and metrics for Q2.",
          priority: "low",
          status: "done",
          tags: JSON.stringify(["reporting"]),
          ownerId: alice.id,
        },
      ],
    });
  }

  // Sample A/B test
  const abTest = await prisma.aBTest.create({
    data: {
      name: "Checkout Button Color",
      hypothesis:
        "Changing the checkout button from grey to green will increase conversion rates by 15%.",
      status: "running",
      ownerId: alice.id,
      teamId: team.id,
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  });

  const control = await prisma.aBVariant.create({
    data: { name: "Control (Grey)", testId: abTest.id },
  });
  const variantA = await prisma.aBVariant.create({
    data: { name: "Variant A (Green)", testId: abTest.id },
  });

  await prisma.aBMetric.createMany({
    data: [
      { variantId: control.id, metricName: "conversion_rate", value: 3.2, notes: "Day 1-7 avg" },
      { variantId: control.id, metricName: "click_through_rate", value: 12.5 },
      { variantId: variantA.id, metricName: "conversion_rate", value: 4.8, notes: "Day 1-7 avg" },
      { variantId: variantA.id, metricName: "click_through_rate", value: 18.1 },
    ],
  });

  console.log("Seed complete.");
  console.log("  alice@example.com / password123");
  console.log("  bob@example.com   / password123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
