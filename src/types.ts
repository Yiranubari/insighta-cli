export interface Profile {
  id: string;
  name: string;
  gender: string | null;
  gender_probability: number | null;
  age: number | null;
  age_group: string | null;
  country_id: string | null;
  country_name: string | null;
  country_probability: number | null;
  created_at: string;
}
export interface PaginatedResponse<T> {
  status: "success";
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  links: {
    self: string;
    next: string | null;
    prev: string | null;
  };
  data: T[];
}

export const SORTABLE_FIELDS = [
  "age",
  "created_at",
  "gender_probability",
] as const;
export type SortField = (typeof SORTABLE_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const AGE_GROUPS = ["child", "teenager", "adult", "senior"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];
