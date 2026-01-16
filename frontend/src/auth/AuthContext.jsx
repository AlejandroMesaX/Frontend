import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("token") || null);

    const [user, setUser] = useState(() => {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    });

    // ✅ rol
    const [rol, setRol] = useState(() => localStorage.getItem("rol") || null);

    // ✅ userId plano
    const [userId, setUserId] = useState(() => {
        const v = localStorage.getItem("userId");
        return v ? Number(v) : null;
    });

    useEffect(() => {
        if (token) localStorage.setItem("token", token);
        else localStorage.removeItem("token");
    }, [token]);

    function login({ token, user, rol, userId }) {
        setToken(token);
        setUser(user);
        setRol(rol);
        setUserId(userId);

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("rol", rol);
        localStorage.setItem("userId", String(userId));
    }

    function logout() {
        setToken(null);
        setUser(null);
        setRol(null);
        setUserId(null);

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("rol");
        localStorage.removeItem("userId");
    }

    return (
        <AuthContext.Provider value={{ token, user, rol, userId, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
