export * from "./types";
export * from "./crm-types";
export * from "./supabase";

// ============================================================
// Testimonial
// ============================================================

export interface Testimonial {
  id: string;
  name: string;
  role_or_location: string | null;
  content: string;
  photo_url: string | null;
  display_order: number;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

export type TestimonialInsert = Omit<Testimonial, "id" | "created_at" | "updated_at">;
export type TestimonialUpdate = Partial<TestimonialInsert>;