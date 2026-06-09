// apps/admin/src/lib/audit.ts
// Lightweight audit logger. Writes one line per mutation to console.info,
// which Cloudflare Workers Observability captures and retains.
//
// Format is stable so logs can be grepped:
//   [Audit] {ISO timestamp} {action} {resource_type} {resource_id}
//
// Action: "create" | "update" | "delete" | "enroll"
// Resource type: "course" | "testimonial" | "student" | "enrollment" | "tag"

export function logAudit(
  action: string,
  resourceType: string,
  resourceId: string,
): void {
  console.info(
    `[Audit] ${new Date().toISOString()} ${action} ${resourceType} ${resourceId}`,
  );
}