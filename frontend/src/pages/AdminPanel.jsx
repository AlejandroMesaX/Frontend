import { useEffect, useState } from "react";
import { authFetch } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import AdminPedidos from "./AdminPedidos";
import AdminUsuarios from "./AdminUsuarios";
import AdminBarrios from "./AdminBarrios";
import AdminComunas from "./AdminComunas";
import AdminFinanzas from "./AdminFinanzas";
import TarifasPanel from "./TarifasPanel";
import s from "./AdminPanel.module.css";

const TABS = [
    { key: "pedidos", label: "📦 Pedidos" },
    { key: "usuarios", label: "👥 Usuarios" },
    { key: "barrios", label: "📍 Barrios" },
    { key: "comunas", label: "🗺️ Comunas" },
    { key: "finanzas", label: "💰 Finanzas" },
    { key: "tarifas", label: "🧮 Tarifas" },
];

function AdminTarifas() {
    const [barrios, setBarrios] = useState([]);
    useEffect(() => {
        (async () => {
            try {
                const res = await authFetch("/api/admin/barrios?includeInactivos=false");
                if (res.ok) setBarrios(await res.json());
            } catch { /* */ }
        })();
    }, []);
    return <TarifasPanel barrios={barrios} />;
}

export default function AdminPanel() {
    const { logout } = useAuth();
    const [tab, setTab] = useState("pedidos");
    const [menuOpen, setMenuOpen] = useState(false);

    // Cerrar menú al cambiar tab
    function selectTab(key) {
        setTab(key);
        setMenuOpen(false);
    }

    // Cerrar menú con Escape
    useEffect(() => {
        function onKey(e) { if (e.key === "Escape") setMenuOpen(false); }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    // Bloquear scroll del body cuando el menú está abierto
    useEffect(() => {
        document.body.style.overflow = menuOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [menuOpen]);

    const tabLabel = TABS.find((t) => t.key === tab)?.label ?? "";

    return (
        <div className={s.container}>

            {/* ── Top bar ── */}
            <div className={s.topBar}>
                {/* Hamburger — solo visible en móvil */}
                <button className={s.hamburger} onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
                    ☰
                </button>

                {/* Brand */}
                <span className={s.brand}>GoFast</span>

                {/* Nav desktop */}
                <nav className={s.nav}>
                    {TABS.map(({ key, label }) => (
                        <button
                            key={key}
                            className={`${s.navBtn} ${tab === key ? s.navBtnActive : ""}`}
                            onClick={() => selectTab(key)}
                        >
                            {label}
                        </button>
                    ))}
                </nav>

                {/* Logout */}
                <div className={s.topBarRight}>
                    <button className={s.btnLogout} onClick={logout}>Salir</button>
                </div>
            </div>

            {/* ── Menú móvil ── */}
            {menuOpen && (
                <div className={s.mobileMenu}>
                    <div className={s.mobileMenuOverlay} onClick={() => setMenuOpen(false)} />
                    <div className={s.mobileMenuPanel}>
                        <div className={s.mobileMenuHeader}>
                            <span className={s.mobileMenuBrand}>GoFast</span>
                            <button className={s.mobileMenuClose} onClick={() => setMenuOpen(false)}>✕</button>
                        </div>

                        {TABS.map(({ key, label }) => (
                            <button
                                key={key}
                                className={`${s.mobileNavBtn} ${tab === key ? s.mobileNavBtnActive : ""}`}
                                onClick={() => selectTab(key)}
                            >
                                {label}
                            </button>
                        ))}

                        <div className={s.mobileMenuFooter}>
                            <button className={s.btnLogoutMobile} onClick={logout} style={{ width: "100%" }}>
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Contenido ── */}
            <div className={s.content}>
                {tab === "pedidos" && <AdminPedidos />}
                {tab === "usuarios" && <AdminUsuarios />}
                {tab === "barrios" && <AdminBarrios />}
                {tab === "comunas" && <AdminComunas />}
                {tab === "finanzas" && <AdminFinanzas />}
                {tab === "tarifas" && <AdminTarifas />}
            </div>
        </div>
    );
}
