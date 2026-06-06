// apps/admin/src/pages/api/crm/students/[id]/deactivate.ts
// POST endpoint — toggle student active/inactive.
// Inactive students are hidden everywhere except name search.

import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../../../lib/supabase";

export const POST: APIRoute = async ({ params, redirect }) => {
  const studentId = params.id;
  if (!studentId) {
    return redirect("/crm?error=Missing+student+ID", 302);
  }

  // Fetch current state
  const { data: student, error: fetchError } = await supabaseAdmin
    .from("students")
    .select("active")
    .eq("id", studentId)
    .single();

  if (fetchError || !student) {
    const msg = encodeURIComponent(fetchError?.message ?? "Student not found");
    return redirect(`/crm?error=${msg}`, 302);
  }

  // Toggle
  const newActive = !student.active;

  const { error } = await supabaseAdmin
    .from("students")
    .update({ active: newActive })
    .eq("id", studentId);

  if (error) {
    console.error("[CRM] Deactivate toggle failed:", error.message);
    const msg = encodeURIComponent(`Database error: ${error.message}`);
    return redirect(`/crm/students/${studentId}?error=${msg}`, 302);
  }

  const status = newActive ? "reactivated" : "deactivated";
  return redirect(`/crm/students/${studentId}?status=${status}`, 302);
};