"use server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ActionResult } from "@/lib/types";
import { expireUnpaidOrders } from "@/lib/payment-expiry";

export async function getOrderNotifications() {
  const admin = await requireSession();
  await expireUnpaidOrders();
  return db().$transaction(
    async (tx) => {
      const where = { adminId: admin.id, readAt: null };
      const select = {
        id: true,
        readAt: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            number: true,
            fulfillment: true,
            customerName: true,
            total: true,
            paymentStatus: true,
          },
        },
      } as const;
      const [unreadCount, unread, latest] = await Promise.all([
        tx.orderNotification.count({ where }),
        tx.orderNotification.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 20,
          select,
        }),
        tx.orderNotification.findFirst({
          where: { adminId: admin.id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            order: { select: { fulfillment: true, number: true } },
          },
        }),
      ]);
      const recent =
        unread.length < 20
          ? await tx.orderNotification.findMany({
              where: { adminId: admin.id, readAt: { not: null } },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: 20 - unread.length,
              select,
            })
          : [];
      return {
        unreadCount,
        latest,
        items: [...unread, ...recent].map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
          readAt: n.readAt?.toISOString() ?? null,
        })),
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export type NotificationFeed = Awaited<
  ReturnType<typeof getOrderNotifications>
>;

export async function markNotificationsRead(
  ids: string[],
): Promise<ActionResult> {
  const admin = await requireSession();
  const parsed = z
    .array(z.string().min(1).max(64))
    .min(1)
    .max(20)
    .safeParse(ids);
  if (!parsed.success)
    return { success: false, error: "Daftar notifikasi tidak valid." };
  await db().orderNotification.updateMany({
    where: { id: { in: parsed.data }, adminId: admin.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { success: true, data: undefined };
}
