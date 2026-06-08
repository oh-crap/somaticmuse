// apps/admin/src/pages/api/crm/courses/[id]/enroll.ts
// POST endpoint — enroll a student in this course (from course context).
// Reuses the same tag auto-creation logic as student-side enrollment.

import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../../../lib/supabase";
import { safeRedirect } from "../../../../../lib/redirect";
import type { TagType } from "@somaticmuse/shared";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const courseId = params.id;
  if (!courseId) {
    return redirect("/crm?error=Missing+course+ID", 302);
  }

  const formData = await request.formData();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const redirectTo = safeRedirect(
    formData.get("redirect_to")?.toString(),
    `/crm/courses/${courseId}/enroll`,
  );

  if (!studentId) {
    return redirect(
      `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}error=Missing+student+ID`,
      302,
    );
  }

  // 1. Fetch the course
  const { data: course, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("id, yoga_style, studio_name, format, start_at")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    const msg = encodeURIComponent(courseError?.message ?? "Course not found");
    return redirect(
      `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}error=${msg}`,
      302,
    );
  }

  // 2. Insert enrollment
  const { error: enrollError } = await supabaseAdmin
    .from("course_students")
    .upsert(
      { course_id: courseId, student_id: studentId },
      { onConflict: "course_id,student_id", ignoreDuplicates: true },
    );

  if (enrollError) {
    console.error("[CRM] Enroll failed:", enrollError.message);
    const msg = encodeURIComponent(`Enrollment error: ${enrollError.message}`);
    return redirect(
      `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}error=${msg}`,
      302,
    );
  }

  // 3. Auto-create/update tags
  const tagEntries: { type: TagType; value: string }[] = [
    { type: "yoga_style", value: course.yoga_style },
    { type: "studio", value: course.studio_name },
    { type: "format", value: course.format },
  ];

  for (const entry of tagEntries) {
    const { data: tag, error: tagError } = await supabaseAdmin
      .from("tags")
      .upsert(
        { type: entry.type, value: entry.value },
        { onConflict: "type,value", ignoreDuplicates: false },
      )
      .select("id, color")
      .single();

    if (tagError || !tag) {
      console.error("[CRM] Tag upsert failed:", tagError?.message, entry);
      continue;
    }

    if (tag.color === "#6B7280") {
      await supabaseAdmin.rpc("assign_tag_color", { p_tag_id: tag.id });
    }

    const { error: stError } = await supabaseAdmin
      .from("student_tags")
      .upsert(
        {
          student_id: studentId,
          tag_id: tag.id,
          last_seen_at: course.start_at,
        },
        { onConflict: "student_id,tag_id" },
      );

    if (stError) {
      console.error("[CRM] student_tag upsert failed:", stError.message);
    }
  }

  return redirect(redirectTo, 302);
};
