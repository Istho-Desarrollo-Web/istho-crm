import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renderiza children correctamente', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('llama onClick al hacer click', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('no llama onClick cuando está disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('no llama onClick cuando está loading', () => {
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('muestra spinner y texto Cargando... cuando loading=true', () => {
    const { container } = render(<Button loading>Click me</Button>);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('tiene aria-busy cuando loading=true', () => {
    render(<Button loading>Click me</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('tiene aria-label "Cargando, por favor espere" cuando loading=true', () => {
    render(<Button loading>Click me</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Cargando, por favor espere');
  });

  it('aplica variante primary por defecto (tiene clase bg-orange-500)', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button')).toHaveClass('bg-orange-500');
  });

  it('queda deshabilitado cuando disabled=true', () => {
    render(<Button disabled>Click me</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('tiene type="button" por defecto', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('tiene aria-live="polite" siempre', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('aria-live', 'polite');
  });
});
