export const PROJECT_CATEGORIES = [
  "Idea Pool",
  "Formal Experimental Designs",
  "Completed Experimental Projects",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];
export type ProjectLifecycle = "idea" | "design" | "in_progress" | "completed";

export function projectCategoryForLifecycle(
  lifecycle?: ProjectLifecycle | null
): ProjectCategory {
  if (lifecycle === "completed") return "Completed Experimental Projects";
  if (lifecycle === "design" || lifecycle === "in_progress") {
    return "Formal Experimental Designs";
  }
  return "Idea Pool";
}

export function lifecycleForProjectCategory(
  category: ProjectCategory,
  current?: ProjectLifecycle | null
): ProjectLifecycle {
  if (category === "Completed Experimental Projects") return "completed";
  if (category === "Formal Experimental Designs") {
    return current === "in_progress" ? "in_progress" : "design";
  }
  return "idea";
}
