export default function Toast({ error, onClose }) {
    if (!error) return null;

    const isWarning = error.status === 400 || error.status === 403 || error.status === 404;
    const isServerError = error.status >= 500;

    const bg = isServerError ? "#fef2f2" : isWarning ? "#fffbeb" : "#f0fdf4";
    const color = isServerError ? "#991b1b" : isWarning ? "#92400e" : "#065f46";
    const border = isServerError ? "#fca5a5" : isWarning ? "#fcd34d" : "#6ee7b7";

    return (
        <div style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 99999,
            background: bg,
            color: color,
            border: `1px solid ${border}`,
            borderRadius: 10,
            padding: "12px 16px",
            maxWidth: 360,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {isServerError ? "⛔ Error del servidor" : isWarning ? "⚠️ Atención" : "✅ Éxito"}
                </span>
                <button
                    onClick={onClose}
                    style={{ background: "none", border: "none", cursor: "pointer", color }}
                >
                    ✕
                </button>
            </div>
            <span style={{ fontSize: 13 }}>{error.message}</span>
            {error.code && (
                <span style={{ fontSize: 11, opacity: 0.6 }}>Código: {error.code}</span>
            )}
        </div>
    );
}