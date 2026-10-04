import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock("../../lib/database/client", () => ({
  getDatabase: () => mockDb,
}));

function makeChain(result: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
    set: vi.fn().mockReturnThis(),
  };
  return chain;
}

import {
  createNotification,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./notification.service";

describe("notification.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listNotifications", () => {
    it("returns notifications and unread count", async () => {
      const mockRows = [
        {
          id: "notif-1",
          userId: "user-1",
          title: "Hóa đơn mới",
          message: "Kỳ 10/2026",
          type: "invoice",
          link: "/#invoices",
          isRead: false,
          createdAt: new Date(),
        },
      ];

      mockDb.select
        .mockReturnValueOnce(makeChain(mockRows))
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ total: 1 }]),
        });

      const result = await listNotifications("user-1");

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].title).toBe("Hóa đơn mới");
      expect(result.unreadCount).toBe(1);
    });
  });

  describe("markNotificationAsRead", () => {
    it("updates isRead to true for the specified notification", async () => {
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      });

      await expect(markNotificationAsRead("user-1", "notif-1")).resolves.toBeUndefined();
    });
  });

  describe("markAllNotificationsAsRead", () => {
    it("updates all unread notifications for the user", async () => {
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({ rowCount: 3 }),
      });

      await expect(markAllNotificationsAsRead("user-1")).resolves.toBeUndefined();
    });
  });

  describe("createNotification", () => {
    it("inserts a notification and returns it", async () => {
      const newNotif = {
        id: "notif-new",
        userId: "user-1",
        title: "Sự cố phòng",
        message: "Hỏng đèn",
        type: "maintenance" as const,
        link: "/maintenance",
        isRead: false,
        createdAt: new Date(),
      };

      mockDb.insert.mockReturnValueOnce(makeChain([newNotif]));

      const res = await createNotification({
        userId: "user-1",
        title: "Sự cố phòng",
        message: "Hỏng đèn",
        type: "maintenance",
        link: "/maintenance",
      });

      expect(res.id).toBe("notif-new");
      expect(res.type).toBe("maintenance");
    });
  });
});
