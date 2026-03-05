import { useEffect, useMemo, useRef, useState } from "react";
import s from "./SearchableSelect.module.css";

/**
 * SearchableSelect — dropdown personalizado con buscador integrado.
 *
 * Props:
 *   value        {string}   — valor seleccionado actualmente
 *   onChange     {fn}       — fn(value) llamada al seleccionar
 *   onBlur       {fn}       — llamada al perder foco (para touched)
 *   options      {Array}    — [{value, label}]
 *   placeholder  {string}   — texto cuando no hay selección
 *   error        {boolean}  — si true, aplica borde rojo
 *   disabled     {boolean}
 */
export default function SearchableSelect({
    value,
    onChange,
    onBlur,
    options = [],
    placeholder = "Selecciona una opción",
    error = false,
    disabled = false,
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const containerRef = useRef(null);
    const searchRef = useRef(null);

    // Normaliza para comparar sin importar mayúsculas ni espacios extra
    const normalize = (s) => String(s ?? "").trim().toLowerCase();
    const selected = options.find((o) => normalize(o.value) === normalize(value));

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return options;
        return options.filter((o) => o.label.toLowerCase().includes(qq));
    }, [options, q]);

    // Cerrar al hacer click fuera
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setQ("");
                onBlur?.();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onBlur]);

    // Enfocar el input de búsqueda al abrir
    useEffect(() => {
        if (open) {
            setTimeout(() => searchRef.current?.focus(), 50);
        }
    }, [open]);

    function handleSelect(opt) {
        onChange?.(opt.value);
        setOpen(false);
        setQ("");
        onBlur?.();
    }

    function handleToggle() {
        if (disabled) return;
        setOpen((prev) => !prev);
        if (open) { setQ(""); onBlur?.(); }
    }

    function handleKeyDown(e) {
        if (e.key === "Escape") { setOpen(false); setQ(""); onBlur?.(); }
    }

    return (
        <div
            ref={containerRef}
            className={`${s.container} ${disabled ? s.disabled : ""}`}
            onKeyDown={handleKeyDown}
        >
            {/* Trigger */}
            <button
                type="button"
                className={`${s.trigger} ${error ? s.triggerError : ""} ${open ? s.triggerOpen : ""}`}
                onClick={handleToggle}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className={selected ? s.triggerValue : s.triggerPlaceholder}>
                    {selected ? selected.label : placeholder}
                </span>
                <span className={`${s.arrow} ${open ? s.arrowUp : ""}`}>▾</span>
            </button>

            {/* Dropdown */}
            {open && (
                <div className={s.dropdown}>
                    {/* Buscador */}
                    <div className={s.searchWrap}>
                        <input
                            ref={searchRef}
                            className={s.searchInput}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Buscar barrio..."
                            autoComplete="off"
                        />
                    </div>

                    {/* Lista */}
                    <ul className={s.list} role="listbox">
                        {/* Opción vacía */}
                        {!value && (
                            <li
                                className={`${s.option} ${s.optionPlaceholder}`}
                                onClick={() => handleSelect({ value: "", label: "" })}
                                role="option"
                            >
                                {placeholder}
                            </li>
                        )}

                        {filtered.length === 0 && (
                            <li className={s.optionEmpty}>Sin resultados para "{q}"</li>
                        )}

                        {filtered.map((opt) => (
                            <li
                                key={opt.value}
                                className={`${s.option} ${normalize(opt.value) === normalize(value) ? s.optionSelected : ""}`}
                                onClick={() => handleSelect(opt)}
                                role="option"
                                aria-selected={normalize(opt.value) === normalize(value)}
                            >
                                {opt.label}
                                {normalize(opt.value) === normalize(value) && <span className={s.checkmark}>✓</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
