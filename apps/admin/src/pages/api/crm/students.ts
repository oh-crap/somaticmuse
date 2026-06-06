// apps/admin/src/pages/api/crm/students.ts
// POST endpoint — create a new student.

import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabase";
import type { StudentInsert } from "@somaticmuse/shared";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();

  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const facebook_url = String(formData.get("facebook_url") ?? "").trim() || null;
  const instagram_url = String(formData.get("instagram_url") ?? "").trim() || null;

  // ---- Validation ---------------------------------------------------
  const errors: string[] = [];

  if (!first_name) errors.push("First name is required");
  if (!last_name) errors.push("Last name is required");

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Invalid email format");
  }

  if (facebook_url) {
    try { new URL(facebook_url); } catch {
      errors.push("Facebook URL is not a valid URL");
    }
  }

  if (instagram_url) {
    try { new URL(instagram_url); } catch {
      errors.push("Instagram URL is not a valid URL");
    }
  }

  if (errors.length > 0) {
    const errorMsg = encodeURIComponent(errors.join("; "));
    return redirect(`/crm/students/new?error=${errorMsg}`, 302);
  }

  // ---- Insert -------------------------------------------------------
  const studentData: StudentInsert = {
    first_name,
    last_name,
    email,
    phone,
    facebook_url,
    instagram_url,
  };

  const { data, error } = await supabaseAdmin
    .from("students")
    .insert(studentData)
    .select("id")
    .single();

  if (error) {
    console.error("[CRM] Student insert failed:", error.message);
    const errorMsg = encodeURIComponent(`Database error: ${error.message}`);
    return redirect(`/crm/students/new?error=${errorMsg}`, 302);
  }

  // Redirect to the new student's detail page
  return redirect(`/crm/students/${data.id}?status=created`, 302);
};