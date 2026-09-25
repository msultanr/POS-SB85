import { z } from "zod";
export function wibDate(date: Date) {
  return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}
export function reportPeriod(from?: string, to?: string, now = new Date()) {
  const today = wibDate(now);
  const start = from ?? `${today.slice(0, 7)}-01`;
  const end = to ?? today;
  if (
    !z.iso.date().safeParse(start).success ||
    !z.iso.date().safeParse(end).success
  )
    throw new Error("Tanggal tidak valid. Gunakan format YYYY-MM-DD.");
  const fromDate = new Date(`${start}T00:00:00+07:00`);
  const untilDate = new Date(
    new Date(`${end}T00:00:00+07:00`).getTime() + 86400000,
  );
  const days = (untilDate.getTime() - fromDate.getTime()) / 86400000;
  if (days < 1 || days > 366)
    throw new Error("Pilih rentang tanggal berurutan, maksimal 366 hari.");
  return { from: start, to: end, fromDate, untilDate, days };
}
export type ReportPeriod = ReturnType<typeof reportPeriod>;
