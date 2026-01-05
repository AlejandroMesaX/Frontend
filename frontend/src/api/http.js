const API_URL = import.meta.env.VITE_API_URL;
console.log("API_URL =", API_URL);

export function authFetch(path, options = {}) {
    const token = localStorage.getItem("token");

    return fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
}
