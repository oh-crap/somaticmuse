// apps/admin/src/pages/api/crm/students/[id]/delete.ts
// POST endpoint — permanently delete a student and all related records.
// CASCADE on foreign keys handles course_students and student_tags.

import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../../../lib/supabase";

export const POST: APIRoute = async ({ params, redirect }) => {
  const studentId = params.id;
  if (!studentId) {
    return redirect("/crm?error=Missing+student+ID", 302);
  }

  const { error } = await supabaseAdmin
    .from("students")
    .delete()
    .eq("id", studentId);

  if (error) {
    console.error("[CRM] Student delete failed:", error.message);
    const msg = encodeURIComponent(`Database error: ${error.message}`);
    return redirect(`/crm/students/${studentId}?error=${msg}`, 302);
  }

  return redirect("/crm?status=student_deleted", 302);
};