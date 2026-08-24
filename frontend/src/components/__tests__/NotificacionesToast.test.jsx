import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificacionesToast from '../NotificacionesToast';

describe('NotificacionesToast', () => {
    const defaultProps = {
        notificaciones: [],
        onCerrar: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar null cuando no hay notificaciones', () => {
        const { container } = render(<NotificacionesToast {...defaultProps} />);
        expect(container.firstChild).toBeNull();
    });

    it('debe mostrar una notificacion', () => {
        render(<NotificacionesToast {...defaultProps} notificaciones={[{ id: 1, mensaje: 'Test mensaje', tipo: 'info' }]} />);
        expect(screen.getByText('Test mensaje')).toBeInTheDocument();
    });

    it('debe mostrar el icono correcto para tipo info', () => {
        render(<NotificacionesToast {...defaultProps} notificaciones={[{ id: 1, mensaje: 'Test', tipo: 'info' }]} />);
        expect(screen.getByText('🔔')).toBeInTheDocument();
    });

    it('debe mostrar el icono correcto para tipo success', () => {
        render(<NotificacionesToast {...defaultProps} notificaciones={[{ id: 1, mensaje: 'Test', tipo: 'success' }]} />);
        expect(screen.getByText('✅')).toBeInTheDocument();
    });

    it('debe mostrar el icono correcto para tipo warning', () => {
        render(<NotificacionesToast {...defaultProps} notificaciones={[{ id: 1, mensaje: 'Test', tipo: 'warning' }]} />);
        expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('debe mostrar el icono correcto para tipo danger', () => {
        render(<NotificacionesToast {...defaultProps} notificaciones={[{ id: 1, mensaje: 'Test', tipo: 'danger' }]} />);
        expect(screen.getByText('🔴')).toBeInTheDocument();
    });

    it('debe mostrar multiple notificaciones', () => {
        render(<NotificacionesToast {...defaultProps} notificaciones={[
            { id: 1, mensaje: 'Mensaje 1', tipo: 'info' },
            { id: 2, mensaje: 'Mensaje 2', tipo: 'success' },
        ]} />);
        expect(screen.getByText('Mensaje 1')).toBeInTheDocument();
        expect(screen.getByText('Mensaje 2')).toBeInTheDocument();
    });

    it('debe llamar onCerrar con el id al hacer click en cerrar', () => {
        const onCerrar = vi.fn();
        render(<NotificacionesToast {...defaultProps} notificaciones={[{ id: 42, mensaje: 'Test', tipo: 'info' }]} onCerrar={onCerrar} />);
        fireEvent.click(screen.getByText('✕'));
        expect(onCerrar).toHaveBeenCalledWith(42);
    });

    it('debe tener boton de cerrar visible', () => {
        render(<NotificacionesToast {...defaultProps} notificaciones={[{ id: 1, mensaje: 'Test', tipo: 'info' }]} />);
        expect(screen.getByText('✕')).toBeInTheDocument();
    });
});