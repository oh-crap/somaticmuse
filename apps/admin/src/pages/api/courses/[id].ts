import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabase";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id;
  if (!id) {
    return redirect("/?error=Missing+course+ID", 302);
  }

  const formData = await request.formData();

  const title = String(formData.get("title") ?? "").trim();
  const yoga_style = String(formData.get("yoga_style") ?? "").trim();
  const format = String(formData.get("format") ?? "");
  const start_input = String(formData.get("start_at") ?? "");
  const end_input = String(formData.get("end_at") ?? "");
  const studio_name = String(formData.get("studio_name") ?? "").trim();
  const studio_address = String(formData.get("studio_address") ?? "").trim();
  const booking_url_raw = String(formData.get("booking_url") ?? "").trim();

  // ---- Validation ---------------------------------------------------
  const errors: string[] = [];

  if (!title) errors.push("Title is required");
  if (!yoga_style) errors.push("Yoga style is required");
  if (format !== "individual" && format !== "group") {
    errors.push("Format must be 'individual' or 'group'");
  }
  if (!start_input) errors.push("Start time is required");
  if (!end_input) errors.push("End time is required");
  if (!studio_name) errors.push("Studio name is required");
  if (!studio_address) errors.push("Studio address is required");

  let start_at = "";
  let end_at = "";
  try {
    start_at = start_input ? new Date(start_input).toISOString() : "";
    end_at = end_input ? new Date(end_input).toISOString() : "";
  } catch {
    errors.push("Invalid date format");
  }

  // end > start (always strict)
  if (start_at && end_at) {
    if (new Date(end_at).getTime() <= new Date(start_at).getTime()) {
      errors.push("End time must be after start time");
    }
  }

  // NOTE: Past dates ALLOWED for editing (unlike create).
  // Instructor may need to fix typos in historical records.

  let booking_url: string | null = null;
  if (booking_url_raw) {
    try {
      new URL(booking_url_raw);
      booking_url = booking_url_raw;
    } catch {
      errors.push("Booking URL is not a valid URL");
    }
  }

  if (errors.length > 0) {
    const errorMsg = encodeURIComponent(errors.join("; "));
    return redirect(`/courses/${id}/edit?error=${errorMsg}`, 302);
  }

  // ---- Update ------------------------------------------------------
  const { error } = await supabaseAdmin
    .from("courses")
    .update({
      title,
      yoga_style,
      format: format as "individual" | "group",
      start_at,
      end_at,
      studio_name,
      studio_address,
      booking_url,
    })
    .eq("id", id);

  if (error) {
    console.error("[Admin] Update failed:", error.message);
    const errorMsg = encodeURIComponent(`Database error: ${error.message}`);
    return redirect(`/courses/${id}/edit?error=${errorMsg}`, 302);
  }

  return redirect("/?status=updated", 302);
};