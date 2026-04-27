import { render, screen, fireEvent } from '@testing-library/react';
import DataTable from './DataTable';

vi.mock('../StatusChip/StatusChip', () => ({
  default: ({ status }) => <span>{status}</span>,
}));

// ======================================================
// DATOS DE PRUEBA
// ======================================================
const columnas = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'estado', label: 'Estado' },
];

const filas = [
  { id: 1, nombre: 'Juan', estado: 'activo' },
  { id: 2, nombre: 'María', estado: 'inactivo' },
];

const tabs = [
  { id: 'activos', label: 'Activos', count: 5 },
  { id: 'inactivos', label: 'Inactivos', count: 3 },
];

// ======================================================
// DataTable - SimpleTable
// ======================================================
describe('DataTable - SimpleTable', () => {
  it('renderiza columnas con scope="col"', () => {
    const { container } = render(
      <DataTable columns={columnas} data={filas} />
    );

    const headers = container.querySelectorAll('th[scope="col"]');
    expect(headers).toHaveLength(2);
    expect(headers[0]).toHaveTextContent('Nombre');
    expect(headers[1]).toHaveTextContent('Estado');
  });

  it('renderiza filas de datos', () => {
    const { container } = render(
      <DataTable columns={columnas} data={filas} />
    );

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Juan');
    expect(rows[1]).toHaveTextContent('María');
  });

  it('muestra mensaje vacío cuando data está vacía', () => {
    render(
      <DataTable columns={columnas} data={[]} emptyMessage="Sin registros" />
    );

    expect(screen.getByText('Sin registros')).toBeInTheDocument();
  });

  it('tabla tiene aria-busy="true" cuando loading=true', () => {
    const { container } = render(
      <DataTable columns={columnas} data={filas} loading />
    );

    const table = container.querySelector('table');
    expect(table).toHaveAttribute('aria-busy', 'true');
  });

  it('llama onRowClick al hacer click en una fila', () => {
    const handleRowClick = vi.fn();
    const { container } = render(
      <DataTable columns={columnas} data={filas} onRowClick={handleRowClick} />
    );

    const row = container.querySelector('tbody tr');
    fireEvent.click(row);

    expect(handleRowClick).toHaveBeenCalledTimes(1);
    expect(handleRowClick).toHaveBeenCalledWith(filas[0]);
  });

  it('llama onRowClick al presionar Enter en una fila', () => {
    const handleRowClick = vi.fn();
    const { container } = render(
      <DataTable columns={columnas} data={filas} onRowClick={handleRowClick} />
    );

    const row = container.querySelector('tbody tr');
    fireEvent.keyDown(row, { key: 'Enter' });

    expect(handleRowClick).toHaveBeenCalledTimes(1);
    expect(handleRowClick).toHaveBeenCalledWith(filas[0]);
  });

  it('llama onRowClick al presionar Space en una fila', () => {
    const handleRowClick = vi.fn();
    const { container } = render(
      <DataTable columns={columnas} data={filas} onRowClick={handleRowClick} />
    );

    const row = container.querySelector('tbody tr');
    fireEvent.keyDown(row, { key: ' ' });

    expect(handleRowClick).toHaveBeenCalledTimes(1);
    expect(handleRowClick).toHaveBeenCalledWith(filas[0]);
  });

  it('fila clickeable tiene tabIndex=0', () => {
    const { container } = render(
      <DataTable columns={columnas} data={filas} onRowClick={() => {}} />
    );

    const row = container.querySelector('tbody tr');
    expect(row).toHaveAttribute('tabindex', '0');
  });

  it('fila clickeable tiene botón sr-only "Ver detalles"', () => {
    const { container } = render(
      <DataTable columns={columnas} data={filas} onRowClick={() => {}} />
    );

    const srOnlyTd = container.querySelector('td.sr-only');
    expect(srOnlyTd).toBeInTheDocument();

    const button = srOnlyTd.querySelector('button');
    expect(button).toHaveTextContent('Ver detalles');
    expect(button).toHaveAttribute('tabindex', '-1');
  });

  it('botón sr-only llama onRowClick al hacer click', () => {
    const handleRowClick = vi.fn();
    const { container } = render(
      <DataTable columns={columnas} data={filas} onRowClick={handleRowClick} />
    );

    const srOnlyButton = container.querySelector('td.sr-only button');
    fireEvent.click(srOnlyButton);

    expect(handleRowClick).toHaveBeenCalledTimes(1);
    expect(handleRowClick).toHaveBeenCalledWith(filas[0]);
  });

  it('fila sin onRowClick no tiene tabIndex ni botón sr-only', () => {
    const { container } = render(
      <DataTable columns={columnas} data={filas} />
    );

    const row = container.querySelector('tbody tr');
    expect(row).not.toHaveAttribute('tabindex');

    const srOnlyTd = container.querySelector('td.sr-only');
    expect(srOnlyTd).not.toBeInTheDocument();
  });

  it('renderiza tabla con aria-label cuando se proporciona', () => {
    const { container } = render(
      <DataTable columns={columnas} data={filas} ariaLabel="Tabla de usuarios" />
    );

    const table = container.querySelector('table');
    expect(table).toHaveAttribute('aria-label', 'Tabla de usuarios');
  });

  it('en estado loading: renderiza 5 filas skeleton', () => {
    const { container } = render(
      <DataTable columns={columnas} data={filas} loading />
    );

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(5);

    // Verifica que las celdas tienen los divs de skeleton (animate-pulse)
    const skeletons = container.querySelectorAll('div.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renderiza celdas con render personalizado cuando se proporciona', () => {
    const columnasConRender = [
      { key: 'nombre', label: 'Nombre' },
      {
        key: 'estado',
        label: 'Estado',
        render: (value) => <span className="custom-status">{value.toUpperCase()}</span>,
      },
    ];

    const { container } = render(
      <DataTable columns={columnasConRender} data={filas} />
    );

    const customStatus = container.querySelector('.custom-status');
    expect(customStatus).toHaveTextContent('ACTIVO');
  });

  it('renderiza celdas de tipo "id" con clase orange', () => {
    const columnasConId = [
      { key: 'id', label: 'ID', type: 'id' },
      { key: 'nombre', label: 'Nombre' },
    ];

    const { container } = render(
      <DataTable columns={columnasConId} data={filas} />
    );

    const idCell = container.querySelector('span.text-orange-600');
    expect(idCell).toHaveTextContent('1');
  });

  it('renderiza celdas de tipo "status" usando StatusChip', () => {
    const columnasConStatus = [
      { key: 'nombre', label: 'Nombre' },
      { key: 'estado', label: 'Estado', type: 'status' },
    ];

    const { container } = render(
      <DataTable columns={columnasConStatus} data={filas} />
    );

    const firstDataRow = container.querySelector('tbody tr:first-child');
    expect(firstDataRow).toHaveTextContent('activo');
  });
});

// ======================================================
// DataTable - Tabs
// ======================================================
describe('DataTable - Tabs', () => {
  const columnasConTabs = { activos: columnas, inactivos: columnas };
  const filasConTabs = { activos: filas, inactivos: [] };

  it('renderiza tablist con tabs', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
      />
    );

    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).toBeInTheDocument();

    const tabButtons = container.querySelectorAll('[role="tab"]');
    expect(tabButtons).toHaveLength(2);
    expect(tabButtons[0]).toHaveTextContent('Activos');
    expect(tabButtons[1]).toHaveTextContent('Inactivos');
  });

  it('tab activo tiene aria-selected="true"', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        defaultTab="activos"
      />
    );

    const activeTab = container.querySelector('[aria-selected="true"]');
    expect(activeTab).toHaveTextContent('Activos');
  });

  it('tab inactivo tiene aria-selected="false" y tabIndex="-1"', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        defaultTab="activos"
      />
    );

    const inactiveTab = container.querySelector('[id="tab-inactivos"]');
    expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
    expect(inactiveTab).toHaveAttribute('tabindex', '-1');
  });

  it('tab activo tiene tabIndex="0"', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        defaultTab="activos"
      />
    );

    const activeTab = container.querySelector('[id="tab-activos"]');
    expect(activeTab).toHaveAttribute('tabindex', '0');
  });

  it('cambia tab al hacer click', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        defaultTab="activos"
      />
    );

    const inactiveTab = container.querySelector('[id="tab-inactivos"]');
    fireEvent.click(inactiveTab);

    expect(inactiveTab).toHaveAttribute('aria-selected', 'true');
    expect(inactiveTab).toHaveAttribute('tabindex', '0');
  });

  it('tabpanel tiene role="tabpanel" y aria-labelledby correcto', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        defaultTab="activos"
      />
    );

    const tabpanel = container.querySelector('[role="tabpanel"]');
    expect(tabpanel).toBeInTheDocument();
    expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab-activos');
    expect(tabpanel).toHaveAttribute('id', 'panel-activos');
  });

  it('cambia tabpanel al cambiar tab', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        defaultTab="activos"
      />
    );

    const inactiveTab = container.querySelector('[id="tab-inactivos"]');
    fireEvent.click(inactiveTab);

    const tabpanel = container.querySelector('[role="tabpanel"]');
    expect(tabpanel).toHaveAttribute('id', 'panel-inactivos');
    expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab-inactivos');
  });

  it('navega entre tabs con ArrowRight', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        defaultTab="activos"
      />
    );

    const activeTab = container.querySelector('[id="tab-activos"]');
    fireEvent.keyDown(activeTab, { key: 'ArrowRight' });

    const inactiveTab = container.querySelector('[id="tab-inactivos"]');
    expect(inactiveTab).toHaveAttribute('aria-selected', 'true');
  });

  it('navega entre tabs con ArrowLeft', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        defaultTab="inactivos"
      />
    );

    const activeTab = container.querySelector('[id="tab-inactivos"]');
    fireEvent.keyDown(activeTab, { key: 'ArrowLeft' });

    const firstTab = container.querySelector('[id="tab-activos"]');
    expect(firstTab).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowRight envuelve al último tab al primero', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        defaultTab="inactivos"
      />
    );

    const activeTab = container.querySelector('[id="tab-inactivos"]');
    fireEvent.keyDown(activeTab, { key: 'ArrowRight' });

    const firstTab = container.querySelector('[id="tab-activos"]');
    expect(firstTab).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowLeft envuelve al primer tab al último', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        defaultTab="activos"
      />
    );

    const activeTab = container.querySelector('[id="tab-activos"]');
    fireEvent.keyDown(activeTab, { key: 'ArrowLeft' });

    const lastTab = container.querySelector('[id="tab-inactivos"]');
    expect(lastTab).toHaveAttribute('aria-selected', 'true');
  });

  it('llama onTabChange cuando cambia tab', () => {
    const handleTabChange = vi.fn();
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        onTabChange={handleTabChange}
      />
    );

    const inactiveTab = container.querySelector('[id="tab-inactivos"]');
    fireEvent.click(inactiveTab);

    expect(handleTabChange).toHaveBeenCalledTimes(1);
    expect(handleTabChange).toHaveBeenCalledWith('inactivos');
  });

  it('renderiza tabla dentro de tabpanel con datos del tab activo', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        defaultTab="activos"
      />
    );

    const tabpanel = container.querySelector('[role="tabpanel"]');
    const rows = tabpanel.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Juan');
  });

  it('muestra tabla vacía cuando tab activo no tiene datos', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        defaultTab="inactivos"
        emptyMessage="No hay registros"
      />
    );

    const tabpanel = container.querySelector('[role="tabpanel"]');
    expect(tabpanel).toHaveTextContent('No hay registros');
  });

  it('tabs muestran count cuando se proporciona', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renderiza con defaultTab especificado', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        defaultTab="inactivos"
      />
    );

    const activeTab = container.querySelector('[aria-selected="true"]');
    expect(activeTab).toHaveTextContent('Inactivos');
  });

  it('tab activo tiene underline visual (span con clase bg-orange-500)', () => {
    const { container } = render(
      <DataTable
        tabs={tabs}
        columns={columnasConTabs}
        data={filasConTabs}
        defaultTab="activos"
      />
    );

    const activeTab = container.querySelector('[id="tab-activos"]');
    const underline = activeTab.querySelector('span.bg-orange-500');
    expect(underline).toBeInTheDocument();
  });
});
