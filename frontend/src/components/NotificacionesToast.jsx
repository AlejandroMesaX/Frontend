import { useEffect, useState } from "react";
import s from "./NotificacionesToast.module.css";

const TIPOS = {
    info: { clase: s.info, icon: "🔔" },
    success: { clase: s.success, icon: "✅" },
    warning: { clase: s.warning, icon: "⚠️" },
    danger: { clase: s.danger, icon: "🔴" },
};

function NotificacionItem({ notif, onCerrar }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(t);
    }, []);

    const cfg = TIPOS[notif.tipo] ?? TIPOS.info;

    return (
        <div className={`${s.item} ${cfg.clase} ${visible ? s.itemVisible : ""}`}>
            <span className={s.icon}>{cfg.icon}</span>
            <span className={s.mensaje}>{notif.mensaje}</span>
            <button className={s.btnCerrar} onClick={() => onCerrar(notif.id)}>✕</button>
        </div>
    );
}

export default function NotificacionesToast({ notificaciones, onCerrar }) {
    if (!notificaciones || notificaciones.length === 0) return null;

    return (
        <div className={s.wrapper}>
            {notificaciones.map((n) => (
                <NotificacionItem key={n.id} notif={n} onCerrar={onCerrar} />
            ))}
        </div>
    );
}
