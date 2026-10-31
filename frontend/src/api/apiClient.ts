const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "/api";

function getCsrfCookie(): string {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("csrftoken="));

  if (!cookie) {
    throw new Error("Unable to read the CSRF cookie. Please sign in again.");
  }
  return decodeURIComponent(cookie.slice("csrftoken=".length));
}

async function csrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/me/`, {
    credentials: "include",
  });
  if (!response.ok && response.status !== 401) {
    throw new Error(`Unable to prepare a secure request (${response.status}).`);
  }
  return getCsrfCookie();
}

async function responseError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    return Object.entries(record)
      .flatMap(([field, value]) => {
        const values = Array.isArray(value) ? value : [value];
        return values.map((message) => `${field}: ${String(message)}`);
      })
      .join("; ");
  }
  return `Request failed (${response.status}).`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);
  const body = options.body;

  if (
    !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)
  ) {
    headers.set("X-CSRFToken", await csrfToken());
  }
  if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(await responseError(response));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export { API_BASE_URL };
