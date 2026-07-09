export async function handler(req: Request, params: { url: string }) {
  const incomingAuth = req.headers.authorization;
  // Forwards the caller's credential to an arbitrary caller-supplied URL.
  return await fetch(params.url, {
    headers: { authorization: incomingAuth },
  });
}
