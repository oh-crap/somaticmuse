// apps/admin/src/pages/api/testimonials/[id].ts
// POST endpoint pro update existing testimonial.

import type { APIRoute } from "astro";
import { supabaseAdmin, type TestimonialUpdate } from "../../../lib/supabase";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id;
  if (!id) {
    return redirect("/testimonials?error=Missing+testimonial+ID", 302);
  }

  const formData = await request.formData();

  const name = String(formData.get("name") ?? "").trim();
  const role_or_location = String(
    formData.get("role_or_location") ?? "",
  ).trim();
  const content = String(formData.get("content") ?? "").trim();
  const photo_url_raw = String(formData.get("photo_url") ?? "").trim();
  const display_order_raw = String(formData.get("display_order") ?? "");
  const visible = formData.get("visible") === "on";

  // ---- Validation -----------------------------------------------
  const errors: string[] = [];

  if (!name) errors.push("Name is required");
  if (!content) errors.push("Content is required");

  const display_order = Number(display_order_raw);
  if (!Number.isInteger(display_order) || display_order < 0) {
  errors.push("Display order must be a non-negative integer");
  }

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
    return redirect(`/testimonials/${id}/edit?error=${errorMsg}`, 302);
  }

  // ---- Update ---------------------------------------------------
  const updateData: TestimonialUpdate = {
    name,
    role_or_location: role_or_location || null,
    content,
    photo_url,
    display_order,
    visible,
  };

  const { error } = await supabaseAdmin
    .from("testimonials")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("[Admin] Testimonial update failed:", error.message);
    const errorMsg = encodeURIComponent(`Database error: ${error.message}`);
    return redirect(`/testimonials/${id}/edit?error=${errorMsg}`, 302);
  }

  return redirect("/testimonials?status=updated", 302);
};
