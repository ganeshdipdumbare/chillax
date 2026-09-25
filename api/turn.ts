declare const process: { env: Record<string, string | undefined> };

const CREDENTIAL_TTL_SECONDS = 6 * 60 * 60;

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  if (!origin.startsWith("chrome-extension://")) return {};
  return { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
}

async function hmacSha1Base64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// coturn `use-auth-secret`: username is "<unix expiry>:<label>", password is base64(HMAC-SHA1(secret, username)).
export async function GET(request: Request) {
  const cors = corsHeaders(request);
  const secret = process.env.TURN_SECRET;
  const urls = (process.env.TURN_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  if (!secret || !urls.length) {
    return Response.json({ error: "TURN is not configured" }, { status: 503, headers: cors });
  }
  const username = `${Math.floor(Date.now() / 1000) + CREDENTIAL_TTL_SECONDS}:chillax`;
  const credential = await hmacSha1Base64(secret, username);
  return Response.json(
    { iceServers: [{ urls, username, credential }], ttl: CREDENTIAL_TTL_SECONDS },
    { headers: { ...cors, "Cache-Control": "no-store" } },
  );
}
