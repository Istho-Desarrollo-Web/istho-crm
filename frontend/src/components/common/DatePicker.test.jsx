import { render, screen, fireEvent } from '@testing-library/react';
import DatePicker from './DatePicker';

// react-day-picker usa matchMedia internamente
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('DatePicker', () => {
  it('muestra placeholder cuando no hay valor', () => {
    render(<DatePicker onChange={vi.fn()} />);
    expect(screen.getByText('dd/mm/aaaa')).toBeInTheDocument();
  });

  it('muestra la fecha en formato DD/MM/YYYY cuando hay valor', () => {
    render(<DatePicker value="2026-05-08" onChange={vi.fn()} />);
    expect(screen.getByText('08/05/2026')).toBeInTheDocument();
  });

  it('muestra el ícono de calendario', () => {
    const { container: _container } = render(<DatePicker onChange={vi.fn()} />);
    // lucide-react renderiza SVGs; verificamos que existe al menos un svg dentro del botón
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('abre el calendario al hacer click en el botón', () => {
    render(<DatePicker onChange={vi.fn()} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    // DayPicker v9 renderiza una tabla con role="grid"
    expect(document.querySelector('[role="grid"]')).toBeInTheDocument();
  });

  it('muestra botón de limpiar cuando hay valor', () => {
    const { container } = render(<DatePicker value="2026-05-08" onChange={vi.fn()} />);
    // El span con role="button" es el botón de limpiar (la X)
    expect(container.querySelector('span[role="button"]')).toBeInTheDocument();
  });

  it('llama onChange con string vacío al limpiar la fecha', () => {
    const handleChange = vi.fn();
    const { container } = render(<DatePicker value="2026-05-08" onChange={handleChange} />);
    const clearSpan = container.querySelector('[role="button"]');
    fireEvent.click(clearSpan);
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('no explota con fecha inválida', () => {
    expect(() => {
      render(<DatePicker value="no-es-fecha" onChange={vi.fn()} />);
    }).not.toThrow();
    // Con fecha inválida, parseDate devuelve undefined → muestra el placeholder
    expect(screen.getByText('dd/mm/aaaa')).toBeInTheDocument();
  });

  it('acepta prop label y la muestra', () => {
    render(<DatePicker label="Fecha de entrega" onChange={vi.fn()} />);
    expect(screen.getByText('Fecha de entrega')).toBeInTheDocument();
  });
});
