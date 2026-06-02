import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../../lib/supabase";

export const POST: APIRoute = async ({ params, redirect }) => {
  const id = params.id;
  if (!id) {
    return redirect("/?error=Missing+course+ID", 302);
  }

  const { error } = await supabaseAdmin.from("courses").delete().eq("id", id);

  if (error) {
    console.error("[Admin] Delete failed:", error.message);
    const errorMsg = encodeURIComponent(`Database error: ${error.message}`);
    return redirect(`/?error=${errorMsg}`, 302);
  }

  return redirect("/?status=deleted", 302);
};
