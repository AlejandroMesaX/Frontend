import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotificaciones, mensajeAdmin, mensajeDelivery, mensajeCliente } from '../useNotificaciones';

describe('useNotificaciones', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('debe inicializar con array vacio', () => {
        const { result } = renderHook(() => useNotificaciones());
        expect(result.current.notificaciones).toEqual([]);
    });

    it('debe agregar una notificacion', () => {
        const { result } = renderHook(() => useNotificaciones());
        act(() => {
            result.current.agregar('Test mensaje', 'info');
        });
        expect(result.current.notificaciones).toHaveLength(1);
        expect(result.current.notificaciones[0].mensaje).toBe('Test mensaje');
    });

    it('debe cerrar una notificacion', () => {
        const { result } = renderHook(() => useNotificaciones());
        act(() => {
            result.current.agregar('Test mensaje', 'info');
        });
        const id = result.current.notificaciones[0].id;
        act(() => {
            result.current.cerrar(id);
        });
        expect(result.current.notificaciones).toHaveLength(0);
    });

    it('debe auto-cerrar notificacion despues de 5 segundos', () => {
        const { result } = renderHook(() => useNotificaciones());
        act(() => {
            result.current.agregar('Test mensaje', 'info');
        });
        expect(result.current.notificaciones).toHaveLength(1);
        act(() => {
            vi.advanceTimersByTime(5000);
        });
        expect(result.current.notificaciones).toHaveLength(0);
    });

    it('debe tener ids unicos incrementales', () => {
        const { result } = renderHook(() => useNotificaciones());
        act(() => {
            result.current.agregar('Msg 1', 'info');
            result.current.agregar('Msg 2', 'info');
        });
        expect(result.current.notificaciones[0].id).toBeLessThan(result.current.notificaciones[1].id);
    });
});

describe('mensajeAdmin', () => {
    it('debe generar mensaje para estado CREADO', () => {
        const result = mensajeAdmin({ id: 1, estado: 'CREADO', clienteNombre: 'Juan' });
        expect(result.msg).toContain('1');
        expect(result.msg).toContain('Juan');
        expect(result.tipo).toBe('info');
    });

    it('debe generar mensaje para estado ASIGNADO', () => {
        const result = mensajeAdmin({ id: 2, estado: 'ASIGNADO', domiciliarioNombre: 'Pedro' });
        expect(result.msg).toContain('2');
        expect(result.msg).toContain('Pedro');
    });

    it('debe generar mensaje para estado ENTREGADO', () => {
        const result = mensajeAdmin({ id: 3, estado: 'ENTREGADO' });
        expect(result.tipo).toBe('success');
    });

    it('debe generar mensaje para estado CANCELADO', () => {
        const result = mensajeAdmin({ id: 4, estado: 'CANCELADO' });
        expect(result.tipo).toBe('danger');
    });

    it('debe generar mensaje para estado INCIDENCIA', () => {
        const result = mensajeAdmin({ id: 5, estado: 'INCIDENCIA', motivoIncidencia: 'No se pudo entregar' });
        expect(result.msg).toContain('No se pudo entregar');
        expect(result.tipo).toBe('warning');
    });

    it('debe retornar null para estado desconocido', () => {
        const result = mensajeAdmin({ id: 6, estado: 'DESCONOCIDO' });
        expect(result).toBeNull();
    });
});

describe('mensajeDelivery', () => {
    it('debe generar mensaje para estado ASIGNADO con barrioRecogida', () => {
        const result = mensajeDelivery({ id: 1, estado: 'ASIGNADO', barrioRecogida: 'Centro' });
        expect(result.msg).toContain('1');
        expect(result.msg).toContain('Centro');
    });

    it('debe generar mensaje para estado EN_CAMINO con barrioEntrega', () => {
        const result = mensajeDelivery({ id: 2, estado: 'EN_CAMINO', barrioEntrega: 'Norte' });
        expect(result.msg).toContain('2');
        expect(result.msg).toContain('Norte');
    });

    it('debe generar mensaje para estado ENTREGADO', () => {
        const result = mensajeDelivery({ id: 3, estado: 'ENTREGADO' });
        expect(result.tipo).toBe('success');
    });

    it('debe generar mensaje para estado CANCELADO', () => {
        const result = mensajeDelivery({ id: 4, estado: 'CANCELADO' });
        expect(result.tipo).toBe('danger');
    });

    it('debe retornar null para estado desconocido', () => {
        const result = mensajeDelivery({ id: 5, estado: 'DESCONOCIDO' });
        expect(result).toBeNull();
    });
});

describe('mensajeCliente', () => {
    it('debe generar mensaje para estado ASIGNADO', () => {
        const result = mensajeCliente({ id: 1, estado: 'ASIGNADO' });
        expect(result.msg).toContain('1');
        expect(result.tipo).toBe('info');
    });

    it('debe generar mensaje para estado EN_CAMINO', () => {
        const result = mensajeCliente({ id: 2, estado: 'EN_CAMINO' });
        expect(result.msg).toContain('2');
    });

    it('debe generar mensaje para estado ENTREGADO', () => {
        const result = mensajeCliente({ id: 3, estado: 'ENTREGADO' });
        expect(result.tipo).toBe('success');
    });

    it('debe generar mensaje para estado CANCELADO', () => {
        const result = mensajeCliente({ id: 4, estado: 'CANCELADO' });
        expect(result.tipo).toBe('danger');
    });

    it('debe generar mensaje para estado INCIDENCIA con motivo', () => {
        const result = mensajeCliente({ id: 5, estado: 'INCIDENCIA', motivoIncidencia: 'Cliente no disponible' });
        expect(result.msg).toContain('Cliente no disponible');
        expect(result.tipo).toBe('warning');
    });

    it('debe retornar null para estado desconocido', () => {
        const result = mensajeCliente({ id: 6, estado: 'DESCONOCIDO' });
        expect(result).toBeNull();
    });
});