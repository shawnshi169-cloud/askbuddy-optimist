/**
 * Stable top-level product navigation and content channels.
 *
 * These values are versioned product vocabulary, not rows from a category
 * table. Platform code owns route, icon, and visual presentation mappings.
 */
export const PRODUCT_CHANNEL_SLUGS = [
  "education-learning",
  "career-development",
  "lifestyle-services",
  "hobbies-skills",
] as const;

export type ProductChannelSlug = (typeof PRODUCT_CHANNEL_SLUGS)[number];

export interface ProductChannelDefinition {
  slug: ProductChannelSlug;
  label: string;
  sortOrder: number;
}

export const PRODUCT_CHANNEL_CATALOG = [
  { slug: "education-learning", label: "教育学习", sortOrder: 0 },
  { slug: "career-development", label: "职业发展", sortOrder: 1 },
  { slug: "lifestyle-services", label: "生活服务", sortOrder: 2 },
  { slug: "hobbies-skills", label: "兴趣技能", sortOrder: 3 },
] as const satisfies readonly ProductChannelDefinition[];

export const isProductChannelSlug = (value: unknown): value is ProductChannelSlug =>
  typeof value === "string"
  && (PRODUCT_CHANNEL_SLUGS as readonly string[]).includes(value);
