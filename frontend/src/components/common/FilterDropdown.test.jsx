import { render, screen, fireEvent } from '@testing-library/react';
import FilterDropdown from './FilterDropdown';

const opciones = [
  { value: '', label: 'Todos' },
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
];

describe('FilterDropdown', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb) => { cb(); return 0; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra el placeholder cuando no hay valor seleccionado', () => {
    render(<FilterDropdown options={opciones} value="" onChange={() => {}} placeholder="Seleccionar estado" />);
    expect(screen.getByRole('button', { name: /Seleccionar estado/i })).toBeInTheDocument();
  });

  it('muestra el label de la opción seleccionada', () => {
    render(<FilterDropdown options={opciones} value="activo" onChange={() => {}} />);
    // El botón principal debe mostrar el label de la opción seleccionada
    const buttons = screen.getAllByRole('button');
    const triggerButton = buttons[0];
    expect(triggerButton).toHaveTextContent('Activo');
  });

  it('abre el panel de opciones al hacer click en el botón', () => {
    render(<FilterDropdown options={opciones} value="" onChange={() => {}} />);
    // El panel no debe estar visible inicialmente
    expect(screen.queryByText('Todos')).not.toBeInTheDocument();

    // Click en el botón principal (primer botón)
    const triggerButton = screen.getAllByRole('button')[0];
    fireEvent.click(triggerButton);

    // Ahora deben verse las opciones
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('llama a onChange con el value correcto al seleccionar una opción', () => {
    const handleChange = vi.fn();
    render(<FilterDropdown options={opciones} value="" onChange={handleChange} />);

    // Abrir panel
    fireEvent.click(screen.getAllByRole('button')[0]);

    // Seleccionar "Activo"
    fireEvent.click(screen.getByText('Activo'));

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('activo');
  });

  it('cierra el panel después de seleccionar una opción', () => {
    render(<FilterDropdown options={opciones} value="" onChange={() => {}} />);

    // Abrir panel
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(screen.getByText('Activo')).toBeInTheDocument();

    // Seleccionar una opción
    fireEvent.click(screen.getByText('Activo'));

    // El panel debe cerrarse
    expect(screen.queryByText('Inactivo')).not.toBeInTheDocument();
  });

  it('no muestra opciones cuando el panel está cerrado', () => {
    render(<FilterDropdown options={opciones} value="" onChange={() => {}} />);
    expect(screen.queryByText('Todos')).not.toBeInTheDocument();
    expect(screen.queryByText('Activo')).not.toBeInTheDocument();
    expect(screen.queryByText('Inactivo')).not.toBeInTheDocument();
  });

  it('muestra label si se proporciona la prop label', () => {
    render(<FilterDropdown options={opciones} value="" onChange={() => {}} label="Estado del cliente" />);
    expect(screen.getByText('Estado del cliente')).toBeInTheDocument();
  });

  it('usa el mismo value para opciones con IDs numéricos convertidos a string', () => {
    const handleChange = vi.fn();
    const opcionesNumericas = [
      { value: '', label: 'Todos' },
      { value: '1', label: 'Cliente A' },
      { value: '2', label: 'Cliente B' },
    ];
    render(<FilterDropdown options={opcionesNumericas} value="1" onChange={handleChange} />);

    // Debe mostrar el label de la opción con value "1"
    const triggerButton = screen.getAllByRole('button')[0];
    expect(triggerButton).toHaveTextContent('Cliente A');

    // Abrir panel y seleccionar otra opción
    fireEvent.click(triggerButton);
    fireEvent.click(screen.getByText('Cliente B'));

    expect(handleChange).toHaveBeenCalledWith('2');
  });
});
