import { useCallback, useMemo, useState } from "react";
import { authFetch } from "../api/http";
import { parseBackendError, errorFronted } from "../api/errors";
import SearchableSelect from "../components/SearchableSelect";
import s from "./TarifasPanel.module.css";

export default function TarifasPanel({ barrios = [] }) {
    const [barrioRecogida, setBarrioRecogida] = useState("");
    const [barrioEntrega, setBarrioEntrega] = useState("");
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [touched, setTouched] = useState({ recogida: false, entrega: false });

    const barriosOptions = useMemo(
        () => barrios.map((b) => ({ value: b.nombre, label: b.nombre })),
        [barrios]
    );

    const errors = useMemo(() => {
        const e = {};
        if (!barrioRecogida) e.recogida = "Selecciona el barrio de recogida.";
        if (!barrioEntrega) e.entrega = "Selecciona el barrio de entrega.";
        return e;
    }, [barrioRecogida, barrioEntrega]);

    async function calcular() {
        setTouched({ recogida: true, entrega: true });
        if (Object.keys(errors).length > 0) return;

        setLoading(true);
        setError(null);
        setResultado(null);

        try {
            const params = new URLSearchParams({ barrioRecogida, barrioEntrega });
            const res = await authFetch(`/api/tarifas/calcular?${params}`);
            if (!res.ok) {
                const err = await parseBackendError(res);
                setError(err.message ?? "No se pudo calcular la tarifa.");
                return;
            }
            const data = await res.json();
            setResultado(data);
        } catch {
            setError(errorFronted("No se pudo conectar con el servidor.").message);
        } finally {
            setLoading(false);
        }
    }

    function limpiar() {
        setBarrioRecogida("");
        setBarrioEntrega("");
        setResultado(null);
        setError(null);
        setTouched({ recogida: false, entrega: false });
    }

    const mismosBarrios = barrioRecogida && barrioEntrega && barrioRecogida === barrioEntrega;

    return (
        <div className={s.container}>
            <div className={s.section}>
                <div className={s.sectionHeader}>
                    <h3>🧾 Consultar tarifa</h3>
                </div>

                <p className={s.descripcion}>
                    Selecciona el barrio de recogida y el barrio de entrega para conocer el costo del servicio.
                </p>

                <div className={s.grid}>
                    <div className={s.field}>
                        <label className={s.label}>📦 Barrio de recogida</label>
                        <SearchableSelect
                            options={barriosOptions}
                            value={barrioRecogida}
                            onChange={(v) => { setBarrioRecogida(v); setResultado(null); setError(null); }}
                            onBlur={() => setTouched((t) => ({ ...t, recogida: true }))}
                            placeholder="Selecciona barrio de recogida"
                            error={!!(touched.recogida && errors.recogida)}
                        />
                        {touched.recogida && errors.recogida && (
                            <div className={s.helper}>⚠️ {errors.recogida}</div>
                        )}
                    </div>
                    <div className={s.field}>
                        <label className={s.label}>🏠 Barrio de entrega</label>
                        <SearchableSelect
                            options={barriosOptions}
                            value={barrioEntrega}
                            onChange={(v) => { setBarrioEntrega(v); setResultado(null); setError(null); }}
                            onBlur={() => setTouched((t) => ({ ...t, entrega: true }))}
                            placeholder="Selecciona barrio de entrega"
                            error={!!(touched.entrega && errors.entrega)}
                        />
                        {touched.entrega && errors.entrega && (
                            <div className={s.helper}>⚠️ {errors.entrega}</div>
                        )}
                    </div>
                </div>

                {mismosBarrios && (
                    <div className={s.aviso}>
                        ℹ️ Recogida y entrega son el mismo barrio — se aplicará la tarifa base.
                    </div>
                )}

                <div className={s.acciones}>
                    <button
                        className={s.btnPrimary}
                        onClick={calcular}
                        disabled={loading}
                    >
                        {loading ? "Calculando..." : "Calcular tarifa"}
                    </button>
                    <button className={s.btn} onClick={limpiar} disabled={loading}>
                        Limpiar
                    </button>
                </div>
            </div>

            {error && (
                <div className={s.errorBox}>
                    ⛔ {error}
                </div>
            )}
            {resultado && (
                <div className={s.resultadoBox}>
                    <div className={s.resultadoTitulo}>💰 Tarifa</div>
                    <div className={s.resultadoRuta}>
                        <span className={s.rutaBarrio}>{resultado.barrioRecogida}</span>
                        <span className={s.rutaFlecha}>→</span>
                        <span className={s.rutaBarrio}>{resultado.barrioEntrega}</span>
                    </div>
                    <div className={s.resultadoCosto}>
                        ${Number(resultado.costo).toLocaleString("es-CO")}
                    </div>
                    <div className={s.resultadoNota}>
                        Precio del servicio de domicilio
                    </div>
                </div>
            )}
        </div>
    );
}
