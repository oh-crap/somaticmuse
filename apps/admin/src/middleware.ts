// apps/admin/src/middleware.ts
// Validates the Cloudflare Access JWT on every request.
// Defense-in-depth: even if Access is misconfigured or bypassed,
// the server refuses requests without a valid signed token.

import { defineMiddleware } from "astro:middleware";
import { jwtVerify, createRemoteJWKSet } from "jose";

const TEAM_DOMAIN = import.meta.env.CF_ACCESS_TEAM_DOMAIN;
const AUD = import.meta.env.CF_ACCESS_AUD;
const JWKS = createRemoteJWKSet(
  new URL(`https://${TEAM_DOMAIN}.cloudflareaccess.com/cdn-cgi/access/certs`),
);

export const onRequest = defineMiddleware(async (context, next) => {
  // Dev bypass — Access does not exist locally
  if (import.meta.env.DEV) return next();

  const jwt = context.request.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) {
    return new Response("Unauthorized: missing Access JWT", { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(jwt, JWKS, {
      issuer: `https://${TEAM_DOMAIN}.cloudflareaccess.com`,
      audience: AUD,
    });
    // Store identity in locals for audit logging downstream
    context.locals.userEmail = payload.email as string;
  } catch {
    return new Response("Unauthorized: invalid Access JWT", { status: 401 });
  }

  return next();
});
