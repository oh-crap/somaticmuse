// apps/admin/src/pages/api/crm/students.ts
// POST endpoint — create a new student.
// If course_id is provided, also enrolls the student in that course
// and auto-creates tags.

import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabase";
import type { StudentInsert, TagType } from "@somaticmuse/shared";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();

  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const facebook_url = String(formData.get("facebook_url") ?? "").trim() || null;
  const instagram_url = String(formData.get("instagram_url") ?? "").trim() || null;
  const courseId = String(formData.get("course_id") ?? "").trim() || null;

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
    const courseParam = courseId ? `&course_id=${courseId}` : "";
    return redirect(`/crm/students/new?error=${errorMsg}${courseParam}`, 302);
  }

  // ---- Insert student -----------------------------------------------
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
    const courseParam = courseId ? `&course_id=${courseId}` : "";
    return redirect(`/crm/students/new?error=${errorMsg}${courseParam}`, 302);
  }

  // ---- Auto-enroll in course if course_id provided -------------------
  if (courseId) {
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("id, yoga_style, studio_name, format, start_at")
      .eq("id", courseId)
      .single();

    if (course) {
      // Insert enrollment
      await supabaseAdmin
        .from("course_students")
        .upsert(
          { course_id: courseId, student_id: data.id },
          { onConflict: "course_id,student_id", ignoreDuplicates: true },
        );

      // Auto-create tags
      const tagEntries: { type: TagType; value: string }[] = [
        { type: "yoga_style", value: course.yoga_style },
        { type: "studio", value: course.studio_name },
        { type: "format", value: course.format },
      ];

      for (const entry of tagEntries) {
        const { data: tag } = await supabaseAdmin
          .from("tags")
          .upsert(
            { type: entry.type, value: entry.value },
            { onConflict: "type,value", ignoreDuplicates: false },
          )
          .select("id, color")
          .single();

        if (tag) {
          if (tag.color === "#6B7280") {
            await supabaseAdmin.rpc("assign_tag_color", { p_tag_id: tag.id });
          }

          await supabaseAdmin
            .from("student_tags")
            .upsert(
              { student_id: data.id, tag_id: tag.id, last_seen_at: course.start_at },
              { onConflict: "student_id,tag_id" },
            );
        }
      }
    }
  }

  return redirect(`/crm/students/${data.id}?status=created`, 302);
};