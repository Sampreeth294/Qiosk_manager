export type AuthUser = {
  id: number;
  username: string;
  is_staff: boolean;
  is_superuser: boolean;
};

type UserResponse = {
  user: AuthUser;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "/api";

function getCsrfCookie(): string {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("csrftoken="));

  if (cookie) {
    return decodeURIComponent(cookie.slice("csrftoken=".length));
  }

  const fallback = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("csrftoken="));

  if (fallback) {
    return decodeURIComponent(fallback.slice("csrftoken=".length));
  }

  throw new Error("Unable to read the CSRF cookie. Please try again.");
}

async function readError(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as
    | { detail?: string }
    | null;

  return data?.detail || `Request failed (${response.status}).`;
}

async function getCsrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/me/`, {
    credentials: "include",
  });

  if (!response.ok && response.status !== 401) {
    throw new Error(await readError(response));
  }

  return getCsrfCookie();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE_URL}/auth/me/`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const data = (await response.json()) as UserResponse;
  return data.user;
}

export async function login(
  username: string,
  password: string,
): Promise<AuthUser> {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const data = (await response.json()) as UserResponse;
  return data.user;
}

export async function logout(): Promise<void> {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${API_BASE_URL}/auth/logout/`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRFToken": csrfToken },
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }
}
