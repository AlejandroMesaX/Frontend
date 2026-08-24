import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Paginacion from '../Paginacion';

describe('Paginacion', () => {
    const defaultProps = {
        page: 0,
        totalPages: 5,
        onPageChange: vi.fn(),
        totalElements: 100,
        size: 10,
    };

    it('debe retornar null cuando totalPages <= 1', () => {
        const { container } = render(
            <Paginacion {...defaultProps} totalPages={1} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('debe mostrar informacion de rango correctamente', () => {
        render(<Paginacion {...defaultProps} page={0} size={10} totalElements={100} />);
        expect(screen.getByText(/Mostrando 1-10 de 100/)).toBeInTheDocument();
    });

    it('debe calcular bien el rango en pagina del medio', () => {
        render(<Paginacion {...defaultProps} page={4} size={10} totalElements={100} />);
        expect(screen.getByText((content) => content.includes('41') && content.includes('50'))).toBeInTheDocument();
    });

    it('debe deshabilitar botones prevision en primera pagina', () => {
        render(<Paginacion {...defaultProps} page={0} />);
        const prevButtons = screen.getAllByRole('button', { name: /«|‹/ });
        prevButtons.forEach(btn => {
            expect(btn).toBeDisabled();
        });
    });

    it('debe deshabilitar botones siguiente en ultima pagina', () => {
        render(<Paginacion {...defaultProps} page={4} />);
        const nextButtons = screen.getAllByRole('button', { name: /›|»/ });
        nextButtons.forEach(btn => {
            expect(btn).toBeDisabled();
        });
    });

    it('debe llamar onPageChange con pagina correcta al hacer click en numero', async () => {
        const user = userEvent.setup();
        render(<Paginacion {...defaultProps} page={1} />);

        const btn2 = screen.getByRole('button', { name: '3' });
        await user.click(btn2);

        expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
    });

    it('debe llamar onPageChange(0) al click en <<', async () => {
        const user = userEvent.setup();
        render(<Paginacion {...defaultProps} page={3} />);

        const btn = screen.getByRole('button', { name: '«' });
        await user.click(btn);

        expect(defaultProps.onPageChange).toHaveBeenCalledWith(0);
    });

    it('debe llamar onPageChange(totalPages - 1) al click en >>', async () => {
        const user = userEvent.setup();
        render(<Paginacion {...defaultProps} page={0} />);

        const btn = screen.getByRole('button', { name: '»' });
        await user.click(btn);

        expect(defaultProps.onPageChange).toHaveBeenCalledWith(4);
    });

    it('debe mostrar ellipsis cuando hay paginas ocultas al inicio', () => {
        render(<Paginacion {...defaultProps} page={4} totalPages={10} />);
        expect(screen.getAllByText('...').length).toBeGreaterThanOrEqual(1);
    });

    it('debe mostrar ellipsis cuando hay paginas ocultas al final', () => {
        render(<Paginacion {...defaultProps} page={0} totalPages={10} />);
        expect(screen.getAllByText('...').length).toBeGreaterThanOrEqual(1);
    });

    it('debe marcar la pagina activa con clase active', () => {
        render(<Paginacion {...defaultProps} page={2} />);
        const activeBtn = screen.getByRole('button', { name: '3' });
        expect(activeBtn.className).toMatch(/active/);
    });

    it('debe mostrar todas las paginas cuando hay pocas', () => {
        render(<Paginacion {...defaultProps} page={0} totalPages={3} />);
        expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    });
});