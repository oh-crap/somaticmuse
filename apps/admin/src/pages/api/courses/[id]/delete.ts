// apps/admin/src/pages/api/courses/[id]/delete.ts
// POST endpoint pro smazání kurzu.
// Triggered from list page via form with onsubmit confirm().

import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../../lib/supabase";
import { logAudit } from "../../../../lib/audit";

export const POST: APIRoute = async ({ params, redirect }) => {
  const id = params.id;
  if (!id) {
    return redirect("/?error=Missing+course+ID", 302);
  }

  const { error } = await supabaseAdmin.from("courses").delete().eq("id", id);

  if (error) {
    console.error("[Admin] Course delete failed:", error.message);
    const errorMsg = encodeURIComponent(`Database error: ${error.message}`);
    return redirect(`/?error=${errorMsg}`, 302);
  }

  logAudit("delete", "course", id);
  return redirect("/?status=deleted", 302);
};
