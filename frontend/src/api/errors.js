export async function parseBackendError(res) {
    try {
        const data = await res.json();
        return {
            message: data.message || "Error inesperado",
            code: data.code || "ERROR_DESCONOCIDO",
            field: data.field || null,
            status: res.status,
        };
    } catch {
        return {
            message: "Error inesperado del servidor",
            code: "ERROR_PARSE",
            field: null,
            status: res.status,
        };
    }
}

export function errorFronted(message, field = null) {
    return {
        message,
        code: "ERROR_FRONTEND",
        field,
        status: null,
    };
}