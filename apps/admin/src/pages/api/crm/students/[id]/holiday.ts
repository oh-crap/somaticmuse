// apps/admin/src/pages/api/crm/students/[id]/holiday.ts
// POST endpoint — set or clear holiday_until for a student.
// Student won't appear in sleeping clients list until this date.

import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../../../lib/supabase";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const studentId = params.id;
  if (!studentId) {
    return redirect("/crm?error=Missing+student+ID", 302);
  }

  const formData = await request.formData();
  const dateValue = String(formData.get("holiday_until") ?? "").trim();

  // Empty value = clear holiday
  const holiday_until = dateValue || null;

  // Validate date format if provided
  if (holiday_until) {
    const parsed = new Date(holiday_until);
    if (isNaN(parsed.getTime())) {
      const msg = encodeURIComponent("Invalid date format");
      return redirect(`/crm/students/${studentId}?error=${msg}`, 302);
    }
  }

  const { error } = await supabaseAdmin
    .from("students")
    .update({ holiday_until })
    .eq("id", studentId);

  if (error) {
    console.error("[CRM] Holiday update failed:", error.message);
    const msg = encodeURIComponent(`Database error: ${error.message}`);
    return redirect(`/crm/students/${studentId}?error=${msg}`, 302);
  }

  return redirect(`/crm/students/${studentId}?status=holiday_set`, 302);
};