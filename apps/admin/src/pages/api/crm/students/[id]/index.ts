// apps/admin/src/pages/api/crm/students/[id].ts
// PATCH endpoint — partial update of student fields (autosave).
// Accepts JSON body with any subset of editable fields.

import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../../../lib/supabase";
import type { StudentUpdate } from "@somaticmuse/shared";
import { logAudit } from "../../../../../lib/audit";

/** Fields that the client is allowed to PATCH. */
const ALLOWED_FIELDS = new Set([
  "first_name",
  "last_name",
  "photo_url",
  "email",
  "phone",
  "facebook_url",
  "instagram_url",
  "notes_health",
  "notes_family",
  "notes_hobbies",
  "notes_other",
]);

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing student ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

// Filter to allowed fields only
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      // Normalize empty strings to null for optional fields
      updateData[key] = typeof value === "string" && value.trim() === "" ? null : value;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return new Response(JSON.stringify({ error: "No valid fields to update" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ---- Validation (mirrors POST /api/crm/students) ----
  const validationErrors: string[] = [];

  if ("first_name" in updateData && !updateData.first_name) {
    validationErrors.push("First name cannot be empty");
  }
  if ("last_name" in updateData && !updateData.last_name) {
    validationErrors.push("Last name cannot be empty");
  }

  // Email: optional, but if present must match the same loose regex as POST.
  if (
    "email" in updateData &&
    updateData.email !== null &&
    typeof updateData.email === "string" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)
  ) {
    validationErrors.push("Invalid email format");
  }

  // URL fields: optional, but if present must parse as a valid URL.
  // Also reject non-http(s) schemes to prevent javascript: and similar.
  const urlFields = ["photo_url", "facebook_url", "instagram_url"] as const;
  for (const field of urlFields) {
    if (field in updateData && updateData[field] !== null) {
      const raw = updateData[field];
      if (typeof raw !== "string") {
        validationErrors.push(`${field} must be a string`);
        continue;
      }
      try {
        const parsed = new URL(raw);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          validationErrors.push(`${field} must use http or https`);
        }
      } catch {
        validationErrors.push(`${field} is not a valid URL`);
      }
    }
  }

  if (validationErrors.length > 0) {
    return new Response(
      JSON.stringify({ error: validationErrors.join("; ") }),
      {
        status: 422,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("students")
    .update(updateData as StudentUpdate)
    .eq("id", id)
    .select("updated_at")
    .single();

  if (error) {
    console.error("[CRM] Student update failed:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  logAudit("update", "student", id);
  return new Response(JSON.stringify({ ok: true, updated_at: data.updated_at }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};