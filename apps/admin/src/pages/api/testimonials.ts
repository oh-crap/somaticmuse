// apps/admin/src/pages/api/testimonials.ts
// POST endpoint pro vytvoření testimonialu.
// Form action: <form action="/api/testimonials" method="POST">

import type { APIRoute } from "astro";
import { supabaseAdmin, type TestimonialInsert } from "../../lib/supabase";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();

  const name = String(formData.get("name") ?? "").trim();
  const role_or_location = String(formData.get("role_or_location") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const photo_url_raw = String(formData.get("photo_url") ?? "").trim();
  const display_order_raw = String(formData.get("display_order") ?? "");
  const visible = formData.get("visible") === "on";

  // ---- Validation -----------------------------------------------
  const errors: string[] = [];

  if (!name) errors.push("Name is required");
  if (!content) errors.push("Content is required");

  // Display order: must be valid integer ≥ 0
  const display_order = parseInt(display_order_raw, 10);
  if (isNaN(display_order) || display_order < 0) {
    errors.push("Display order must be a non-negative integer");
  }

  // Photo URL: optional, but if provided must be valid URL
  let photo_url: string | null = null;
  if (photo_url_raw) {
    try {
      new URL(photo_url_raw);
      photo_url = photo_url_raw;
    } catch {
      errors.push("Photo URL is not a valid URL");
    }
  }

  if (errors.length > 0) {
    const errorMsg = encodeURIComponent(errors.join("; "));
    return redirect(`/testimonials/new?error=${errorMsg}`, 302);
  }

  // ---- Insert ---------------------------------------------------
  const insertData: TestimonialInsert = {
    name,
    role_or_location: role_or_location || null,
    content,
    photo_url,
    display_order,
    visible,
  };

  const { error } = await supabaseAdmin
    .from("testimonials")
    .insert(insertData);

  if (error) {
    console.error("[Admin] Testimonial insert failed:", error.message);
    const errorMsg = encodeURIComponent(`Database error: ${error.message}`);
    return redirect(`/testimonials/new?error=${errorMsg}`, 302);
  }

  return redirect("/testimonials?status=created", 302);
};

  const statusMessages: Record<string, string> = {
  created: "Testimonial created successfully",
  updated: "Testimonial updated successfully",
  deleted: "Testimonial deleted successfully",
  republished: "Republish triggered. Website will update in ~1-2 min.",


};