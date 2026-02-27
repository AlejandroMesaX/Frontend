import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../api/http";
import { parseBackendError, errorFronted } from "../api/errors";
import Toast from "../components/Toast";
import s from "./AdminComunas.module.css";

// ── Helpers ─────────────────────────────────────────────────────────────────

function onlyDigits(str) {
    return String(str ?? "").replace(/\D/g, "");
}

function formatCOP(digits) {
    const n = Number(digits || 0);
    return n ? n.toLocaleString("es-CO") : "";
}

function getErrors(form, editing, numerosExistentes) {
    const errors = {};
    const n = Number(form.numero);
    const tb = Number(form.tarifaBase);
    const r = Number(form.recargoPorSalto);

    if (!form.numero) {
        errors.numero = "El número es obligatorio.";
    } else if (!Number.isInteger(n) || n <= 0) {
        errors.numero = "Debe ser un entero mayor a 0.";
    } else {
        const yaExiste = numerosExistentes.has(n);
        if (!editing && yaExiste) errors.numero = `Ya existe la Comuna ${n}.`;
        if (editing && yaExiste && Number(editing.numero) !== n)
            errors.numero = `Ya existe la Comuna ${n}.`;
    }

    if (form.tarifaBase === "") {
        errors.tarifaBase = "La tarifa base es obligatoria.";
    } else if (!Number.isInteger(tb) || tb < 0) {
        errors.tarifaBase = "Debe ser un entero mayor o igual a 0.";
    }

    if (form.recargoPorSalto === "") {
        errors.recargoPorSalto = "El recargo es obligatorio.";
    } else if (!Number.isInteger(r) || r < 0) {
        errors.recargoPorSalto = "Debe ser un entero mayor o igual a 0.";
    }

    return errors;
}

function Helper({ show, text }) {
    if (!show || !text) return null;
    return <div className={s.helper}>{text}</div>;
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function AdminComunas() {
    const [comunas, setComunas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingGuardar, setLoadingGuardar] = useState(false);
    const [toast, setToast] = useState(null);

    // Filtros
    const [q, setQ] = useState("");
    const [minBase, setMinBase] = useState("");
    const [maxBase, setMaxBase] = useState("");

    // Modal
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ numero: "", tarifaBase: "", recargoPorSalto: "" });
    const [touched, setTouched] = useState({});

    // ── Carga ───────────────────────────────────────────────────────────────

    async function cargar() {
        setLoading(true);
        try {
            const res = await authFetch("/api/admin/comunas");
            if (!res.ok) {
                const error = await parseBackendError(res);
                setToast(error);
                return;
            }
            const data = await res.json();
            const arr = Array.isArray(data) ? data : [];
            arr.sort((a, b) => Number(a.numero) - Number(b.numero));
            setComunas(arr);
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { cargar(); }, []);

    // ── Memos ───────────────────────────────────────────────────────────────

    const numerosExistentes = useMemo(
        () => new Set(comunas.map((c) => Number(c.numero))),
        [comunas]
    );

    const errors = useMemo(
        () => getErrors(form, editing, numerosExistentes),
        [form, editing, numerosExistentes]
    );

    const canSubmit = Object.keys(errors).length === 0;

    const filtradas = useMemo(() => {
        const qq = q.trim();
        const min = minBase !== "" ? Number(minBase) : null;
        const max = maxBase !== "" ? Number(maxBase) : null;

        return comunas.filter((c) => {
            const matchNumero = !qq || String(c.numero ?? "").includes(qq);
            const base = Number(c.tarifaBase ?? 0);
            const matchMin = min == null || base >= min;
            const matchMax = max == null || base <= max;
            return matchNumero && matchMin && matchMax;
        });
    }, [comunas, q, minBase, maxBase]);

    // ── Modal ───────────────────────────────────────────────────────────────

    function abrirCrear() {
        setEditing(null);
        setForm({ numero: "", tarifaBase: "", recargoPorSalto: "" });
        setTouched({});
        setOpen(true);
    }

    function abrirEditar(c) {
        setEditing(c);
        setForm({
            numero: c.numero != null ? String(c.numero) : "",
            tarifaBase: c.tarifaBase != null ? String(c.tarifaBase) : "",
            recargoPorSalto: c.recargoPorSalto != null ? String(c.recargoPorSalto) : "",
        });
        setTouched({});
        setOpen(true);
    }

    async function guardar() {
        // Marcar todos los campos como tocados para mostrar errores
        setTouched({ numero: true, tarifaBase: true, recargoPorSalto: true });
        if (!canSubmit) return;

        const payload = {
            numero: Number(form.numero),
            tarifaBase: Number(form.tarifaBase || 0),
            recargoPorSalto: Number(form.recargoPorSalto || 0),
        };

        setLoadingGuardar(true);
        setToast(null);

        try {
            const url = editing
                ? `/api/admin/comunas/${editing.id}`
                : "/api/admin/comunas";
            const method = editing ? "PATCH" : "POST";

            const res = await authFetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await parseBackendError(res);
                // Si el error tiene field lo mostramos como error de campo
                if (error.field) {
                    setTouched((t) => ({ ...t, [error.field]: true }));
                    // Forzamos el error en el campo correspondiente via toast
                    // ya que errors viene de getErrors (frontend)
                    setToast(error);
                } else {
                    setToast(error);
                }
                return;
            }

            setOpen(false);
            await cargar();

        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoadingGuardar(false);
        }
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className={s.container}>

            {/* Header */}
            <div className={s.header}>
                <h3>Comunas</h3>
                <div className={s.headerActions}>
                    <button className={s.btn} onClick={cargar} disabled={loading}>
                        {loading ? "Cargando..." : "Recargar"}
                    </button>
                    <button className={s.btnPrimary} onClick={abrirCrear}>
                        + Crear comuna
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className={s.filtros}>
                <input
                    className={s.input}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Filtrar por número (ej: 1, 2...)"
                />
                <input
                    className={s.inputSmall}
                    value={minBase}
                    onChange={(e) => setMinBase(e.target.value)}
                    placeholder="Tarifa base min"
                    inputMode="numeric"
                />
                <input
                    className={s.inputSmall}
                    value={maxBase}
                    onChange={(e) => setMaxBase(e.target.value)}
                    placeholder="Tarifa base max"
                    inputMode="numeric"
                />
                <span className={s.contador}>
                    Mostrando: <b>{filtradas.length}</b> / {comunas.length}
                </span>
            </div>

            {/* Tabla */}
            <div className={s.tableWrap}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th className={s.th}>ID</th>
                            <th className={s.th}>Número</th>
                            <th className={s.th}>Tarifa base</th>
                            <th className={s.th}>Recargo por salto</th>
                            <th className={s.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtradas.map((c) => (
                            <tr key={c.id}>
                                <td className={s.td}>{c.id}</td>
                                <td className={s.td}><b>Comuna {c.numero}</b></td>
                                <td className={s.td}>
                                    ${Number(c.tarifaBase || 0).toLocaleString("es-CO")}
                                </td>
                                <td className={s.td}>
                                    ${Number(c.recargoPorSalto || 0).toLocaleString("es-CO")}
                                </td>
                                <td className={s.td}>
                                    <button className={s.btn} onClick={() => abrirEditar(c)}>
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {!loading && filtradas.length === 0 && (
                            <tr>
                                <td className={s.emptyRow} colSpan={5}>
                                    No hay comunas con ese filtro.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {open && (
                <div className={s.backdrop}>
                    <div className={s.modal}>
                        <div className={s.modalHeader}>
                            <h3>
                                {editing ? `Editar Comuna ${editing.numero}` : "Crear comuna"}
                            </h3>
                            <button className={s.btnClose} onClick={() => setOpen(false)}>✕</button>
                        </div>

                        <div className={s.modalBody}>

                            {/* Número */}
                            <div className={s.field}>
                                <input
                                    className={`${s.input} ${touched.numero && errors.numero ? s.inputError : ""}`}
                                    value={form.numero}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "").replace(/^0+/, "");
                                        setForm((p) => ({ ...p, numero: value }));
                                    }}
                                    onBlur={() => setTouched((t) => ({ ...t, numero: true }))}
                                    onPaste={(e) => {
                                        const texto = e.clipboardData.getData("text");
                                        if (!/^\d+$/.test(texto)) e.preventDefault();
                                    }}
                                    placeholder="Número (ej: 1)"
                                    inputMode="numeric"
                                    maxLength={3}
                                    disabled={!!editing}
                                />
                                <Helper show={touched.numero} text={errors.numero} />
                            </div>

                            {/* Tarifa base */}
                            <div className={s.field}>
                                <input
                                    className={`${s.input} ${touched.tarifaBase && errors.tarifaBase ? s.inputError : ""}`}
                                    value={formatCOP(form.tarifaBase)}
                                    onChange={(e) => {
                                        const digits = onlyDigits(e.target.value).replace(/^0+/, "");
                                        setForm((p) => ({ ...p, tarifaBase: digits }));
                                    }}
                                    onBlur={() => setTouched((t) => ({ ...t, tarifaBase: true }))}
                                    onPaste={(e) => {
                                        const texto = e.clipboardData.getData("text");
                                        if (!onlyDigits(texto)) e.preventDefault();
                                    }}
                                    placeholder="Tarifa base (ej: 5.000)"
                                    inputMode="numeric"
                                />
                                <div className={s.hint}>
                                    Valor: ${Number(form.tarifaBase || 0).toLocaleString("es-CO")}
                                </div>
                                <Helper show={touched.tarifaBase} text={errors.tarifaBase} />
                            </div>

                            {/* Recargo por salto */}
                            <div className={s.field}>
                                <input
                                    className={`${s.input} ${touched.recargoPorSalto && errors.recargoPorSalto ? s.inputError : ""}`}
                                    value={formatCOP(form.recargoPorSalto)}
                                    onChange={(e) => {
                                        const digits = onlyDigits(e.target.value).replace(/^0+/, "");
                                        setForm((p) => ({ ...p, recargoPorSalto: digits }));
                                    }}
                                    onBlur={() => setTouched((t) => ({ ...t, recargoPorSalto: true }))}
                                    onPaste={(e) => {
                                        const texto = e.clipboardData.getData("text");
                                        if (!onlyDigits(texto)) e.preventDefault();
                                    }}
                                    placeholder="Recargo por salto (ej: 1.000)"
                                    inputMode="numeric"
                                />
                                <div className={s.hint}>
                                    Valor: ${Number(form.recargoPorSalto || 0).toLocaleString("es-CO")}
                                </div>
                                <Helper show={touched.recargoPorSalto} text={errors.recargoPorSalto} />
                            </div>
                        </div>

                        <div className={s.modalFooter}>
                            <button
                                className={s.btn}
                                onClick={() => setOpen(false)}
                                disabled={loadingGuardar}
                            >
                                Cancelar
                            </button>
                            <button
                                className={s.btnPrimary}
                                onClick={guardar}
                                disabled={loadingGuardar}
                            >
                                {loadingGuardar
                                    ? "Guardando..."
                                    : editing ? "Guardar cambios" : "Crear"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast error={toast} onClose={() => setToast(null)} />}
        </div>
    );
}
