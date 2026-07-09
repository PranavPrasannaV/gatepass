export async function handler(req: Request, params: { id: string }) {
  // Uses the server's own scoped token against a fixed internal endpoint.
  const token = process.env.SERVICE_TOKEN;
  return await fetch("https://api.internal/records/" + encodeURIComponent(params.id), {
    headers: { authorization: `Bearer ${token}` },
  });
}
