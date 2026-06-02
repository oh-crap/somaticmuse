// apps/admin/src/pages/api/testimonials/[id]/delete.ts
// POST endpoint pro smazání testimonialu.
// Triggered from list page via form with onsubmit confirm().

import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../../lib/supabase";

export const POST: APIRoute = async ({ params, redirect }) => {
  const id = params.id;
  if (!id) {
    return redirect("/testimonials?error=Missing+testimonial+ID", 302);
  }

  const { error } = await supabaseAdmin
    .from("testimonials")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Admin] Testimonial delete failed:", error.message);
    const errorMsg = encodeURIComponent(`Database error: ${error.message}`);
    return redirect(`/testimonials?error=${errorMsg}`, 302);
  }

  return redirect("/testimonials?status=deleted", 302);
};
