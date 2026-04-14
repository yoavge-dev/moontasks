import { prisma } from "./prisma";

interface CreateNotificationInput {
  userId: string;
  actorId?: string;
  type: "comment" | "assigned";
  title: string;
  body?: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  // Don't notify users about their own actions
  if (input.actorId && input.actorId === input.userId) return;

  return prisma.notification.create({ data: input });
}
