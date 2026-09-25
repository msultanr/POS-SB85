import { z } from "zod";
export const orderCodeSchema = z
  .string()
  .trim()
  .max(24)
  .transform((value) => {
    const compact = value.toUpperCase().replace(/[\s-]/g, "");
    const suffix =
      compact.length === 12 && compact.startsWith("SB85")
        ? compact.slice(4)
        : compact;
    return `SB85-${suffix}`;
  })
  .pipe(z.string().regex(/^SB85-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/));
