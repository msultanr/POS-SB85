import type { CategoryView } from "@/lib/types";

const priority = ["makanan utama", "camilan", "minuman"];
const compareName = (a: string, b: string) =>
  a.localeCompare(b, "id", { sensitivity: "base" });
const rank = (name: string) => {
  const index = priority.indexOf(name.trim().toLocaleLowerCase("id"));
  return index < 0 ? priority.length : index;
};

// Keep extra categories after the three primary categories; alphabetize within each.
export function sortCatalog<
  T extends { id: string; name: string; categoryId: string },
>(products: T[], categories: CategoryView[]) {
  const sortedCategories = [...categories].sort(
    (a, b) =>
      rank(a.name) - rank(b.name) ||
      compareName(a.name, b.name) ||
      a.id.localeCompare(b.id),
  );
  const positions = new Map(
    sortedCategories.map((category, index) => [category.id, index]),
  );
  return {
    categories: sortedCategories,
    products: [...products].sort(
      (a, b) =>
        (positions.get(a.categoryId) ?? categories.length) -
          (positions.get(b.categoryId) ?? categories.length) ||
        compareName(a.name, b.name) ||
        a.id.localeCompare(b.id),
    ),
  };
}
