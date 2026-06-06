// apps/admin/src/pages/api/crm/students/[id]/enroll.ts
// POST endpoint — enroll student in a course.
// Also auto-creates/updates tags (yoga_style, studio, format)
// and student_tags with last_seen_at.

import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../../../lib/supabase";
import type { TagType } from "@somaticmuse/shared";

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

  // 1. Fetch the course to get tag-relevant fields
  const { data: course, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("id, yoga_style, studio_name, format, start_at")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    const msg = encodeURIComponent(courseError?.message ?? "Course not found");
    return redirect(`/crm/students/${studentId}?error=${msg}`, 302);
  }

  // 2. Insert enrollment (ignore duplicate — UNIQUE constraint)
  const { error: enrollError } = await supabaseAdmin
    .from("course_students")
    .upsert(
      { course_id: courseId, student_id: studentId },
      { onConflict: "course_id,student_id", ignoreDuplicates: true },
    );

  if (enrollError) {
    console.error("[CRM] Enroll failed:", enrollError.message);
    const msg = encodeURIComponent(`Enrollment error: ${enrollError.message}`);
    return redirect(`/crm/students/${studentId}?error=${msg}`, 302);
  }

  // 3. Auto-create/update tags and student_tags
  const tagEntries: { type: TagType; value: string }[] = [
    { type: "yoga_style", value: course.yoga_style },
    { type: "studio", value: course.studio_name },
    { type: "format", value: course.format },
  ];

  for (const entry of tagEntries) {
    // Upsert tag (creates if new, returns existing)
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

    // If tag still has default color, auto-assign from palette
    if (tag.color === "#6B7280") {
      await supabaseAdmin.rpc("assign_tag_color", { p_tag_id: tag.id });
    }

    // Upsert student_tag — update last_seen_at if course is more recent
    const { error: stError } = await supabaseAdmin.from("student_tags").upsert(
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

  return redirect(`/crm/students/${studentId}?status=enrolled`, 302);
};
