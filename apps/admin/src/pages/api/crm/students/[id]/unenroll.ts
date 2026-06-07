// apps/admin/src/pages/api/crm/students/[id]/unenroll.ts
// POST endpoint — remove student from a course.

import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../../../lib/supabase";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const studentId = params.id;
  if (!studentId) {
    return redirect("/crm?error=Missing+student+ID", 302);
  }

  const formData = await request.formData();
  const courseId = String(formData.get("course_id") ?? "").trim();

  if (!courseId) {
    return redirect(`/crm/students/${studentId}?error=Missing+course+ID`, 302);
  }

  const { error } = await supabaseAdmin
    .from("course_students")
    .delete()
    .eq("course_id", courseId)
    .eq("student_id", studentId);

  if (error) {
    console.error("[CRM] Unenroll failed:", error.message);
    const msg = encodeURIComponent(`Unenroll error: ${error.message}`);
    return redirect(`/crm/students/${studentId}?error=${msg}`, 302);
  }

  return redirect(`/crm/students/${studentId}?status=unenrolled`, 302);
};
