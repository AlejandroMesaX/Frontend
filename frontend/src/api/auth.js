import { authFetch } from "./http";

export async function loginRequest(email, password) {
    const res = await authFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Login falló (${res.status}): ${text}`);
    }

    return res.json();
}