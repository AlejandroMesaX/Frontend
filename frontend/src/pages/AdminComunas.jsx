import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../api/http";

export default function AdminComunas() {
    const [comunas, setComunas] = useState([]);
    const [loading, setLoading] = useState(false);

    // filtros
    const [q, setQ] = useState(""); // por numero
    const [minBase, setMinBase] = useState("");
    const [maxBase, setMaxBase] = useState("");

    // modal
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ numero: "", tarifaBase: "", recargoPorSalto: "" });

    const [touched, setTouched] = useState({});


    async function cargar() {
        setLoading(true);
        try {
            const res = await authFetch("/api/admin/comunas");
            if (!res.ok) {
                const msg = await safeText(res);
                alert("No se pudo cargar comunas. " + msg);
                return;
            }
            const data = await res.json();
            const arr = Array.isArray(data) ? data : [];
            arr.sort((a, b) => Number(a.numero) - Number(b.numero));
            setComunas(arr);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        cargar();
    }, []);

    const numerosExistentes = useMemo(() => {
        return new Set(comunas.map((c) => Number(c.numero)));
    }, [comunas]);

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

    function abrirCrear() {
        setEditing(null);
        setForm({ numero: "", tarifaBase: "", recargoPorSalto: "" });
        setOpen(true);
        setTouched({});

    }

    function abrirEditar(c) {
        setEditing(c);
        setForm({
            numero: c.numero != null ? String(c.numero) : "",
            tarifaBase: c.tarifaBase != null ? String(c.tarifaBase) : "",
            recargoPorSalto: c.recargoPorSalto != null ? String(c.recargoPorSalto) : "",
        });
        setOpen(true);
        setTouched({});

    }

    function validar() {
        const numero = Number(form.numero);
        const tarifaBase = Number(form.tarifaBase);
        const recargoPorSalto = Number(form.recargoPorSalto);

        if (!numero || numero <= 0) return "El número de comuna es obligatorio (mayor a 0).";
        if (Number.isNaN(tarifaBase) || tarifaBase < 0) return "Tarifa base inválida.";
        if (Number.isNaN(recargoPorSalto) || recargoPorSalto < 0) return "Recargo por salto inválido.";

        // ✅ Validación número duplicado
        // - si estamos creando: no puede existir
        // - si estamos editando: puede existir si es el mismo registro
        const yaExiste = numerosExistentes.has(numero);
        if (!editing && yaExiste) {
            return `Ya existe la Comuna ${numero}. Elige otro número.`;
        }
        if (editing && yaExiste && Number(editing.numero) !== numero) {
            return `Ya existe la Comuna ${numero}. Elige otro número.`;
        }

        return null;
    }

    function getErrors({ numero, tarifaBase, recargoPorSalto }, editing, numerosExistentes) {
        const errors = {};

        const n = Number(numero);
        const tb = Number(tarifaBase);
        const r = Number(recargoPorSalto);

        if (!numero) errors.numero = "El número es obligatorio.";
        else if (!Number.isInteger(n) || n <= 0) errors.numero = "Debe ser un entero mayor a 0.";
        else {
            const yaExiste = numerosExistentes.has(n);
            if (!editing && yaExiste) errors.numero = `Ya existe la Comuna ${n}.`;
            if (editing && yaExiste && Number(editing.numero) !== n) errors.numero = `Ya existe la Comuna ${n}.`;
        }

        if (tarifaBase === "") errors.tarifaBase = "La tarifa base es obligatoria.";
        else if (!Number.isInteger(tb) || tb < 0) errors.tarifaBase = "Debe ser un entero mayor o igual a 0.";

        if (recargoPorSalto === "") errors.recargoPorSalto = "El recargo es obligatorio.";
        else if (!Number.isInteger(r) || r < 0) errors.recargoPorSalto = "Debe ser un entero mayor o igual a 0.";

        return errors;
    }



    async function guardar() {
        setTouched({ numero: true, tarifaBase: true, recargoPorSalto: true });

        if (!canSubmit) return;

        const payload = {
            numero: Number(form.numero),
            tarifaBase: Number(form.tarifaBase || 0),
            recargoPorSalto: Number(form.recargoPorSalto || 0),
        };


        // ✅ CREAR -> 201 sin body => recargar
        if (!editing) {
            const res = await authFetch("/api/admin/comunas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const msg = await safeText(res);
                alert("No se pudo crear comuna. " + msg);
                return;
            }

            setOpen(false);
            await cargar();
            return;
        }

        // ✅ EDITAR -> 204 sin body => recargar
        const res = await authFetch(`/api/admin/comunas/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const msg = await safeText(res);
            alert("No se pudo editar comuna. " + msg);
            return;
        }

        setOpen(false);
        await cargar();
    }

    return (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Comunas</h3>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={cargar} disabled={loading}>
                        {loading ? "Cargando..." : "Recargar"}
                    </button>
                    <button onClick={abrirCrear}>+ Crear comuna</button>
                </div>
            </div>

            {/* filtros */}
            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Filtrar por número (ej: 1, 2...)"
                    style={inp}
                />

                <input
                    value={minBase}
                    onChange={(e) => setMinBase(e.target.value)}
                    placeholder="Tarifa base min"
                    style={inpSmall}
                    inputMode="numeric"
                />

                <input
                    value={maxBase}
                    onChange={(e) => setMaxBase(e.target.value)}
                    placeholder="Tarifa base max"
                    style={inpSmall}
                    inputMode="numeric"
                />

                <span style={{ fontSize: 12, color: "#666" }}>
                    Mostrando: <b>{filtradas.length}</b> / {comunas.length}
                </span>
            </div>

            {/* tabla */}
            <div style={{ marginTop: 12, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                            <th style={th}>ID</th>
                            <th style={th}>Número</th>
                            <th style={th}>Tarifa base</th>
                            <th style={th}>Recargo por salto</th>
                            <th style={th}>Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtradas.map((c) => (
                            <tr key={c.id} style={{ borderBottom: "1px solid #f1f1f1" }}>
                                <td style={td}>{c.id}</td>
                                <td style={td}><b>Comuna {c.numero}</b></td>
                                <td style={td}>${Number(c.tarifaBase || 0).toLocaleString("es-CO")}</td>
                                <td style={td}>${Number(c.recargoPorSalto || 0).toLocaleString("es-CO")}</td>
                                <td style={td}>
                                    <button onClick={() => abrirEditar(c)}>Editar</button>
                                </td>
                            </tr>
                        ))}

                        {!loading && filtradas.length === 0 && (
                            <tr>
                                <td style={{ padding: 12, color: "#666" }} colSpan={5}>
                                    No hay comunas con ese filtro.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* modal */}
            {open && (
                <div style={styles.backdrop}>
                    <div style={styles.modal}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <h3 style={{ margin: 0 }}>{editing ? `Editar Comuna ${editing.numero}` : "Crear comuna"}</h3>
                            <button onClick={guardar} disabled={!canSubmit} style={{
                                opacity: canSubmit ? 1 : 0.5,
                                cursor: canSubmit ? "pointer" : "not-allowed"
                            }}>
                                {editing ? "Guardar cambios" : "Crear"}
                            </button>

                        </div>

                        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                            <input
                                value={form.numero}
                                onChange={(e) => {
                                    let value = e.target.value.replace(/\D/g, "").replace(/^0+/, "");
                                    setForm((p) => ({ ...p, numero: value }));
                                }}
                                onBlur={() => setTouched((t) => ({ ...t, numero: true }))}
                                onPaste={(e) => {
                                    const texto = e.clipboardData.getData("text");
                                    if (!/^\d+$/.test(texto)) e.preventDefault();
                                }}
                                placeholder="Número (ej: 1)"
                                style={inputStyle(touched.numero && !!errors.numero)}
                                inputMode="numeric"
                                maxLength={3}
                                disabled={!!editing}
                            />

                            <Helper show={touched.numero} text={errors.numero} />



                            <input
                                value={formatCOP(form.tarifaBase)}
                                onChange={(e) => {
                                    // lo que el usuario escribe puede traer puntos, $, espacios, etc.
                                    let digits = onlyDigits(e.target.value).replace(/^0+/, "");
                                    setForm((p) => ({ ...p, tarifaBase: digits }));
                                }}
                                onBlur={() => setTouched((t) => ({ ...t, tarifaBase: true }))}
                                onPaste={(e) => {
                                    const texto = e.clipboardData.getData("text");
                                    const digits = onlyDigits(texto);
                                    if (!digits) e.preventDefault();
                                }}
                                placeholder="Tarifa base (ej: 5.000)"
                                style={inputStyle(touched.tarifaBase && !!errors.tarifaBase)}
                                inputMode="numeric"
                            />
                            <div style={{ fontSize: 12, color: "#666" }}>
                                Valor: ${Number(form.tarifaBase || 0).toLocaleString("es-CO")}
                            </div>

                            <Helper show={touched.tarifaBase} text={errors.tarifaBase} />




                            <input
                                value={formatCOP(form.recargoPorSalto)}
                                onChange={(e) => {
                                    let digits = onlyDigits(e.target.value).replace(/^0+/, "");
                                    setForm((p) => ({ ...p, recargoPorSalto: digits }));
                                }}
                                onBlur={() => setTouched((t) => ({ ...t, recargoPorSalto: true }))}
                                onPaste={(e) => {
                                    const texto = e.clipboardData.getData("text");
                                    const digits = onlyDigits(texto);
                                    if (!digits) e.preventDefault();
                                }}
                                placeholder="Recargo por salto (ej: 1.000)"
                                style={inputStyle(touched.recargoPorSalto && !!errors.recargoPorSalto)}
                                inputMode="numeric"
                            />
                            <div style={{ fontSize: 12, color: "#666" }}>
                                Valor: ${Number(form.recargoPorSalto || 0).toLocaleString("es-CO")}
                            </div>

                            <Helper show={touched.recargoPorSalto} text={errors.recargoPorSalto} />



                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                            <button onClick={() => setOpen(false)}>Cancelar</button>
                            <button onClick={guardar}>{editing ? "Guardar cambios" : "Crear"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

async function safeText(res) {
    try { return await res.text(); } catch { return ""; }
}

function inputStyle(hasError) {
    return {
        ...inp,
        border: hasError ? "1px solid #ef4444" : "1px solid #e5e7eb",
        outline: "none",
    };
}

function Helper({ show, text }) {
    if (!show || !text) return null;
    return <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 700 }}>{text}</div>;
}

function onlyDigits(s) {
    return String(s ?? "").replace(/\D/g, "");
}

function formatCOP(digits) {
    const n = Number(digits || 0);
    return n ? n.toLocaleString("es-CO") : "";
}



const th = { padding: 10, fontSize: 13, color: "#111827" };
const td = { padding: 10, fontSize: 13, color: "#111827", verticalAlign: "top" };
const inp = { padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", minWidth: 260 };
const inpSmall = { padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", width: 160 };

const styles = {
    backdrop: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        zIndex: 9999,
    },
    modal: {
        width: "min(520px, 95vw)",
        background: "#fff",
        borderRadius: 12,
        padding: 14,
        border: "1px solid #ddd",
    },
};
