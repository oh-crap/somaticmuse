// apps/admin/src/pages/api/crm/tags/[id].ts
// POST endpoint — update tag color or delete tag.
// Action determined by form field "action": "update_color" or "delete".

import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../../lib/supabase";
import { logAudit } from "../../../../lib/audit";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const tagId = params.id;
  if (!tagId) {
    return redirect("/crm/tags?error=Missing+tag+ID", 302);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "");

  if (action === "update_color") {
    const color = String(formData.get("color") ?? "").trim();
    if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return redirect("/crm/tags?error=Invalid+color+format", 302);
    }

    // Set color_assigned = true so the next auto-enrollment doesn't
    // overwrite this manually chosen color via assign_tag_color RPC.
    const { error } = await supabaseAdmin
      .from("tags")
      .update({ color, color_assigned: true })
      .eq("id", tagId);

    if (error) {
      console.error("[CRM] Tag color update failed:", error.message);
      return redirect(
        `/crm/tags?error=${encodeURIComponent(error.message)}`,
        302,
      );
    }

    logAudit("update", "tag", tagId);
    return redirect("/crm/tags?status=color_updated", 302);
  }

  if (action === "delete") {
    // Deleting a tag also cascades to student_tags
    const { error } = await supabaseAdmin.from("tags").delete().eq("id", tagId);

    if (error) {
      console.error("[CRM] Tag delete failed:", error.message);
      return redirect(
        `/crm/tags?error=${encodeURIComponent(error.message)}`,
        302,
      );
    }

    logAudit("delete", "tag", tagId);
    return redirect("/crm/tags?status=deleted", 302);
  }

  return redirect("/crm/tags?error=Unknown+action", 302);
};
