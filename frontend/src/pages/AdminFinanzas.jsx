import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../api/http";
import { parseBackendError, errorFronted } from "../api/errors";
import Toast from "../components/Toast";
import s from "./AdminFinanzas.module.css";
import PedidoDetalleModal from "../components/PedidoDetalleModal";

function toNum(val) {
    if (val == null) return 0;
    const n = Number(String(val).replace(/\./g, "").replace(/,/g, "."));
    return Number.isFinite(n) ? n : 0;
}

function yyyyMMdd(fecha) {
    if (!fecha) return null;
    return String(fecha).slice(0, 10);
}

function fmt(val) {
    return `$${Number(val || 0).toLocaleString("es-CO")}`;
}

function Metric({ label, value, highlight }) {
    return (
        <div className={`${s.metric} ${highlight ? s.metricHighlight : ""}`}>
            <div className={s.metricLabel}>{label}</div>
            <div className={s.metricValue}>{fmt(value)}</div>
        </div>
    );
}

export default function AdminFinanzas() {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [detalle, setDetalle] = useState(null);
    const todayISO = useMemo(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }, []);
    const [diaFiltro, setDiaFiltro] = useState(todayISO);
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [filtroDomi, setFiltroDomi] = useState("");

    async function cargar() {
        setLoading(true);
        try {
            const res = await authFetch("/api/admin/pedidos?estado=ENTREGADO");
            if (!res.ok) { setToast(await parseBackendError(res)); return; }
            const data = await res.json();
            setPedidos(Array.isArray(data) ? data : []);
        } catch {
            setToast(errorFronted("No se pudo conectar con el servidor."));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { cargar(); }, []);

    const pedidosFiltrados = useMemo(() => {
        let base = pedidos;
        if (filtroDomi.trim()) {
            const q = filtroDomi.trim().toLowerCase();
            base = base.filter((p) =>
                (p.domiciliarioNombre ?? "").toLowerCase().includes(q) ||
                String(p.domiciliarioId ?? "").includes(q)
            );
        }

        if (diaFiltro) {
            return base.filter((p) => yyyyMMdd(p.fechaCreacion) === diaFiltro);
        }

        if (desde || hasta) {
            const d = desde || "0000-01-01";
            const h = hasta || "9999-12-31";
            return base.filter((p) => {
                const f = yyyyMMdd(p.fechaCreacion);
                return f && f >= d && f <= h;
            });
        }

        return base;
    }, [pedidos, diaFiltro, desde, hasta, filtroDomi]);


    const resumen = useMemo(() => {
        const totalBruto = pedidosFiltrados.reduce((acc, p) => acc + toNum(p.costoServicio), 0);
        const gananciaEmpresa = totalBruto * 0.20;
        const pagosDomis = totalBruto * 0.80;
        return { totalBruto, gananciaEmpresa, pagosDomis, pedidos: pedidosFiltrados.length };
    }, [pedidosFiltrados]);

    const porDomiciliario = useMemo(() => {
        const map = new Map();
        pedidosFiltrados.forEach((p) => {
            if (!p.domiciliarioId) return;
            const key = p.domiciliarioId;
            const prev = map.get(key) ?? {
                id: p.domiciliarioId,
                nombre: p.domiciliarioNombre ?? `#${p.domiciliarioId}`,
                pedidos: 0,
                bruto: 0,
            };
            map.set(key, {
                ...prev,
                pedidos: prev.pedidos + 1,
                bruto: prev.bruto + toNum(p.costoServicio),
            });
        });
        return Array.from(map.values())
            .sort((a, b) => b.bruto - a.bruto);
    }, [pedidosFiltrados]);


    return (
        <div className={s.container}>
            <div className={s.section}>
                <div className={s.sectionHeader}>
                    <h3>Finanzas</h3>
                    <button className={s.btn} onClick={cargar} disabled={loading}>
                        {loading ? "Cargando..." : "Recargar"}
                    </button>
                </div>

                <div className={s.filtrosGroup}>
                    <div className={s.filtros}>
                        <span className={s.filtroLabel}>Por día:</span>
                        <input
                            type="date"
                            className={s.inputDate}
                            value={diaFiltro}
                            onChange={(e) => { setDiaFiltro(e.target.value); setDesde(""); setHasta(""); }}
                        />
                        <button className={s.btn} onClick={() => { setDiaFiltro(todayISO); setDesde(""); setHasta(""); }}>Hoy</button>
                        <button className={s.btn} onClick={() => { setDiaFiltro(""); setDesde(""); setHasta(""); }}>Todo</button>
                    </div>

                    <div className={s.filtros}>
                        <span className={s.filtroLabel}>Rango:</span>
                        <span className={s.filtroLabelLight}>Desde</span>
                        <input
                            type="date"
                            className={s.inputDate}
                            value={desde}
                            onChange={(e) => { setDesde(e.target.value); setDiaFiltro(""); }}
                        />
                        <span className={s.filtroLabelLight}>Hasta</span>
                        <input
                            type="date"
                            className={s.inputDate}
                            value={hasta}
                            onChange={(e) => { setHasta(e.target.value); setDiaFiltro(""); }}
                        />
                    </div>

                    <div className={s.filtros}>
                        <span className={s.filtroLabel}>Domiciliario:</span>
                        <input
                            className={s.inputText}
                            value={filtroDomi}
                            onChange={(e) => setFiltroDomi(e.target.value)}
                            placeholder="Buscar por nombre..."
                        />
                        {filtroDomi && (
                            <button className={s.btn} onClick={() => setFiltroDomi("")}>✕</button>
                        )}
                        <span className={s.contador}>
                            Pedidos: <b>{resumen.pedidos}</b>
                        </span>
                    </div>
                </div>
            </div>
            <div className={s.section}>
                <div className={s.sectionHeader}>
                    <h3>💰 Resumen global</h3>
                </div>
                <div className={s.metricsGrid}>
                    <Metric label="Total facturado" value={resumen.totalBruto} />
                    <Metric label="Ganancia empresa (20%)" value={resumen.gananciaEmpresa} highlight />

                </div>
            </div>
            <div className={s.section}>
                <div className={s.sectionHeader}>
                    <h3>Por domiciliario</h3>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{porDomiciliario.length} activos en el período</span>
                </div>

                {porDomiciliario.length === 0 ? (
                    <div className={s.vacio}>No hay pedidos entregados para el filtro seleccionado.</div>
                ) : (
                    <div className={s.tabla}>
                        <div className={`${s.tablaRow} ${s.tablaHeader}`}>
                            <div className={s.colNombre}>Domiciliario</div>
                            <div className={s.colNum}>Pedidos</div>
                            <div className={s.colNum}>Total bruto</div>
                            <div className={s.colNum}>Empresa (20%)</div>
                            <div className={s.colNum}>Neto domi (80%)</div>
                        </div>

                        {porDomiciliario.map((d) => (
                            <div key={d.id} className={s.tablaRow}>
                                <div className={s.colNombre}>🚴 {d.nombre}</div>
                                <div className={s.colNum}>{d.pedidos}</div>
                                <div className={s.colNum}>{fmt(d.bruto)}</div>
                                <div className={s.colNum}>{fmt(d.bruto * 0.20)}</div>
                                <div className={s.colNum}>{fmt(d.bruto * 0.80)}</div>
                            </div>
                        ))}

                        <div className={`${s.tablaRow} ${s.tablaTotal}`}>
                            <div className={s.colNombre}>Total</div>
                            <div className={s.colNum}>{resumen.pedidos}</div>
                            <div className={s.colNum}>{fmt(resumen.totalBruto)}</div>
                            <div className={s.colNum}>{fmt(resumen.gananciaEmpresa)}</div>
                            <div className={s.colNum}>{fmt(resumen.pagosDomis)}</div>
                        </div>
                    </div>
                )}
            </div>
            <div className={s.section}>
                <div className={s.sectionHeader}>
                    <h3>Historial de pedidos entregados</h3>
                </div>

                <div className={s.lista}>
                    {loading && <div className={s.vacio}>Cargando…</div>}

                    {!loading && pedidosFiltrados.length === 0 && (
                        <div className={s.vacio}>No hay pedidos para el filtro seleccionado.</div>
                    )}

                    {pedidosFiltrados.map((p) => (
                        <div key={p.id} className={`${s.itemCard} ${s.itemCardClickable}`}
                            onClick={() => { console.log("click", p); setDetalle(p); }}
                            title="Click para ver detalle">
                            <div className={s.itemInfo}>
                                <div className={s.itemTitulo}>
                                    <b>#{p.id}</b>
                                    <span className={s.badge} style={{ background: "#ecfdf5", color: "#065f46" }}>🟢 ENTREGADO</span>
                                </div>
                                <div><b>Envía:</b> {p.clienteNombre ?? `#${p.clienteId}`} — {p.telefonoContactoRecogida}</div>
                                <div><b>Recoge:</b> {p.barrioRecogida} — {p.direccionRecogida}</div>
                                <div><b>Entrega:</b> {p.barrioEntrega} — {p.direccionEntrega}</div>
                                <div><b>Recibe:</b> {p.nombreQuienRecibe} — {p.telefonoQuienRecibe}</div>
                                <div><b>Domiciliario:</b> {p.domiciliarioNombre ?? `#${p.domiciliarioId}`}</div>
                            </div>
                            <div className={s.itemFinanzas}>
                                <div className={s.itemTotal}>{fmt(toNum(p.costoServicio))}</div>
                                <div className={s.itemSub}>Empresa: {fmt(toNum(p.costoServicio) * 0.20)}</div>
                                <div className={s.itemSub}>Domi: {fmt(toNum(p.costoServicio) * 0.80)}</div>
                                {p.fechaCreacion && (
                                    <div className={s.itemFecha}>{yyyyMMdd(p.fechaCreacion)}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <PedidoDetalleModal
                open={!!detalle}
                pedido={detalle}
                onClose={() => setDetalle(null)}
                showCliente
                showDomi
            />
            {toast && <Toast error={toast} onClose={() => setToast(null)} />}
        </div>
    );
}
