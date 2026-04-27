import React from 'react';
import { render, screen } from '@testing-library/react';
import Input from './Input';

vi.mock('lucide-react', () => ({ AlertCircle: () => null }));

describe('Input', () => {
  it('renderiza label cuando se provee la prop label', () => {
    render(<Input label="Nombre" id="test-input" />);

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
  });

  it('asocia label con input via htmlFor e id', () => {
    const { container } = render(<Input label="Email" id="test-email" />);

    const label = container.querySelector('label');
    const input = screen.getByLabelText('Email');

    expect(label.htmlFor).toBe('test-email');
    expect(input).toHaveAttribute('id', 'test-email');
  });

  it('muestra asterisco en label cuando required=true', () => {
    const { container } = render(<Input label="Contraseña" id="test-input" required />);

    const asterisk = container.querySelector('span[aria-hidden="true"]');

    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveTextContent('*');
    expect(asterisk).toHaveAttribute('aria-hidden', 'true');
  });

  it('muestra mensaje de error con role="alert" cuando se provee error', () => {
    render(<Input error="Este campo es obligatorio" id="test-input" />);

    const errorElement = screen.getByRole('alert');

    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveTextContent('Este campo es obligatorio');
  });

  it('tiene aria-invalid="true" cuando hay error', () => {
    render(<Input error="Error de validación" id="test-input" />);

    const input = screen.getByRole('textbox');

    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('tiene aria-describedby apuntando al errorId cuando hay error', () => {
    render(<Input error="Campo inválido" id="test-input" />);

    const input = screen.getByRole('textbox');

    expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
  });

  it('muestra hint y tiene aria-describedby apuntando al hintId cuando hay hint', () => {
    render(<Input hint="Ej: juan@example.com" id="test-input" />);

    const hintText = screen.getByText('Ej: juan@example.com');
    const input = screen.getByRole('textbox');

    expect(hintText).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-describedby', 'test-input-hint');
  });

  it('encadena hintId y errorId en aria-describedby cuando hay hint y error', () => {
    render(<Input hint="Ej: juan@example.com" error="Campo inválido" id="test-input" />);

    const input = screen.getByRole('textbox');

    expect(input).toHaveAttribute('aria-describedby', 'test-input-hint test-input-error');
  });

  it('input está disabled cuando disabled=true', () => {
    render(<Input disabled id="test-input" />);

    const input = screen.getByRole('textbox');

    expect(input).toBeDisabled();
  });

  it('acepta ref via forwardRef', () => {
    const ref = React.createRef();
    render(<Input ref={ref} id="test-input" />);

    expect(ref.current).not.toBeNull();
    expect(ref.current.tagName).toBe('INPUT');
  });

  it('no tiene aria-invalid cuando no hay error', () => {
    render(<Input id="test-input" />);

    const input = screen.getByRole('textbox');

    expect(input).not.toHaveAttribute('aria-invalid');
  });
});
