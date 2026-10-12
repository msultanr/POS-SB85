import { describe, expect, it } from "vitest";
import { sortCatalog } from "@/lib/catalog-order";

describe("catalog ordering", () => {
  const categories = [
    { id: "drink", name: "Minuman" },
    { id: "snack", name: "Camilan" },
    { id: "main", name: " Makanan Utama " },
    { id: "extra", name: "Dessert" },
  ];
  const products = [
    { id: "1", name: "Air", categoryId: "drink" },
    { id: "2", name: "Roti", categoryId: "snack" },
    { id: "3", name: "Nasi", categoryId: "main" },
    { id: "4", name: "Ayam", categoryId: "main" },
    { id: "5", name: "Es krim", categoryId: "extra" },
  ];
  it("orders primary categories first, then alphabetizes menus within categories", () => {
    const sorted = sortCatalog(products, categories);
    expect(sorted.categories.map((c) => c.id)).toEqual([
      "main",
      "snack",
      "drink",
      "extra",
    ]);
    expect(sorted.products.map((p) => p.name)).toEqual([
      "Ayam",
      "Nasi",
      "Roti",
      "Air",
      "Es krim",
    ]);
  });
  it("preserves inputs and ordering after search/filter", () => {
    const before = JSON.stringify({ products, categories });
    const sorted = sortCatalog(products, categories);
    expect(JSON.stringify({ products, categories })).toBe(before);
    expect(
      sorted.products
        .filter((p) => p.name.toLowerCase().includes("a"))
        .map((p) => p.name),
    ).toEqual(["Ayam", "Nasi", "Air"]);
  });
  it("handles empty and unknown categories without dropping products", () => {
    expect(sortCatalog([], []).products).toEqual([]);
    expect(sortCatalog(products, []).products).toHaveLength(products.length);
  });
});
