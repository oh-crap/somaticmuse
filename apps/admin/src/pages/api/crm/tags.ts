// apps/admin/src/pages/api/crm/tags.ts
// POST endpoint — create a new tag manually.

import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabase";
import type { TagType } from "@somaticmuse/shared";

const VALID_TYPES: TagType[] = ["yoga_style", "studio", "format"];

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();

  const type = String(formData.get("type") ?? "").trim() as TagType;
  const value = String(formData.get("value") ?? "").trim();

  const errors: string[] = [];

  if (!VALID_TYPES.includes(type)) {
    errors.push("Invalid tag type");
  }
  if (!value) {
    errors.push("Tag value is required");
  }

  if (errors.length > 0) {
    return redirect(`/crm/tags?error=${encodeURIComponent(errors.join("; "))}`, 302);
  }

  // Insert tag
  const { data: tag, error } = await supabaseAdmin
    .from("tags")
    .insert({ type, value })
    .select("id, color")
    .single();

  if (error) {
    // Likely duplicate
    const msg = error.message.includes("duplicate")
      ? "Tag already exists"
      : error.message;
    return redirect(`/crm/tags?error=${encodeURIComponent(msg)}`, 302);
  }

  // Auto-assign color from palette
  if (tag.color === "#6B7280") {
    await supabaseAdmin.rpc("assign_tag_color", { p_tag_id: tag.id });
  }

  return redirect("/crm/tags?status=created", 302);
};