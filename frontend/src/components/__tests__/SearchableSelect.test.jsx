import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchableSelect from '../SearchableSelect';

const opciones = [
    { value: '1', label: 'Barrio Centro' },
    { value: '2', label: 'Barrio Norte' },
    { value: '3', label: 'Barrio Sur' },
];

describe('SearchableSelect', () => {
    const defaultProps = {
        options: opciones,
        onChange: vi.fn(),
        onBlur: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe mostrar placeholder cuando no hay valor', () => {
        render(<SearchableSelect {...defaultProps} placeholder="Seleccionar barrio" />);
        expect(screen.getByText('Seleccionar barrio')).toBeInTheDocument();
    });

    it('debe mostrar el label de la opcion seleccionada', () => {
        render(<SearchableSelect {...defaultProps} value="1" />);
        expect(screen.getByText('Barrio Centro')).toBeInTheDocument();
    });

    it('debe abrir dropdown al hacer click', async () => {
        const user = userEvent.setup();
        render(<SearchableSelect {...defaultProps} />);

        await user.click(screen.getByRole('button'));
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('debe cerrar dropdown al hacer click fuera', async () => {
        const user = userEvent.setup();
        render(<SearchableSelect {...defaultProps} />);

        await user.click(screen.getByRole('button'));
        expect(screen.getByRole('textbox')).toBeInTheDocument();

        await user.click(document.body);
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('debe llamar onChange con el valor al seleccionar opcion', async () => {
        const user = userEvent.setup();
        render(<SearchableSelect {...defaultProps} />);

        await user.click(screen.getByRole('button'));
        await user.click(screen.getByText('Barrio Norte'));

        expect(defaultProps.onChange).toHaveBeenCalledWith('2');
    });

    it('debe filtrar opciones al escribir en search', async () => {
        const user = userEvent.setup();
        render(<SearchableSelect {...defaultProps} />);

        await user.click(screen.getByRole('button'));
        await user.type(screen.getByRole('textbox'), 'norte');

        expect(screen.getByText('Barrio Norte')).toBeInTheDocument();
        expect(screen.queryByText('Barrio Sur')).not.toBeInTheDocument();
    });

    it('debe mostrar mensaje cuando no hay resultados', async () => {
        const user = userEvent.setup();
        render(<SearchableSelect {...defaultProps} />);

        await user.click(screen.getByRole('button'));
        await user.type(screen.getByRole('textbox'), 'xyz');

        expect(screen.getByText(/Sin resultados/)).toBeInTheDocument();
    });

it('debe mostrar opcion placeholder cuando value es vacio', async () => {
        const user = userEvent.setup();
        render(<SearchableSelect {...defaultProps} value="" />);

        await user.click(screen.getByRole('button'));
        const placeholders = screen.getAllByText('Selecciona una opción');
        await user.click(placeholders[1]);

        expect(defaultProps.onChange).toHaveBeenCalledWith('');
    });

    it('no debe abrir dropdown cuando disabled es true', () => {
        render(<SearchableSelect {...defaultProps} disabled={true} />);
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('debe marcar opcion seleccionada con checkmark', async () => {
        const user = userEvent.setup();
        render(<SearchableSelect {...defaultProps} value="2" />);

        await user.click(screen.getByRole('button'));
        const options = screen.getAllByText('Barrio Norte');
        const selectedLi = options.find(o => o.getAttribute('role') === 'option');
        expect(selectedLi.className).toMatch(/optionSelected/);
    });

    it('no debe abrir dropdown cuando disabled es true', () => {
        render(<SearchableSelect {...defaultProps} disabled={true} />);
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('debe aplicar clase triggerError cuando error es true', () => {
        render(<SearchableSelect {...defaultProps} error={true} />);
        const button = screen.getByRole('button');
        expect(button.className).toMatch(/triggerError/);
    });

    it('debe llamar onBlur al cerrar dropdown', async () => {
        const user = userEvent.setup();
        render(<SearchableSelect {...defaultProps} />);

        await user.click(screen.getByRole('button'));
        await user.click(document.body);

        expect(defaultProps.onBlur).toHaveBeenCalled();
    });

    it('debe marcar opcion seleccionada con checkmark', async () => {
        const user = userEvent.setup();
        render(<SearchableSelect {...defaultProps} value="2" />);

        await user.click(screen.getByRole('button'));
        const checkmark = screen.getByText('✓');
        expect(checkmark).toBeInTheDocument();
    });
});