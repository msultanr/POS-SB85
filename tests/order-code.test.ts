import { describe, expect, it } from "vitest";
import { orderCodeSchema } from "@/lib/order-code";
describe("short order codes", () => {
  it("accepts full, lowercase, spaced, and suffix-only codes", () => {
    for (const input of [
      "SB85-K7M4Q9X2",
      " sb85-k7m4q9x2 ",
      "K7M4Q9X2",
      "k7m4 q9x2",
      "SB85K7M4Q9X2",
    ])
      expect(orderCodeSchema.parse(input)).toBe("SB85-K7M4Q9X2");
    expect(orderCodeSchema.parse("SB85K7M4")).toBe("SB85-SB85K7M4");
  });
  it("rejects sequential queue numbers, internal IDs, invalid lengths and ambiguous characters", () => {
    for (const value of [
      "SB-0001",
      "cmuc8k0un00001jrypbxz3ahe",
      "SB85-ABCDEFG",
      "SB85-ABCDEFGHI",
      "SB85-00000000",
      "SB85-11111111",
      "SB85-IIIIIIII",
      "SB85-OOOOOOOO",
      "<script>",
    ])
      expect(orderCodeSchema.safeParse(value).success).toBe(false);
  });
});
