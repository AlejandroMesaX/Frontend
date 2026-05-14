import s from "./Paginacion.module.css";

export default function Paginacion({ page, totalPages, onPageChange, totalElements, size }) {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let start = Math.max(0, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible);

    if (end - start < maxVisible) {
        start = Math.max(0, end - maxVisible);
    }

    for (let i = start; i < end; i++) {
        pages.push(i);
    }

    const startItem = page * size + 1;
    const endItem = Math.min((page + 1) * size, totalElements);

    return (
        <div className={s.container}>
            <div className={s.info}>
                Mostrando {startItem}-{endItem} de {totalElements}
            </div>
            <div className={s.controls}>
                <button
                    className={s.btn}
                    onClick={() => onPageChange(0)}
                    disabled={page === 0}
                >
                    &laquo;
                </button>
                <button
                    className={s.btn}
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 0}
                >
                    &lsaquo;
                </button>
                {start > 0 && <span className={s.ellipsis}>...</span>}
                {pages.map((p) => (
                    <button
                        key={p}
                        className={`${s.btn} ${p === page ? s.active : ""}`}
                        onClick={() => onPageChange(p)}
                    >
                        {p + 1}
                    </button>
                ))}
                {end < totalPages && <span className={s.ellipsis}>...</span>}
                <button
                    className={s.btn}
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages - 1}
                >
                    &rsaquo;
                </button>
                <button
                    className={s.btn}
                    onClick={() => onPageChange(totalPages - 1)}
                    disabled={page >= totalPages - 1}
                >
                    &raquo;
                </button>
            </div>
        </div>
    );
}