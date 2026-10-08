import { and, desc, eq, count } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import { notifications } from "../../lib/database/schema";

export type NotificationType = "invoice" | "maintenance" | "payment" | "system";

export type NotificationRow = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
};

export type CreateNotificationInput = {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
};

export async function listNotifications(
  userId: string,
  limit = 20,
): Promise<{ notifications: NotificationRow[]; unreadCount: number }> {
  const db = getDatabase();

  const rows = await db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      title: notifications.title,
      message: notifications.message,
      type: notifications.type,
      link: notifications.link,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  const [unreadRes] = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return {
    notifications: rows as NotificationRow[],
    unreadCount: unreadRes?.total ?? 0,
  };
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  const db = getDatabase();
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<NotificationRow> {
  const db = getDatabase();
  const [created] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      title: input.title.trim(),
      message: input.message.trim(),
      type: input.type ?? "system",
      link: input.link?.trim() ?? null,
      isRead: false,
    })
    .returning();

  return created as NotificationRow;
}
