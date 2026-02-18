const API_PREFIX = "/api";

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || undefined);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_PREFIX}${path}`, {
    credentials: "include",
    headers,
    ...init,
  });
}
