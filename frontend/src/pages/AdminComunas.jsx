import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../api/http";
import { parseBackendError, errorFronted } from "../api/errors";
import Toast from "../components/Toast";
import s from "./AdminComunas.module.css";

function onlyDigits(str) { return String(str ?? "").replace(/\D/g, ""); }
function formatCOP(digits) { const n = Number(digits || 0); return n ? n.toLocaleString("es-CO") : ""; }

function getErrors(form, editing, numerosExistentes) {
    const errors = {};
    const n = Number(form.numero);
    const tb = Number(form.tarifaBase);
    const r = Number(form.recargoPorSalto);
    if (!form.numero) errors.numero = "El número es obligatorio.";
    else if (!Number.isInteger(n) || n <= 0) errors.numero = "Debe ser un entero mayor a 0.";
    else {
        const yaExiste = numerosExistentes.has(n);
        if (!editing && yaExiste) errors.numero = `Ya existe la Comuna ${n}.`;
        if (editing && yaExiste && Number(editing.numero) !== n) errors.numero = `Ya existe la Comuna ${n}.`;
    }
    if (form.tarifaBase === "") errors.tarifaBase = "La tarifa base es obligatoria.";
    else if (!Number.isInteger(tb) || tb < 0) errors.tarifaBase = "Debe ser un entero ≥ 0.";
    if (form.recargoPorSalto === "") errors.recargoPorSalto = "El recargo es obligatorio.";
    else if (!Number.isInteger(r) || r < 0) errors.recargoPorSalto = "Debe ser un entero ≥ 0.";
    return errors;
}

function Helper({ show, text }) {
    if (!show || !text) return null;
    return <div className={s.helper}>{text}</div>;
}

export default function AdminComunas() {
    const [comunas, setComunas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingGuardar, setLoadingGuardar] = useState(false);
    const [toast, setToast] = useState(null);
    const [q, setQ] = useState("");
    const [minBase, setMinBase] = useState("");
    const [maxBase, setMaxBase] = useState("");
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ numero: "", tarifaBase: "", recargoPorSalto: "" });
    const [touched, setTouched] = useState({});

    async function cargar() {
        setLoading(true);
        try {
            const res = await authFetch("/api/admin/comunas");
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            const data = await res.json();
            setComunas((Array.isArray(data) ? data : []).sort((a, b) => Number(a.numero) - Number(b.numero)));
        } catch { setToast(errorFronted("No se pudo conectar con el servidor.")); }
        finally { setLoading(false); }
    }

    useEffect(() => { cargar(); }, []);

    const numerosExistentes = useMemo(() => new Set(comunas.map((c) => Number(c.numero))), [comunas]);
    const errors = useMemo(() => getErrors(form, editing, numerosExistentes), [form, editing, numerosExistentes]);

    const filtradas = useMemo(() => {
        const qq = q.trim();
        const min = minBase !== "" ? Number(minBase) : null;
        const max = maxBase !== "" ? Number(maxBase) : null;
        return comunas.filter((c) => {
            const matchNumero = !qq || String(c.numero ?? "").includes(qq);
            const base = Number(c.tarifaBase ?? 0);
            return matchNumero && (min == null || base >= min) && (max == null || base <= max);
        });
    }, [comunas, q, minBase, maxBase]);

    function abrirCrear() {
        setEditing(null); setForm({ numero: "", tarifaBase: "", recargoPorSalto: "" }); setTouched({}); setOpen(true);
    }

    function abrirEditar(c) {
        setEditing(c);
        setForm({ numero: c.numero != null ? String(c.numero) : "", tarifaBase: c.tarifaBase != null ? String(c.tarifaBase) : "", recargoPorSalto: c.recargoPorSalto != null ? String(c.recargoPorSalto) : "" });
        setTouched({}); setOpen(true);
    }

    async function guardar() {
        setTouched({ numero: true, tarifaBase: true, recargoPorSalto: true });
        if (Object.keys(errors).length > 0) return;
        setLoadingGuardar(true); setToast(null);
        try {
            const url = editing ? `/api/admin/comunas/${editing.id}` : "/api/admin/comunas";
            const res = await authFetch(url, {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numero: Number(form.numero), tarifaBase: Number(form.tarifaBase || 0), recargoPorSalto: Number(form.recargoPorSalto || 0) }),
            });
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            setOpen(false); await cargar();
        } catch { setToast(errorFronted("No se pudo conectar con el servidor.")); }
        finally { setLoadingGuardar(false); }
    }

    return (
        <div className={s.container}>
            <div className={s.header}>
                <h3>Comunas</h3>
                <div className={s.headerActions}>
                    <button className={s.btn} onClick={cargar} disabled={loading}>{loading ? "Cargando..." : "Recargar"}</button>
                    <button className={s.btnPrimary} onClick={abrirCrear}>+ Crear comuna</button>
                </div>
            </div>

            <div className={s.filtros}>
                <input className={s.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por número (ej: 1, 2...)" />
                <input className={s.inputSmall} value={minBase} onChange={(e) => setMinBase(e.target.value)} placeholder="Tarifa min" inputMode="numeric" />
                <input className={s.inputSmall} value={maxBase} onChange={(e) => setMaxBase(e.target.value)} placeholder="Tarifa max" inputMode="numeric" />
                <span className={s.contador}>Mostrando: <b>{filtradas.length}</b> / {comunas.length}</span>
            </div>

            {/* ── Tabla desktop ── */}
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
                                <td className={s.td}>${Number(c.tarifaBase || 0).toLocaleString("es-CO")}</td>
                                <td className={s.td}>${Number(c.recargoPorSalto || 0).toLocaleString("es-CO")}</td>
                                <td className={s.td}>
                                    <button className={s.btn} onClick={() => abrirEditar(c)}>Editar</button>
                                </td>
                            </tr>
                        ))}
                        {!loading && filtradas.length === 0 && (
                            <tr><td className={s.emptyRow} colSpan={5}>No hay comunas con ese filtro.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Cards móvil ── */}
            <div className={s.cardList}>
                {filtradas.length === 0 && !loading && <div className={s.vacio}>No hay comunas con ese filtro.</div>}
                {filtradas.map((c) => (
                    <div key={c.id} className={s.cardItem}>
                        <div className={s.cardItemRow}>
                            <div style={{ fontWeight: 700, color: "#f0f0f0", fontSize: 15 }}>Comuna {c.numero}</div>
                            <span style={{ fontSize: 12, color: "#6b7280" }}>ID #{c.id}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 13, color: "#d1d5db" }}>
                            <div><span style={{ color: "#9ca3af", fontSize: 11 }}>TARIFA BASE</span><br />${Number(c.tarifaBase || 0).toLocaleString("es-CO")}</div>
                            <div><span style={{ color: "#9ca3af", fontSize: 11 }}>RECARGO/SALTO</span><br />${Number(c.recargoPorSalto || 0).toLocaleString("es-CO")}</div>
                        </div>
                        <div className={s.cardItemActions}>
                            <button className={s.btn} onClick={() => abrirEditar(c)}>Editar</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Modal ── */}
            {open && (
                <div className={s.backdrop}>
                    <div className={s.modal}>
                        <div className={s.modalHeader}>
                            <h3>{editing ? `Editar Comuna ${editing.numero}` : "Crear comuna"}</h3>
                            <button className={s.btnClose} onClick={() => setOpen(false)}>✕</button>
                        </div>
                        <div className={s.modalBody}>
                            <div className={s.field}>
                                <input
                                    className={`${s.input} ${s.inputFull} ${touched.numero && errors.numero ? s.inputError : ""}`}
                                    value={form.numero}
                                    onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value.replace(/\D/g, "").replace(/^0+/, "") }))}
                                    onBlur={() => setTouched((t) => ({ ...t, numero: true }))}
                                    placeholder="Número (ej: 1)" inputMode="numeric" maxLength={3} disabled={!!editing}
                                />
                                <Helper show={touched.numero} text={errors.numero} />
                            </div>
                            <div className={s.field}>
                                <input
                                    className={`${s.input} ${s.inputFull} ${touched.tarifaBase && errors.tarifaBase ? s.inputError : ""}`}
                                    value={formatCOP(form.tarifaBase)}
                                    onChange={(e) => setForm((p) => ({ ...p, tarifaBase: onlyDigits(e.target.value).replace(/^0+/, "") }))}
                                    onBlur={() => setTouched((t) => ({ ...t, tarifaBase: true }))}
                                    placeholder="Tarifa base (ej: 5.000)" inputMode="numeric"
                                />
                                <div className={s.hint}>Valor: ${Number(form.tarifaBase || 0).toLocaleString("es-CO")}</div>
                                <Helper show={touched.tarifaBase} text={errors.tarifaBase} />
                            </div>
                            <div className={s.field}>
                                <input
                                    className={`${s.input} ${s.inputFull} ${touched.recargoPorSalto && errors.recargoPorSalto ? s.inputError : ""}`}
                                    value={formatCOP(form.recargoPorSalto)}
                                    onChange={(e) => setForm((p) => ({ ...p, recargoPorSalto: onlyDigits(e.target.value).replace(/^0+/, "") }))}
                                    onBlur={() => setTouched((t) => ({ ...t, recargoPorSalto: true }))}
                                    placeholder="Recargo por salto (ej: 1.000)" inputMode="numeric"
                                />
                                <div className={s.hint}>Valor: ${Number(form.recargoPorSalto || 0).toLocaleString("es-CO")}</div>
                                <Helper show={touched.recargoPorSalto} text={errors.recargoPorSalto} />
                            </div>
                        </div>
                        <div className={s.modalFooter}>
                            <button className={s.btn} onClick={() => setOpen(false)} disabled={loadingGuardar}>Cancelar</button>
                            <button className={s.btnPrimary} onClick={guardar} disabled={loadingGuardar}>
                                {loadingGuardar ? "Guardando..." : editing ? "Guardar cambios" : "Crear"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {toast && <Toast error={toast} onClose={() => setToast(null)} />}
        </div>
    );
}
