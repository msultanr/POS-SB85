import "server-only";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { expireUnpaidOrders } from "@/lib/payment-expiry";
import { type ReportPeriod, wibDate } from "@/lib/report-period";

export async function getReport(period: ReportPeriod) {
  await requireSession();
  await expireUnpaidOrders();
  const { fromDate, untilDate } = period;
  return db().$transaction(
    async (tx) => {
      const [summaryRows, daily, products, segments] = await Promise.all([
        tx.$queryRaw<
          {
            orders: number;
            paidOrders: number;
            revenue: number;
            pendingPayment: number;
            review: number;
            rejected: number;
            expired: number;
          }[]
        >`
        SELECT COUNT(*) AS orders,
          COUNT(CASE WHEN paymentStatus = 'PAID' THEN 1 END) AS paidOrders,
          COALESCE(SUM(CASE WHEN paymentStatus = 'PAID' THEN total ELSE 0 END), 0) AS revenue,
          COUNT(CASE WHEN paymentStatus = 'UNPAID' THEN 1 END) AS pendingPayment,
          COUNT(CASE WHEN paymentStatus = 'REVIEW' THEN 1 END) AS review,
          COUNT(CASE WHEN paymentStatus = 'REJECTED' THEN 1 END) AS rejected,
          COUNT(CASE WHEN paymentStatus = 'EXPIRED' THEN 1 END) AS expired
        FROM \`Order\` WHERE createdAt >= ${fromDate} AND createdAt < ${untilDate}`,
        tx.$queryRaw<
          {
            date: string;
            revenue: number;
            orders: number;
            paidOrders: number;
          }[]
        >`
        SELECT DATE_FORMAT(DATE_ADD(createdAt, INTERVAL 7 HOUR), '%Y-%m-%d') AS date,
          COALESCE(SUM(CASE WHEN paymentStatus = 'PAID' THEN total ELSE 0 END), 0) AS revenue,
          COUNT(*) AS orders, COUNT(CASE WHEN paymentStatus = 'PAID' THEN 1 END) AS paidOrders
        FROM \`Order\` WHERE createdAt >= ${fromDate} AND createdAt < ${untilDate}
        GROUP BY date ORDER BY date`,
        tx.$queryRaw<
          {
            id: string;
            name: string;
            archived: boolean;
            quantity: number;
            revenue: number;
            orders: number;
          }[]
        >`
        SELECT p.id, p.name, (p.deletedAt IS NOT NULL) AS archived,
          COALESCE(s.quantity, 0) AS quantity, COALESCE(s.revenue, 0) AS revenue,
          COALESCE(s.orders, 0) AS orders
        FROM Product p LEFT JOIN (
          SELECT i.productId, SUM(i.quantity) AS quantity, SUM(i.subtotal) AS revenue, COUNT(DISTINCT i.orderId) AS orders
          FROM OrderItem i JOIN \`Order\` o ON o.id = i.orderId
          WHERE o.paymentStatus = 'PAID' AND o.createdAt >= ${fromDate} AND o.createdAt < ${untilDate}
          GROUP BY i.productId
        ) s ON s.productId = p.id
        WHERE p.deletedAt IS NULL OR s.quantity > 0
        ORDER BY quantity DESC, p.name ASC, p.id ASC`,
        tx.$queryRaw<
          {
            paymentMethod: string;
            source: string;
            fulfillment: string;
            status: string;
            orders: number;
            revenue: number;
          }[]
        >`
        SELECT paymentMethod, source, fulfillment, status, COUNT(*) AS orders, SUM(total) AS revenue
        FROM \`Order\` WHERE paymentStatus = 'PAID' AND createdAt >= ${fromDate} AND createdAt < ${untilDate}
        GROUP BY paymentMethod, source, fulfillment, status`,
      ]);
      // MySQL COUNT/SUM return BigInt/Decimal: never send these to client components.
      const raw = summaryRows[0];
      const summary = {
        orders: Number(raw.orders),
        paidOrders: Number(raw.paidOrders),
        revenue: Number(raw.revenue),
        pendingPayment: Number(raw.pendingPayment),
        review: Number(raw.review),
        rejected: Number(raw.rejected),
        expired: Number(raw.expired),
      };
      const normalizedProducts = products.map((p) => ({
        ...p,
        archived: Boolean(Number(p.archived)),
        quantity: Number(p.quantity),
        revenue: Number(p.revenue),
        orders: Number(p.orders),
      }));
      const byDate = new Map(
        daily.map((d) => [
          d.date,
          {
            ...d,
            revenue: Number(d.revenue),
            orders: Number(d.orders),
            paidOrders: Number(d.paidOrders),
          },
        ]),
      );
      const trend = Array.from({ length: period.days }, (_, i) => {
        const date = wibDate(new Date(fromDate.getTime() + i * 86400000));
        return (
          byDate.get(date) ?? { date, revenue: 0, orders: 0, paidOrders: 0 }
        );
      });
      return {
        summary: {
          ...summary,
          average: summary.paidOrders
            ? summary.revenue / summary.paidOrders
            : 0,
          items: normalizedProducts.reduce((n, p) => n + p.quantity, 0),
        },
        trend,
        products: normalizedProducts,
        segments: segments.map((s) => ({
          ...s,
          orders: Number(s.orders),
          revenue: Number(s.revenue),
        })),
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export type SalesReport = Awaited<ReturnType<typeof getReport>>;
