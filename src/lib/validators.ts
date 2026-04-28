import { z } from "zod";

import { ValidationError } from "./errors.js";
import { AGE_GROUPS, GENDERS, SORT_ORDERS, SORTABLE_FIELDS } from "../types.js";

const filterSchema = z.object({
  gender: z.enum(GENDERS).optional(),
  country: z.string().length(2).optional(),
  ageGroup: z.enum(AGE_GROUPS).optional(),
  minAge: z.coerce.number().int().min(0).max(150).optional(),
  maxAge: z.coerce.number().int().min(0).max(150).optional(),
  sortBy: z.enum(SORTABLE_FIELDS).optional(),
  order: z.enum(SORT_ORDERS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type ProfileFilters = z.infer<typeof filterSchema>;

export function validateFilters(raw: unknown): ProfileFilters {
  const result = filterSchema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError(formatZodError(result.error));
  }

  if (
    result.data.minAge !== undefined &&
    result.data.maxAge !== undefined &&
    result.data.minAge > result.data.maxAge
  ) {
    throw new ValidationError("--min-age cannot exceed --max-age");
  }

  return result.data;
}

export function filtersToQuery(
  filters: ProfileFilters,
): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (filters.gender) query.gender = filters.gender;
  if (filters.country) query.country_id = filters.country.toUpperCase();
  if (filters.ageGroup) query.age_group = filters.ageGroup;
  if (filters.minAge !== undefined) query.min_age = filters.minAge;
  if (filters.maxAge !== undefined) query.max_age = filters.maxAge;
  if (filters.sortBy) query.sort_by = filters.sortBy;
  if (filters.order) query.order = filters.order;
  if (filters.page !== undefined) query.page = filters.page;
  if (filters.limit !== undefined) query.limit = filters.limit;
  return query;
}

function formatZodError(err: z.ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Invalid input";

  const path = issue.path.join(".");
  if (issue.code === "invalid_enum_value") {
    return `Invalid --${kebabCase(path)}: expected one of ${issue.options.join(", ")}`;
  }
  return `Invalid --${kebabCase(path)}: ${issue.message}`;
}

function kebabCase(s: string): string {
  return s.replace(/([A-Z])/g, "-$1").toLowerCase();
}
