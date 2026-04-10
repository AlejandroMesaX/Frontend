const API_URL = import.meta.env.VITE_API_URL;



export function authFetch(path, options = {}) {
    const token = localStorage.getItem("token");
    const url = `${API_URL}/${path.replace(/^\//, '')}`;
    console.log("LLAMANDO A:", url);

    return fetch(`${API_URL}/${path.replace(/^\//, '')}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
}
