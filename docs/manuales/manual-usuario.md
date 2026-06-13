# Manual de Usuario — CRM CenthriX

## ISTHO S.A.S.

**Version:** 1.3.0 | **Fecha:** Junio 2026

**Centro Logistico Industrial del Norte** — Girardota, Antioquia, Colombia

---

## Tabla de Contenido

1. [Autenticacion](#1-autenticacion)
   - 1.1 Inicio de Sesion
   - 1.2 Recuperar Contrasena
   - 1.3 Cambio de Contrasena Obligatorio
   - 1.4 Bloqueo de Cuenta
   - 1.5 Gestion de Sesion
   - 1.6 Autenticacion de Dos Factores (2FA)
2. [Dashboard](#2-dashboard)
   - 2.1 Dashboard Administrador / Operador
   - 2.2 Dashboard Financiera
   - 2.3 Dashboard Conductor
3. [Clientes](#3-clientes)
   - 3.1 Listado de Clientes
   - 3.2 Detalle de Cliente
   - 3.3 Crear / Editar Cliente
4. [Inventario](#4-inventario)
   - 4.1 Listado de Productos
   - 4.2 Detalle de Producto
   - 4.3 Alertas de Inventario
5. [Auditoria WMS](#5-auditoria-wms)
   - 5.1 Entradas (CO)
   - 5.2 Salidas (PK)
   - 5.3 Kardex (CR)
6. [Vehiculos](#6-vehiculos)
   - 6.1 Listado de Vehiculos
   - 6.2 Crear / Editar Vehiculo
   - 6.3 Alertas de Documentos
7. [Viajes](#7-viajes)
   - 7.1 Listado de Viajes
   - 7.2 Crear Viaje
   - 7.3 Detalle de Viaje
8. [Cajas Menores](#8-cajas-menores)
   - 8.1 Listado de Cajas Menores
   - 8.2 Crear Caja Menor
   - 8.3 Detalle de Caja Menor
   - 8.4 Cerrar Caja
9. [Movimientos de Caja Menor](#9-movimientos-de-caja-menor)
   - 9.1 Listado de Movimientos
   - 9.2 Crear Movimiento
   - 9.3 Aprobar / Rechazar
   - 9.4 Ver Detalle
10. [Reportes](#10-reportes)
    - 10.1 Vista de Reportes
    - 10.2 Reporte de Operaciones
    - 10.3 Reporte de Inventario
    - 10.4 Reporte de Inventario por Ubicacion
    - 10.5 Reporte de Clientes
    - 10.6 Reporte de Averias
    - 10.7 Reporte de Solicitudes
    - 10.8 Reporte de Viajes
    - 10.9 Reporte de Cajas Menores
    - 10.10 Reporte de Gastos
    - 10.11 Exportar Excel / PDF
    - 10.12 Reportes Programados
11. [Configuracion WMS (Solo Admin)](#11-configuracion-wms-solo-admin)
    - 11.1 Motivos de Kardex
    - 11.2 Tipos de Orden
    - 11.3 Estados Validos
12. [Administracion (Solo Admin)](#12-administracion-solo-admin)
    - 12.1 Usuarios
    - 12.2 Roles y Permisos
    - 12.3 Sesiones Activas
13. [Perfil y Configuracion](#13-perfil-y-configuracion)
    - 13.1 Datos Personales
    - 13.2 Cambiar Contrasena
    - 13.3 Preferencias
14. [Notificaciones](#14-notificaciones)
    - 14.1 Panel de Notificaciones
    - 14.2 Tipos de Notificaciones
15. [Almacenamiento de Archivos (Amazon S3)](#15-almacenamiento-de-archivos-amazon-s3)
16. [Solicitudes del Cliente (Portal)](#16-solicitudes-del-cliente-portal)
    - 16.1 Tipos de Solicitud
    - 16.2 Crear una Solicitud
    - 16.3 Seguimiento de Solicitudes
17. [Portal Cliente](#17-portal-cliente)
    - 17.1 Acceso y Credenciales
    - 17.2 Identificacion en el Sistema
    - 17.3 Funciones Disponibles
    - 17.4 Restricciones
    - 17.5 Ver Mi Empresa

---

## 1. Autenticacion

### 1.1 Inicio de Sesion

Para acceder al sistema CRM CenthriX siga los siguientes pasos:

1. Abra su navegador web (se recomienda Google Chrome o Microsoft Edge en su version mas reciente).
2. Ingrese la URL del sistema proporcionada por el area de TI (por ejemplo: `https://crm.istho.com.co`).
3. En la pantalla de inicio de sesion vera el logo de ISTHO y un formulario con dos campos.
4. En el campo **"Usuario o correo electronico"** ingrese su nombre de usuario o su correo corporativo (ejemplo: `jperez` o `jperez@istho.com.co`).
5. En el campo **"Contrasena"** ingrese su contrasena. Puede hacer clic en el icono del ojo para mostrar u ocultar la contrasena mientras la escribe.
6. Si desea que el sistema recuerde su sesion, marque la casilla **"Recordarme"**.
7. Haga clic en el boton **"Iniciar Sesion"**.
8. Si las credenciales son correctas, sera redirigido automaticamente al Dashboard correspondiente a su rol.

> **Nota:** Si tiene problemas para acceder, puede contactar soporte escribiendo a soporte@istho.com.co desde el enlace que aparece debajo del formulario.

### 1.2 Recuperar Contrasena

Si olvido su contrasena, puede restablecerla siguiendo estos pasos:

1. En la pantalla de inicio de sesion, haga clic en el enlace **"Olvidaste tu contrasena?"** ubicado a la derecha, debajo del campo de contrasena.
2. Se abrira la pagina de **Recuperar Contrasena** con el logo de ISTHO y un icono de llave.
3. Ingrese su **correo electronico** registrado en el sistema en el campo indicado (ejemplo: `jperez@istho.com.co`).
4. Haga clic en el boton **"Enviar Instrucciones"**.
5. Si el correo esta registrado, recibira un email con un enlace para restablecer su contrasena.
6. Aparecera una pantalla de confirmacion con el mensaje **"Correo Enviado"**.
7. Revise su bandeja de entrada (y la carpeta de spam si no lo encuentra).
8. Haga clic en el enlace recibido por correo. Se abrira la pagina **"Nueva Contrasena"**.
9. Ingrese su nueva contrasena en el campo **"Nueva Contrasena"**. El sistema le mostrara un indicador de seguridad con cinco barras de colores:
   - Rojo: Debil
   - Naranja: Regular
   - Amarillo: Buena
   - Verde claro: Fuerte
   - Verde oscuro: Muy fuerte
10. Ingrese la misma contrasena en el campo **"Confirmar Contrasena"**. Aparecera un indicador verde si ambas coinciden.
11. Haga clic en **"Restablecer Contrasena"**.
12. Vera el mensaje **"Contrasena Actualizada"** y sera redirigido al inicio de sesion en unos segundos.

> **Nota:** La contrasena debe tener **minimo 8 caracteres**, e incluir al menos **una letra mayuscula**, **un numero** y **un caracter especial** (ejemplo: `@`, `#`, `$`, `!`).

> **Nota:** El enlace de recuperacion tiene un tiempo de expiracion. Si el enlace ya no es valido, vera el mensaje "Enlace Invalido" y debera solicitar uno nuevo.

### 1.3 Cambio de Contrasena Obligatorio

Cuando un administrador crea su cuenta o restablece su contrasena manualmente, es posible que el sistema le solicite cambiar la contrasena en su primer inicio de sesion:

1. Inicie sesion con las credenciales temporales proporcionadas.
2. El sistema le redirigira automaticamente a la pantalla de cambio de contrasena.
3. Ingrese la contrasena temporal en el campo **"Contrasena actual"**.
4. Ingrese su nueva contrasena en **"Nueva contrasena"** y confirmela.
5. Haga clic en **"Guardar"**.
6. Una vez actualizada, sera redirigido al Dashboard.

### 1.4 Bloqueo de Cuenta

El sistema implementa medidas de seguridad contra intentos no autorizados:

- Si ingresa credenciales incorrectas **5 veces consecutivas**, su cuenta sera bloqueada temporalmente por **15 minutos**.
- Durante el bloqueo, vera un mensaje indicando que la cuenta esta temporalmente bloqueada.
- Despues de transcurridos los 15 minutos, podra intentar iniciar sesion nuevamente.
- Si continua teniendo problemas, contacte al administrador del sistema o a soporte@istho.com.co.

### 1.5 Gestion de Sesion

El sistema utiliza un esquema de **doble token** para una gestion de sesion fluida:

- **Token de acceso:** Tiene una duracion de **24 horas**. Se utiliza para autenticar cada solicitud al servidor.
- **Token de refresco:** Tiene una duracion de **7 dias**. Permite renovar el token de acceso automaticamente sin necesidad de volver a iniciar sesion.
- Mientras el token de refresco sea valido, el sistema renovara el acceso de forma transparente. El usuario no percibira interrupciones.
- Si ambos tokens expiran (por ejemplo, tras 7 dias sin ingresar al sistema), se le solicitara iniciar sesion nuevamente.

### 1.6 Autenticacion de Dos Factores (2FA)

El sistema admite autenticacion de dos factores mediante una aplicacion autenticadora (Google Authenticator, Microsoft Authenticator, Authy, etc.). Esta funcion agrega una capa adicional de seguridad.

**Activar el 2FA:**

1. Vaya a su perfil (icono de usuario en la esquina superior derecha) y seleccione **"Configuracion"**.
2. En la seccion **"Seguridad"**, haga clic en **"Configurar autenticacion de dos factores"**.
3. Aparecera un codigo QR. Escanee el codigo con su aplicacion autenticadora.
4. Ingrese el codigo de 6 digitos generado por la aplicacion para confirmar la activacion.
5. El sistema le mostrara **8 codigos de respaldo** de un solo uso. Guardelos en un lugar seguro: son necesarios si pierde acceso a su telefono.

**Inicio de sesion con 2FA activo:**

1. Ingrese su usuario y contrasena normalmente.
2. Si el 2FA esta activo, aparecera una segunda pantalla solicitando el **codigo de verificacion**.
3. Abra su aplicacion autenticadora y copie el codigo de 6 digitos.
4. Ingrese el codigo y haga clic en **"Verificar"**.
5. Si no tiene acceso a su telefono, haga clic en **"Usar codigo de respaldo"** e ingrese uno de los codigos guardados.

**Desactivar el 2FA:**

1. Vaya a **"Configuracion" > "Seguridad"**.
2. Haga clic en **"Deshabilitar autenticacion de dos factores"**.
3. Ingrese el codigo actual de su aplicacion autenticadora para confirmar.

> **Nota:** Los codigos de respaldo son de un solo uso. Una vez usados no pueden volver a utilizarse. Se recomienda mantenerlos impresos o en un gestor de contrasenas seguro.

---

## 2. Dashboard

El Dashboard es la pantalla principal que se muestra al iniciar sesion. Su contenido varia segun el rol del usuario.

### 2.1 Dashboard Administrador / Operador

Este es el dashboard por defecto para los roles **admin**, **supervisor** y **operador**. Esta orientado a la auditoria WMS y el inventario.

**Encabezado:**
- Muestra un saludo personalizado con el nombre del usuario (ejemplo: "Buenos dias, Carlos").
- Indica "Panel de Auditoria WMS" como subtitulo.
- Muestra la hora de la ultima actualizacion.
- El boton **"Actualizar"** (icono de flechas circulares) recarga todos los datos en tiempo real.

**KPIs (4 tarjetas superiores):**

| KPI | Descripcion |
|-----|-------------|
| Entradas Pendientes | Cantidad de recepciones del WMS que aun no se han auditado |
| Salidas Pendientes | Cantidad de despachos del WMS pendientes de auditoria |
| Cerradas este Mes | Total de auditorias completadas en el mes actual, con porcentaje de cumplimiento |
| Productos en Stock | Total de productos registrados en inventario |

**Acciones Rapidas (4 botones):**

1. **Entradas** — Ir a la lista de entradas para auditar recepciones WMS.
2. **Salidas** — Ir a la lista de salidas para auditar despachos WMS.
3. **Inventario** — Ir al maestro de productos.
4. **Clientes** — Ir a la gestion de clientes.

**Graficos:**
- **Auditorias por Estado** — Grafico de barras que muestra la distribucion de operaciones por estado (Pendiente, En Proceso, Cerrado).
- **Entradas vs Salidas** — Grafico circular que compara la proporcion de operaciones del mes.

**Tablas de Operaciones Recientes:**
- **Entradas Recientes** — Muestra las ultimas recepciones con columnas: Documento, Cliente, Tipo, Lineas verificadas, Estado. Haga clic en una fila para ir al detalle.
- **Salidas Recientes** — Misma estructura para despachos.

**Resumen de Auditoria:**
- Tres tarjetas con totales: Pendientes (requieren atencion), En Proceso (verificandose), Cerradas (completadas este mes).

**Alertas de Inventario:**
- Widget lateral que muestra hasta 4 alertas activas de inventario: stock agotado, stock bajo, productos por vencer.
- Haga clic en una alerta para ir al detalle del producto.
- El enlace **"Ver todas"** lleva a la pantalla completa de alertas.
- Debajo se muestra un resumen con contadores por tipo de alerta.

> **Nota:** El dashboard del rol **operador** muestra la misma informacion pero con acceso limitado segun sus permisos asignados.

### 2.2 Dashboard Financiera

Panel exclusivo para el rol **financiera**, orientado a la gestion de gastos, cajas menores y vehiculos.

**Encabezado:**
- Saludo personalizado con el nombre del usuario.
- Indica "Panel Financiero" como subtitulo.
- Boton de actualizar para recargar datos.

**KPIs (4 tarjetas superiores):**

| KPI | Descripcion |
|-----|-------------|
| Cajas Abiertas | Cantidad de cajas menores actualmente abiertas |
| Gastos Pendientes | Numero de movimientos de caja menor pendientes de aprobacion |
| Total Egresos Activos | Suma en pesos colombianos de todos los egresos en cajas abiertas |
| Total Ingresos Activos | Suma en pesos colombianos de todos los ingresos en cajas abiertas |

**Acciones Rapidas:**

1. **Cajas Menores** — Gestionar cajas abiertas.
2. **Movimientos** — Aprobar gastos pendientes.
3. **Viajes** — Seguimiento de viajes.
4. **Reportes** — Informes financieros.

**Tabla de Gastos Pendientes de Aprobacion:**
- Ocupa 2/3 de la pantalla.
- Columnas: checkbox de seleccion, numero (#), Usuario, Concepto, Caja, Valor, Fecha, Acciones.
- Cada fila tiene botones **"Aprobar"** (verde) y **"Rechazar"** (rojo).
- Puede seleccionar multiples gastos con los checkboxes y usar el boton **"Aprobar (N)"** para aprobacion masiva.
- El checkbox superior selecciona/deselecciona todos.

**Panel Lateral (1/3 de pantalla):**
- **Cajas Abiertas** — Lista de cajas menores abiertas mostrando numero, usuario asignado, fecha de apertura y saldo actual. Haga clic en una para ir a su detalle.
- **Alertas Vehiculos** — Alertas de vencimiento de SOAT y tecnomecanica. Muestra placa, tipo de documento y estado (Vencido o Por vencer).

### 2.3 Dashboard Conductor

Panel optimizado para dispositivos moviles, exclusivo para el rol **conductor**.

**Encabezado:**
- Avatar del usuario (foto o iniciales) con saludo personalizado.
- Fecha actual en formato largo (ejemplo: "Lunes, 24 de Marzo 2026").

**Caja Menor Activa:**
- Tarjeta principal que muestra la caja menor asignada al conductor.
- Muestra el numero de caja, saldo actual (en grande, color verde) y saldo inicial.
- Haga clic en la tarjeta para ir al detalle de la caja.
- Si no tiene caja activa, se muestra el mensaje "No tienes caja menor activa".

**Acciones Rapidas (4 botones en cuadricula 2x2):**

| Boton | Accion |
|-------|--------|
| Nuevo Viaje | Abrir formulario para registrar un nuevo viaje |
| Registrar Gasto | Abrir formulario para crear un movimiento de caja menor |
| Mis Viajes | Ver listado de viajes propios |
| Mis Gastos | Ver listado de movimientos/gastos propios |

**Ultimos Viajes:**
- Lista de los 5 viajes mas recientes del conductor.
- Cada tarjeta muestra: numero de viaje, estado (badge de color), fecha, destino y placa del vehiculo.
- Haga clic en un viaje para ir a su detalle.

**Ultimos Gastos:**
- Lista de los 5 gastos mas recientes.
- Cada tarjeta tiene un borde lateral de color segun estado: naranja (pendiente), verde (aprobado), rojo (rechazado).
- Muestra: consecutivo, estado, concepto y valor.

---

## 3. Clientes

### 3.1 Listado de Clientes

Para acceder al modulo de clientes:

1. En el menu lateral, haga clic en **"Clientes"**.
2. Vera la pantalla de listado con una tabla de todos los clientes registrados.

**Funcionalidades del listado:**

- **Buscar:** Utilice la barra de busqueda superior para filtrar clientes por razon social, NIT o correo electronico.
- **Filtros:** Utilice los desplegables de filtro para refinar la busqueda:

| Filtro | Opciones |
|--------|----------|
| Tipo de Cliente | Corporativo, PyME, Persona Natural |
| Sector | Alimentos y Bebidas, Construccion, Manufactura, Retail, Farmaceutico, Quimico, Textil, Tecnologia, Servicios |
| Estado | Activo, Inactivo, Suspendido |

- **Crear cliente:** Haga clic en el boton **"+ Nuevo Cliente"** para abrir el formulario de creacion.
- **Acciones por registro:** Haga clic en el icono de tres puntos (menu) en cada fila para acceder a:
  - **Ver** — Ir al detalle del cliente.
  - **Editar** — Abrir formulario de edicion.
  - **Eliminar** — Eliminar el cliente (requiere confirmacion).
- **Importar clientes:** Boton **"Importar"** permite cargar un archivo Excel (.xlsx) con vista previa antes de confirmar.
- **Exportar:** Boton de descarga para exportar la lista a Excel.
- **Paginacion:** Navegue entre paginas usando los controles inferiores.

> **Nota:** Solo los usuarios con permiso `clientes: ver` pueden acceder a este modulo. Para crear o editar se requiere el permiso `clientes: crear` o `clientes: editar` respectivamente.

### 3.2 Detalle de Cliente

Al hacer clic en **"Ver"** o en el nombre de un cliente:

1. Se abre la pantalla de detalle con toda la informacion del cliente.
2. La informacion se organiza en pestanas:
   - **Informacion General** — Razon social, NIT, email, telefono, direccion, tipo de cliente, sector, estado y observaciones.
   - **Contactos** — Lista de personas de contacto asociadas al cliente.
   - **Inventario** — Productos almacenados que pertenecen a este cliente con cantidades en stock.
   - **Operaciones** — Historial de entradas, salidas y movimientos de kardex asociados.
3. Desde el detalle puede hacer clic en **"Editar"** para modificar la informacion.

### 3.3 Crear / Editar Cliente

El formulario de cliente incluye los siguientes campos:

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| Razon Social | Texto | Si | Nombre legal de la empresa o persona |
| NIT / Cedula | Texto | Si | Numero de identificacion tributaria |
| Email | Correo | Si | Correo electronico principal |
| Telefono | Texto | No | Numero de contacto |
| Direccion | Texto | No | Direccion fisica |
| Ciudad | Texto | No | Ciudad de ubicacion |
| Departamento | Texto | No | Departamento (region) |
| Tipo de Cliente | Seleccion | Si | Corporativo, PyME o Persona Natural |
| Sector | Seleccion | No | Sector economico del cliente |
| Estado | Seleccion | Si | Activo, Inactivo o Suspendido |
| Observaciones | Texto largo | No | Notas adicionales |

**Para crear un cliente:**
1. Haga clic en **"+ Nuevo Cliente"** desde el listado.
2. Complete los campos obligatorios (marcados con asterisco rojo).
3. Haga clic en **"Guardar"**.
4. El sistema mostrara una notificacion de exito y lo redirigira al listado.

**Para editar un cliente:**
1. Desde el listado o el detalle, haga clic en **"Editar"**.
2. Modifique los campos necesarios.
3. Haga clic en **"Guardar"**.

---

## 4. Inventario

### 4.1 Listado de Productos

Para acceder al inventario:

1. En el menu lateral, haga clic en **"Inventario"**.
2. Vera el listado maestro de productos almacenados.

**Funcionalidades:**

- **Buscar:** Filtre productos por nombre, codigo o referencia.
- **Filtrar por cliente:** Seleccione un cliente para ver solo sus productos.
- **Indicadores de stock:** Cada producto muestra un indicador de color segun su nivel de stock:
  - Verde: stock suficiente.
  - Amarillo: stock bajo (cercano al minimo).
  - Rojo: agotado (stock en cero).
- **Crear producto:** Boton **"+ Nuevo Producto"** para agregar un producto manualmente.
- **Exportar:** Descargue el listado en formato Excel.

**Formulario de producto (Crear / Editar):**

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| Nombre | Texto | Si | Nombre del producto |
| SKU | Texto | Si | Codigo unico del producto |
| Cliente | Seleccion | Si | Cliente al que pertenece el producto |
| Categoria | Seleccion | No | Categoria del producto |
| Unidad de Medida | Seleccion | Si | Unidad en la que se mide el stock (Unidades, Cajas, Kilos, etc.) |
| Stock Minimo | Numero | No | Cantidad minima para generar alerta de stock bajo |
| Descripcion | Texto largo | No | Descripcion detallada del producto |

> **Nota:** Los productos se sincronizan automaticamente desde el WMS Centhrix. Los productos creados manualmente estan disponibles para operaciones internas.

### 4.2 Detalle de Producto

Al hacer clic en un producto del listado se abre la vista de detalle, organizada en pestanas:

**Pestana Informacion**
- Datos basicos: nombre, SKU, cliente, categoria, unidad de medida, stock actual, stock minimo.
- Indicadores de alerta si el stock esta por debajo del minimo o agotado.

**Pestana Cajas (N)**
- Listado de todas las cajas/estibas fisicas del producto con: numero de caja, cantidad, lote, estado, ubicacion y fechas.
- Incluye **barra de busqueda** para filtrar por numero de caja o lote.
- El contador del tab muestra el total de cajas activas.

**Pestana Movimientos (N)**
- Historial cronologico de entradas, salidas y ajustes de kardex que afectaron el stock.
- Solo se muestran los movimientos de tipo **Kardex Carga** (ajustes de entrada desde el WMS). Los movimientos de Kardex Descarga no se muestran porque ya estan representados como salidas por las ordenes de picking.

**Pestana Estadisticas**
- Graficas de evolucion de stock y distribucion de movimientos por tipo.

**Pestana Ubicacion WMS** *(visible solo para productos con codigo WMS asignado)*
- Muestra la ubicacion fisica actual del producto dentro de la bodega segun el WMS CenthriX.
- Tabla con columnas: **N° Caja** · **Posicion en bodega** · **Bodega** · **Lote** · **Cantidad**.
- La posicion se expresa como coordenada de rack (ej: `RACK-A1-M6-N1-P3`).
- La columna **Bodega** indica a que bodega pertenece la posicion (ej: `Bodega 106`), necesario cuando la misma nomenclatura de rack existe en varias bodegas.
- Si el producto no tiene posicion asignada en el WMS, se muestra el mensaje "Sin ubicacion asignada en bodega".
- Si el WMS no esta disponible temporalmente, se muestra un aviso sin interrumpir el resto de la pagina.

### 4.3 Alertas de Inventario

La pantalla de alertas centraliza todas las situaciones que requieren atencion inmediata:

1. En el menu lateral, navegue a **"Inventario" > "Alertas"**, o haga clic en **"Ver todas"** desde el widget de alertas del Dashboard.
2. Las alertas se clasifican en tres tipos:

| Tipo | Icono | Descripcion |
|------|-------|-------------|
| Agotado | Caja roja | El producto tiene stock en cero |
| Stock Bajo | Triangulo amarillo | El stock esta por debajo del minimo configurado |
| Por Vencer | Reloj naranja | El producto (o lote) vencera pronto |

3. Para cada alerta puede ejecutar las siguientes acciones:
   - **Atender** — Marcar la alerta como atendida y registrar la accion tomada.
   - **Descartar** — Ignorar la alerta (no desaparece, solo cambia su estado).
   - **Silenciar** — Ocultar la alerta temporalmente.
4. Haga clic en el nombre del producto para ir directamente a su detalle de inventario.

> **Nota:** Las alertas se generan automaticamente cuando se actualizan los stocks desde el WMS o cuando se acercan las fechas de vencimiento.

---

## 5. Auditoria WMS

El modulo de Auditoria WMS permite verificar y validar las operaciones sincronizadas desde el sistema WMS CenthriX. Se divide en tres tipos de documentos.

### 5.1 Entradas (CO)

Las entradas corresponden a documentos de **recepcion** (tipo CO) del WMS.

**Listado de Entradas:**

1. En el menu lateral, navegue a **"Inventario" > "Entradas"**.
2. Vera una tabla con todas las entradas sincronizadas.
3. Cada entrada muestra: documento, cliente, tipo, lineas verificadas/totales y estado.
4. Los estados posibles son:
   - **Pendiente** (amarillo) — Recibida del WMS, no se ha iniciado la verificacion.
   - **En Proceso** (azul) — Se ha iniciado la verificacion de lineas.
   - **Cerrado** (verde) — Auditoria completada.

**Auditar una Entrada:**

1. Haga clic en una entrada del listado para abrir la pantalla de auditoria.
2. En la parte superior vera un **Stepper de estado** con tres pasos: Pendiente > En Proceso > Cerrado.
3. La pantalla se divide en secciones:

**a) Informacion del Documento:**
- Datos generales: numero de documento, fecha, cliente, tipo de orden.

**b) Lineas del Documento:**
- Tabla con los productos recibidos. Cada linea muestra: codigo, descripcion, cantidad esperada.
- Para verificar una linea:
  1. Haga clic en la linea o en el boton de verificacion.
  2. Ingrese la **cantidad recibida** real.
  3. Si hay diferencia con la cantidad esperada, el sistema lo resaltara.
  4. Si detecta danos, registre los **danos encontrados** con descripcion.
  5. Confirme la verificacion.
- El progreso se muestra como una barra (ejemplo: 5/10 lineas verificadas).

**c) Evidencias:**
- Suba fotografias o documentos como soporte de la recepcion.
- Haga clic en **"Subir Evidencia"** o arrastre archivos a la zona de carga.
- **Limites por tipo de archivo:**
  - **Fotos e imagenes:** Maximo **10 archivos** (JPG, PNG). Tambien se aceptan archivos comprimidos (ZIP, RAR).
  - **Documentos PDF:** Maximo **5 archivos**.
- Las imagenes se comprimen automaticamente al subirlas para optimizar el almacenamiento.
- Los archivos se almacenan en la **nube (Amazon S3)**, por lo que son **persistentes entre deploys** y no se pierden al reiniciar el servidor.
- Puede ver las evidencias ya cargadas y eliminar las que no correspondan.

**c.1) Averias:**
- Al registrar averias en las lineas del documento, se dispone de los siguientes campos:
  - **Descripcion del dano** — Campo de texto para detallar la averia.
  - **Cantidad afectada** (opcional) — Numero de unidades afectadas por el dano.
  - **Foto de evidencia** — Permite adjuntar una imagen de la averia con **vista previa** antes de guardar.
- Cada averia registrada cuenta con un **boton eliminar** para removerla si fue ingresada por error.

**d) Datos Logisticos:**
- Campos adicionales para registrar informacion del transporte:
  - Transportadora, placa del vehiculo, nombre del conductor.
  - Numero de remision, numero de factura.
  - Telefono de contacto, observaciones.

**e) Cerrar Auditoria:**
1. Una vez verificadas todas las lineas, el boton **"Cerrar Auditoria"** se habilitara.
2. Al hacer clic, aparecera un modal de confirmacion.
3. Revise el resumen de la auditoria (lineas verificadas, diferencias, danos).
4. Confirme el cierre. El estado cambiara a **Cerrado**.

> **Nota:** Solo los usuarios con permiso `operaciones: auditar` pueden verificar lineas y cerrar auditorias.

### 5.2 Salidas (PK)

Las salidas corresponden a documentos de **picking/despacho** (tipo PK) del WMS. El flujo es identico al de entradas con las siguientes diferencias:

1. En el menu lateral, navegue a **"Inventario" > "Salidas"**.
2. Las lineas corresponden a productos que salen del almacen.
3. La verificacion se centra en confirmar que los productos despachados coincidan con lo solicitado.
4. Los campos logisticos pueden incluir datos adicionales del destino de la mercancia.
5. El proceso de cierre es el mismo: verificar todas las lineas y confirmar el cierre.

### 5.3 Kardex (CR)

Los movimientos de Kardex corresponden a ajustes y correcciones (tipo CR) del WMS.

1. En el menu lateral, navegue a **"Inventario" > "Kardex"**.
2. Cada documento de kardex tiene un **motivo** asociado (transferencia, ajuste, etc.).
3. Solo se procesan los motivos que esten habilitados en la **Configuracion WMS** (ver seccion 11.1).
4. La auditoria incluye un campo adicional: **Motivo del Kardex** que se muestra de forma destacada.
5. El flujo de verificacion y cierre es el mismo que para entradas y salidas.

> **Nota:** Los documentos del WMS se sincronizan automaticamente (via PUSH desde el WMS o via polling periodico del CRM). No es posible crear documentos de auditoria manualmente.

---

## 6. Vehiculos

### 6.1 Listado de Vehiculos

Para gestionar la flota de vehiculos:

1. En el menu lateral, navegue a **"Viajes" > "Vehiculos"**.
2. Vera el listado completo de vehiculos registrados.

**Funcionalidades:**

- **Buscar:** Filtre vehiculos por placa, marca o modelo.
- **Vista tabla / tarjetas:** Alterne entre vista de tabla y vista de tarjetas con los botones de la esquina superior derecha (iconos de lista y cuadricula).
- **Indicadores de alerta:** Los vehiculos con documentos por vencer o vencidos muestran un icono de alerta.
- **Crear vehiculo:** Boton **"+ Nuevo Vehiculo"** para registrar un nuevo vehiculo.
- **Exportar:** Descargue la lista en formato Excel.

**Tipos de vehiculo disponibles:**

| Tipo | Descripcion |
|------|-------------|
| Sencillo | Camion de un eje de carga |
| Tractomula | Vehiculo articulado con trailer |
| Turbo | Camion turbo de capacidad media |
| Doble Troque | Camion con doble eje trasero |
| Minimula | Articulado de capacidad menor |
| Otro | Otro tipo de vehiculo |

### 6.2 Crear / Editar Vehiculo

El formulario de vehiculo incluye:

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| Placa | Texto | Si | Placa del vehiculo (formato colombiano) |
| Tipo | Seleccion | Si | Sencillo, Tractomula, Turbo, Doble Troque, Minimula, Otro |
| Marca | Texto | No | Marca del vehiculo (Kenworth, Chevrolet, etc.) |
| Modelo | Texto | No | Ano del modelo |
| Capacidad (Ton) | Numero | No | Capacidad de carga en toneladas |
| Conductor Asignado | Seleccion | No | Conductor actualmente asignado al vehiculo |
| Vencimiento SOAT | Fecha | No | Fecha de vencimiento del seguro SOAT |
| Vencimiento Tecnomecanica | Fecha | No | Fecha de vencimiento de la revision tecnomecanica |

**Para crear un vehiculo:**
1. Haga clic en **"+ Nuevo Vehiculo"**.
2. Complete el formulario.
3. Haga clic en **"Guardar"**.

**Para editar un vehiculo:**
1. En el listado, haga clic en el menu de tres puntos del vehiculo deseado.
2. Seleccione **"Editar"**.
3. Modifique los campos necesarios.
4. Haga clic en **"Guardar"**.

### 6.3 Alertas de Documentos

El sistema genera alertas automaticas para los documentos de los vehiculos:

- **SOAT por vencer:** Se muestra una alerta amarilla cuando el SOAT vencera en los proximos 30 dias.
- **SOAT vencido:** Se muestra una alerta roja cuando el SOAT ya vencio.
- **Tecnomecanica por vencer:** Alerta amarilla cuando la tecnomecanica vencera en los proximos 30 dias.
- **Tecnomecanica vencida:** Alerta roja cuando ya vencio.

Estas alertas son visibles en:
- El listado de vehiculos (icono de alerta junto a la placa).
- El Dashboard Financiera (seccion "Alertas Vehiculos").

> **Nota:** Solo los roles **admin**, **supervisor** y **financiera** tienen acceso al modulo de vehiculos.

---

## 7. Viajes

### 7.1 Listado de Viajes

Para gestionar los viajes:

1. En el menu lateral, navegue a **"Viajes" > "Viajes"**.
2. Vera el listado de todos los viajes registrados.

**Funcionalidades:**

- **Buscar:** Filtre viajes por numero, cliente, conductor o destino.
- **Filtros:** Filtre por estado (programado, en curso, completado, cancelado), por fecha o por vehiculo.
- **Vista tabla / tarjetas:** Alterne entre ambas vistas.
- **Crear viaje:** Boton **"+ Nuevo Viaje"**.
- **KPIs:** En la parte superior se muestran indicadores clave como: viajes activos, completados este mes, etc.

> **Nota:** Los conductores solo ven sus propios viajes. Los supervisores y administradores ven todos los viajes.

### 7.2 Crear Viaje

El formulario de creacion de viaje se divide en secciones con iconos:

**Seccion: Informacion General**

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| Fecha | Fecha | Si | Fecha del viaje |
| Vehiculo | Seleccion | Si | Vehiculo asignado. Al seleccionar un vehiculo, el conductor se carga automaticamente |
| Conductor | Automatico | - | Se llena automaticamente al seleccionar el vehiculo |
| Cliente | Seleccion | Si | Cliente asociado al viaje |
| Documento / Referencia | Texto | No | Numero de documento de referencia |

**Seccion: Ruta**

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| Origen | Texto | Si | Ciudad o punto de origen |
| Destino | Texto | Si | Ciudad o punto de destino |

**Seccion: Valores**

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| Valor Flete | Moneda | No | Valor del flete en pesos colombianos |
| Valor Anticipo | Moneda | No | Anticipo entregado al conductor |
| Peso (Ton) | Numero | No | Peso de la carga en toneladas |

**Seccion: Caja Menor (colapsable)**
- Si el conductor tiene una caja menor abierta, se muestra esta seccion.
- Permite asociar el viaje a la caja menor activa.

**Para crear el viaje:**
1. Complete todos los campos obligatorios.
2. Los campos de moneda aceptan formato con separadores de miles (ejemplo: 1.500.000).
3. Haga clic en **"Guardar"**.
4. El sistema creara el viaje y lo redirigira al detalle.

### 7.3 Detalle de Viaje

Al hacer clic en un viaje desde el listado:

1. Se muestra toda la informacion del viaje organizada en secciones.
2. **Informacion General:** Fecha, vehiculo, conductor, cliente, documento, origen, destino, valores.
3. **Gastos Asociados:** Lista de movimientos de caja menor vinculados al viaje con concepto, valor y estado de aprobacion.
4. **Caja Menor:** Si el viaje esta asociado a una caja menor, se muestra un enlace directo a su detalle.
5. Desde el detalle puede **editar** el viaje o cambiar su estado.

**Acciones de estado (solo visibles si el viaje esta en estado Activo):**

- **Boton "Completar":** Marca el viaje como finalizado exitosamente. El estado cambia a **Completado**.
- **Boton "Anular":** Cancela el viaje. Al hacer clic se abrira un dialogo que requiere ingresar un **motivo de anulacion obligatorio**. Sin motivo, la anulacion no se puede confirmar. El estado cambia a **Anulado**.

> **Nota:** Los botones de Completar y Anular solo aparecen cuando el viaje tiene estado **Activo**. Una vez completado o anulado, no se pueden revertir estas acciones.

---

## 8. Cajas Menores

### 8.1 Listado de Cajas Menores

Para gestionar las cajas menores:

1. En el menu lateral, navegue a **"Viajes" > "Cajas Menores"**.
2. Vera el listado de todas las cajas menores.

**KPIs superiores:**

| KPI | Descripcion |
|-----|-------------|
| Abiertas | Cantidad de cajas menores actualmente abiertas |
| Cerradas | Cantidad de cajas cerradas |
| Saldo Total | Suma de saldos de todas las cajas abiertas |

**Funcionalidades:**
- **Buscar:** Filtre cajas por numero o usuario asignado.
- **Filtrar por estado:** Abierta o Cerrada.
- **Crear caja menor:** Boton **"+ Nueva Caja Menor"**.

### 8.2 Crear Caja Menor

Para crear una nueva caja menor:

1. Haga clic en **"+ Nueva Caja Menor"**.
2. Se abrira el formulario con los siguientes campos:

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| Usuario Asignado | Seleccion | Si | Cualquier usuario activo del sistema (conductor, operador, etc.) |
| Caja Anterior | Seleccion | No | Si el usuario tuvo una caja menor previa, puede seleccionarla para heredar el saldo sobrante |
| Saldo Inicial | Moneda | Si | Monto en pesos colombianos para abrir la caja |
| Observaciones | Texto largo | No | Notas sobre el proposito de la caja |

**Saldo heredado:**
- El **Saldo Inicial** se ingresa manualmente. Si selecciona una **Caja Anterior**, el saldo de esa caja se suma como **"Saldo Trasladado"** adicional al saldo inicial.
- Se muestra un indicador visual **"Saldo heredado"** junto al campo para informar que el valor proviene de una caja previa.
- La lista de **Caja Anterior** solo muestra cajas cerradas del mismo usuario seleccionado en **Usuario Asignado**.

3. Haga clic en **"Guardar"**.
4. El sistema generara automaticamente un numero de caja consecutivo.

> **Nota:** Solo los roles **admin**, **supervisor** y **financiera** pueden crear cajas menores.

### 8.3 Detalle de Caja Menor

Al hacer clic en una caja menor desde el listado:

1. Se muestra la pantalla de detalle con la siguiente informacion:

**Tarjetas de Resumen:**
- **Saldo Actual** — Monto disponible en la caja.
- **Total Ingresos** — Suma de todos los ingresos registrados.
- **Total Egresos** — Suma de todos los egresos registrados.

**Pestanas:**
- **Informacion:** Numero de caja, usuario asignado, fecha de apertura, saldo inicial, estado, observaciones.
- **Movimientos:** Lista de todos los ingresos y egresos con: consecutivo, tipo, concepto, valor, estado de aprobacion, fecha.

**Acciones disponibles:**
- **Editar** — Modificar observaciones de la caja.
- **Cerrar** — Cerrar la caja menor (ver seccion 8.4).
- **Nuevo Movimiento** — Agregar un ingreso o egreso desde el detalle.
- **Aprobar / Rechazar** — Para movimientos pendientes (roles autorizados).

**Calculo del saldo:**
```
Saldo Actual = Saldo Inicial + Total Ingresos - Total Egresos
```

> **Nota:** El saldo solo considera los movimientos **aprobados**. Los movimientos pendientes o rechazados no afectan el saldo.

### 8.4 Cerrar Caja

Para cerrar una caja menor:

1. Desde el detalle de la caja, haga clic en el boton **"Cerrar Caja"** (icono de candado).
2. Se mostrara un **modal de cierre** con la siguiente informacion:
   - **Resumen financiero:** Saldo inicial, total ingresos, total egresos y saldo actual calculado.
   - **Opciones para el saldo sobrante:**
     - **Transferir a nueva caja:** El saldo sobrante se conserva y se puede utilizar como saldo inicial al crear la proxima caja menor del usuario (ver seccion 8.2, saldo heredado).
     - **Liquidar a $0:** Se registra la devolucion total del saldo restante. La caja queda con saldo cero.
3. Confirme la accion.
4. La caja cambiara a estado **Cerrada** y no se podran agregar mas movimientos.

> **Nota:** Antes de cerrar una caja, se recomienda revisar que no haya movimientos pendientes de aprobacion.

---

## 9. Movimientos de Caja Menor

### 9.1 Listado de Movimientos

Para ver todos los movimientos:

1. En el menu lateral, navegue a **"Viajes" > "Movimientos"**.
2. Vera el listado general de movimientos de todas las cajas menores.

**KPIs superiores:** Resumen de totales por tipo y estado de aprobacion.

**Filtros disponibles:**

| Filtro | Opciones |
|--------|----------|
| Tipo | Egreso, Ingreso |
| Aprobacion | Pendiente, Aprobado, Rechazado |
| Caja Menor | Seleccionar una caja especifica |

- **Vista tabla / tarjetas:** Alterne entre ambas vistas.
- **Crear movimiento:** Boton **"+ Nuevo Movimiento"**.

### 9.2 Crear Movimiento

Para registrar un nuevo movimiento:

1. Haga clic en **"+ Nuevo Movimiento"** desde el listado o desde el detalle de una caja menor.
2. Complete el formulario:

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| Caja Menor | Seleccion | Si | Seleccione la caja menor asociada |
| Tipo | Seleccion | Si | Egreso o Ingreso |
| Concepto | Seleccion | Si | Categoria del gasto/ingreso (ver tabla abajo) |
| Valor | Moneda | Si | Monto en pesos colombianos |
| Viaje | Seleccion | No | Solo visible si el usuario asignado a la caja es conductor. Permite asociar el gasto a un viaje especifico |
| Descripcion | Texto largo | No | Detalle adicional del movimiento |
| Soporte | Archivo | No | Foto o documento de soporte (factura, recibo, etc.) |

**Conceptos disponibles:**

| Concepto | Descripcion |
|----------|-------------|
| Cuadre de Caja | Ajuste de saldo |
| Descargues | Pago por descargue de mercancia |
| ACPM | Combustible diesel |
| Administracion | Gastos administrativos |
| Alimentacion | Gastos de alimentacion |
| Comisiones | Comisiones pagadas |
| Desencarpe | Retiro de carpa/lona |
| Encarpe | Colocacion de carpa/lona |
| Hospedaje | Alojamiento |
| Peajes | Pago de peajes |
| Ligas | Amarres y ligas para carga |
| Parqueadero | Estacionamiento |
| UREA | Aditivo AdBlue/UREA |
| Seguros | Pagos de seguros |
| Repuestos | Repuestos mecanicos |
| Tecnomecanica | Pago revision tecnomecanica |
| Ingreso Adicional | Ingreso extraordinario |
| Otros | Otros gastos |

3. Haga clic en **"Guardar"**.
4. El movimiento se creara con estado **Pendiente** de aprobacion.

### 9.3 Aprobar / Rechazar

**Aprobacion individual:**

1. Desde el listado de movimientos o el detalle de una caja menor, ubique el movimiento pendiente.
2. Haga clic en el boton **"Aprobar"** (verde) o **"Rechazar"** (rojo).
3. Al aprobar, puede modificar el **valor aprobado** si difiere del valor original solicitado.
4. El movimiento cambiara de estado y el saldo de la caja se actualizara.

**Aprobacion masiva:**

1. En el listado de movimientos, marque los checkboxes de los movimientos que desea aprobar.
2. Haga clic en el boton **"Aprobar (N)"** que aparece en la barra superior.
3. Todos los movimientos seleccionados se aprobaran con su valor original.

> **Nota:** Solo los roles **admin**, **supervisor** y **financiera** pueden aprobar o rechazar movimientos.

### 9.4 Ver Detalle

Para ver el detalle completo de un movimiento:

1. Haga clic en el movimiento desde cualquier listado.
2. Se mostrara la informacion completa en modo lectura:
   - Consecutivo, tipo, concepto, valor, valor aprobado (si aplica).
   - Descripcion, caja menor, viaje asociado.
   - Estado de aprobacion con fecha y usuario que aprobo/rechazo.
   - **Vista previa del soporte:** Si se adjunto una imagen, se muestra directamente. Si es un PDF, se muestra un enlace de descarga.

---

## 10. Reportes

### 10.1 Vista de Reportes

Para acceder al modulo de reportes:

1. En el menu lateral, haga clic en **"Reportes"**.
2. Vera una pantalla con tarjetas de los reportes disponibles, organizados por categoria segun su rol.

**Categorias de reportes:**

| Categoria | Roles que la ven | Reportes incluidos |
|-----------|------------------|--------------------|
| Operativos | Admin, Supervisor, Operador | Inventario, Despachos, Clientes |
| Financieros | Admin, Supervisor, Financiera | Viajes, Cajas Menores, Gastos |
| Cliente | Cliente | Inventario propio, Operaciones propias |

3. Haga clic en la tarjeta del reporte deseado para acceder a el.

### 10.2 Reporte de Operaciones

1. Haga clic en **"Reporte de Operaciones"** desde la pantalla de reportes.
2. **KPIs:** Total operaciones, por estado (pendiente, en proceso, cerrado), por tipo (entrada, salida, kardex).
3. **Filtros:** Rango de fechas, tipo de operacion, estado, cliente.
4. **Tabla de datos:** Lista detallada con documento, cliente, tipo, estado, fecha.
5. **Exportar:** Botones para descargar en Excel o PDF. Puede tambien enviarse por correo electronico.

### 10.3 Reporte de Inventario

1. Haga clic en **"Reporte de Inventario"**.
2. **KPIs:** Total productos, productos con stock bajo, productos agotados.
3. **Filtros:** Cliente, categoria, estado de alerta.
4. **Tabla de datos:** SKU, descripcion, cliente, stock actual, stock minimo, estado.
5. **Exportar:** Excel o PDF con los datos filtrados.

### 10.4 Reporte de Inventario por Ubicacion

1. Haga clic en **"Inventario por Ubicacion"**.
2. Muestra donde esta fisicamente cada estiba en la bodega segun el WMS.
3. **Tabla:** N° Caja, posicion (coordenada de rack), bodega, lote, cantidad.
4. **Exportar:** Excel o PDF.

### 10.5 Reporte de Clientes

1. Haga clic en **"Reporte de Clientes"**.
2. **KPIs:** Total clientes, activos, inactivos.
3. **Tabla de datos:** Razon social, NIT, tipo, sector, estado, total productos en bodega.
4. **Exportar:** Excel o PDF.

### 10.6 Reporte de Averias

1. Haga clic en **"Reporte de Averias"**.
2. **KPIs:** Total averias registradas en el periodo, por tipo.
3. **Filtros:** Rango de fechas, tipo de averia, cliente.
4. **Tabla de datos:** Operacion, cliente, descripcion del dano, cantidad afectada, fecha.
5. **Exportar:** Excel o PDF.

### 10.7 Reporte de Solicitudes

1. Haga clic en **"Reporte de Solicitudes"**.
2. Consolida las solicitudes de ingreso y despacho enviadas por los clientes portal.
3. **Filtros:** Rango de fechas, estado, tipo, cliente.
4. **Exportar:** Excel o PDF.

### 10.8 Reporte de Viajes

1. Haga clic en **"Reporte de Viajes"** desde la pantalla de reportes.
2. En la parte superior se muestran **KPIs** del periodo seleccionado: total viajes, viajes activos, completados, valor total de fletes.
3. Utilice los filtros de fecha (desde/hasta), vehiculo, conductor o cliente para refinar los datos.
4. **Graficos:** Se muestran visualizaciones de viajes por estado, por mes y por destino.
5. **Tabla de datos:** Debajo de los graficos, una tabla detallada con todos los viajes que cumplen los filtros.
6. **Exportar:** Botones para descargar en Excel o PDF.

### 10.9 Reporte de Cajas Menores

1. Haga clic en **"Reporte de Cajas Menores"**.
2. **KPIs:** Total cajas del periodo, saldo total, total ingresos, total egresos.
3. **Filtros:** Rango de fechas, estado de la caja, usuario asignado.
4. **Graficos:** Distribucion de cajas por estado, evolucion de saldos.
5. **Tabla de datos:** Detalle de cada caja menor con sus totales.
6. **Exportar:** Excel o PDF.

### 10.10 Reporte de Gastos

1. Haga clic en **"Reporte de Gastos"**.
2. **KPIs:** Total gastos, total aprobados, total rechazados, promedio por concepto.
3. **Filtros:** Rango de fechas, concepto, estado de aprobacion, caja menor.
4. **Graficos:** Gastos por concepto (barras), distribucion por estado (circular), evolucion mensual (lineas).
5. **Tabla de datos:** Cada movimiento con su detalle completo.
6. **Exportar:** Excel o PDF.

### 10.11 Exportar Excel / CSV

Todos los modulos del sistema permiten exportar datos:

1. Ubique el boton de descarga (icono de flecha hacia abajo o icono de hoja de calculo) en la esquina superior derecha del listado o reporte.
2. Haga clic en el boton.
3. El sistema generara un archivo Excel (.xlsx) o PDF con los datos filtrados actualmente en pantalla.
4. El archivo se descargara automaticamente en su carpeta de descargas.

> **Nota:** Los datos exportados respetan los filtros activos. Si desea exportar todos los registros, asegurese de limpiar los filtros antes de descargar.

### 10.12 Reportes Programados

Los reportes programados permiten recibir reportes automaticos por correo electronico en horarios definidos.

> **Nota:** Esta funcionalidad solo esta disponible para los roles **admin** y **supervisor**.

**Ver reportes programados:**

1. Desde la pantalla de reportes, haga clic en **"Reportes Programados"**.
2. Vera una lista de los reportes automaticos configurados.

**Crear un reporte programado:**

1. Haga clic en **"+ Nuevo Reporte Programado"**.
2. Complete el formulario:

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| Nombre | Texto | Si | Nombre descriptivo del reporte |
| Tipo de Reporte | Seleccion | Si | Operaciones, Inventario, Clientes, Viajes, Cajas Menores, Gastos/Movimientos |
| Formato | Seleccion | Si | Excel o PDF |
| Frecuencia | Seleccion | Si | Predefinida (ver opciones abajo) |
| Destinatarios | Texto | Si | Correos electronicos separados por coma |

**Frecuencias predefinidas:**

| Frecuencia | Horario |
|------------|---------|
| Diario | Todos los dias a las 7:00 AM |
| Semanal (Lunes) | Cada lunes a las 8:00 AM |
| Bisemanal | Lunes y viernes a las 8:00 AM |
| Mensual | Primer dia del mes a las 7:00 AM |
| Quincenal | Dias 1 y 15 de cada mes a las 7:00 AM |

3. Haga clic en **"Guardar"**.

**Acciones sobre reportes programados:**

- **Editar** — Modificar nombre, tipo, formato, frecuencia o destinatarios.
- **Ejecutar ahora** — Generar y enviar el reporte inmediatamente sin esperar al horario programado.
- **Activar / Desactivar** — Pausar o reanudar el envio automatico.
- **Eliminar** — Eliminar el reporte programado permanentemente.

---

## 11. Configuracion WMS (Solo Admin)

Este modulo permite gestionar la integracion con el sistema WMS Centhrix. Solo es accesible para el rol **admin**.

Para acceder:
1. En el menu lateral, navegue a **"Configuracion" > "Configuracion WMS"**.

### 11.1 Motivos de Kardex

Esta seccion define que motivos de kardex son aceptados por el CRM cuando llegan desde el WMS.

1. Vera una lista de motivos con las columnas: Valor WMS, Valor CRM, Requiere Detalle, Descripcion, Estado (activo/inactivo).
2. **Agregar motivo:**
   - Haga clic en **"+ Agregar"**.
   - Ingrese el **Valor WMS** (codigo que envia Centhrix).
   - Ingrese el **Valor CRM** (nombre que se mostrara en el sistema).
   - Indique si **requiere detalle** adicional al auditar.
   - Agregue una **descripcion** opcional.
   - Haga clic en **"Guardar"**.
3. **Editar motivo:** Haga clic en el icono de lapiz para modificar.
4. **Activar / Desactivar:** Haga clic en el toggle para habilitar o deshabilitar un motivo. Los motivos desactivados seran ignorados al recibir kardex del WMS.

> **Nota:** Solo los kardex con motivos activos en esta lista seran procesados por el CRM. Los demas se descartaran silenciosamente.

### 11.2 Tipos de Orden

Define el mapeo de tipos de orden cuando el WMS no envia el campo `tipo_documento`.

1. Vera los mapeos actuales con: Valor WMS, Valor CRM, Tipo Documento, Descripcion.
2. Los tipos de documento son:
   - **CO** — Recepcion (Entrada).
   - **PK** — Picking (Salida).
3. **Agregar mapeo:** Haga clic en **"+ Agregar"** y complete los campos.
4. **Editar / Eliminar:** Use los iconos correspondientes en cada fila.

### 11.3 Estados Validos

Configura que estados del WMS activan el procesamiento de ordenes en el CRM.

1. Vera la lista de estados validos con: Valor WMS, Valor CRM, Descripcion.
2. Solo las ordenes con estados que aparezcan en esta lista seran aceptadas y creadas en el CRM.
3. **Agregar estado:** Haga clic en **"+ Agregar"** y defina el valor WMS, valor CRM y descripcion.
4. **Editar / Eliminar:** Use los iconos de cada fila.

> **Nota:** Modificar estos valores afecta directamente la sincronizacion. Consulte con el equipo de TI antes de realizar cambios.

---

## 12. Administracion (Solo Admin)

### 12.1 Usuarios

Para gestionar los usuarios del sistema:

1. En el menu lateral, navegue a **"Administracion" > "Usuarios"**.
2. Vera el listado de todos los usuarios del sistema.

**Funcionalidades del listado:**

- **Buscar:** Filtre usuarios por nombre, correo o username.
- **Filtrar por rol:** Seleccione un rol para ver solo los usuarios de ese tipo.
- **Filtrar por estado:** Activo o Inactivo.
- **Paginacion:** Navegue entre paginas con los controles inferiores.

**Crear un usuario:**

1. Haga clic en **"+ Nuevo Usuario"**.
2. Complete el formulario:

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| Nombre | Texto | Si | Primer nombre |
| Apellido | Texto | Si | Apellido |
| Username | Texto | Si | Nombre de usuario para iniciar sesion |
| Email | Correo | Si | Correo electronico |
| Telefono | Texto | No | Numero de contacto |
| Rol | Seleccion | Si | Admin, Supervisor, Financiera, Operador, Conductor, Cliente |
| Contrasena | Contrasena | Si | Contrasena temporal (minimo 6 caracteres) |

3. Haga clic en **"Guardar"**.
4. El usuario recibira sus credenciales y debera cambiar la contrasena en su primer acceso.

**Acciones por usuario (menu de tres puntos):**

| Accion | Descripcion |
|--------|-------------|
| Ver | Ver el detalle del usuario |
| Editar | Modificar datos del usuario |
| Permisos | Ver y gestionar permisos especificos del usuario |
| Activar / Desactivar | Habilitar o deshabilitar el acceso del usuario |
| Resetear Contrasena | Generar una nueva contrasena temporal. Opcion de enviar por correo |
| Enviar Credenciales | Re-enviar las credenciales de acceso al correo del usuario |
| Eliminar | Eliminar el usuario permanentemente |

> **Nota:** No es posible eliminar su propia cuenta ni desactivar al ultimo administrador del sistema.

### 12.2 Roles y Permisos

Para ver la estructura de roles y permisos:

1. En el menu lateral, navegue a **"Administracion" > "Roles"**.
2. Vera una lista de los roles del sistema con su nivel jerarquico.

**Jerarquia de roles:**

| Rol | Nivel | Descripcion |
|-----|-------|-------------|
| Admin | 100 | Acceso total al sistema. Permiso comodin (*) |
| Supervisor | 75 | Operaciones y reportes |
| Financiera | 60 | Vehiculos, viajes, cajas menores, aprobaciones |
| Operador | 50 | Operaciones de almacen e inventario |
| Conductor | 30 | Viajes, gastos, vehiculos propios |
| Cliente | 10 | Portal filtrado por su empresa |

3. Haga clic en un rol para ver sus permisos organizados por modulo.
4. Cada modulo tiene acciones especificas: `ver`, `crear`, `editar`, `eliminar`, `auditar`, `aprobar`, etc.
5. Los permisos se asignan a nivel de rol. Para excepciones individuales, use la opcion **"Permisos"** del usuario.

### 12.3 Sesiones Activas

Para monitorear las sesiones del sistema:

1. En el menu lateral, navegue a **"Administracion" > "Sesiones Activas"**.
2. Vera una lista de todos los usuarios actualmente conectados.
3. Cada sesion muestra: nombre del usuario, rol, IP de conexion, navegador, hora de inicio.
4. **Forzar cierre:** Haga clic en el boton de cerrar sesion junto a un usuario para desconectarlo inmediatamente.

> **Nota:** Forzar el cierre de sesion es util cuando se sospecha de un acceso no autorizado o cuando se necesita aplicar cambios de permisos de inmediato.

---

## 13. Perfil y Configuracion

### 13.1 Datos Personales

Para ver y editar su perfil:

1. Haga clic en su avatar o nombre en la esquina superior derecha de la barra de navegacion.
2. Seleccione **"Mi Perfil"**.
3. Vera su informacion personal organizada en tarjetas:
   - **Avatar:** Su foto de perfil. Para cambiarla, haga clic en el icono de camara sobre la imagen.
   - **Datos basicos:** Nombre, apellido, email, telefono, cargo, departamento.
   - **Informacion del sistema:** Username, rol, estado, fecha de creacion, ultimo acceso.

**Editar datos personales:**

1. Haga clic en el boton **"Editar Perfil"**.
2. Se abrira un modal con los campos editables:

| Campo | Editable | Descripcion |
|-------|----------|-------------|
| Nombre | Si | Primer nombre |
| Apellido | Si | Apellido |
| Telefono | Si | Numero de contacto |
| Cargo | Si | Cargo dentro de la empresa |
| Departamento | Si | Area o departamento |
| Email | No | Solo lo puede cambiar un administrador |
| Username | No | No se puede modificar |
| Rol | No | Solo lo puede cambiar un administrador |

3. Modifique los campos deseados.
4. Haga clic en **"Guardar"**.

**Cambiar avatar:**

1. Haga clic en el icono de camara sobre su foto de perfil.
2. Seleccione una imagen desde su computador (formatos: JPG, PNG).
3. La imagen se subira automaticamente y se actualizara en todo el sistema.

> **Nota:** Las fotos de perfil se almacenan en la nube (Amazon S3). Se recomienda usar imagenes de tamano menor a 2 MB.

### 13.2 Cambiar Contrasena

Para cambiar su contrasena:

1. Desde su perfil, haga clic en el boton **"Cambiar Contrasena"** (icono de llave).
2. Se abrira un modal con tres campos:

| Campo | Descripcion |
|-------|-------------|
| Contrasena Actual | Ingrese su contrasena vigente |
| Nueva Contrasena | Ingrese la nueva contrasena (minimo 6 caracteres) |
| Confirmar Contrasena | Repita la nueva contrasena |

3. El sistema mostrara un indicador de seguridad de la nueva contrasena.
4. Haga clic en **"Guardar"**.
5. Su sesion se mantendra activa con la nueva contrasena.

### 13.3 Preferencias

Para ajustar las preferencias del sistema:

1. Haga clic en su avatar y seleccione **"Configuracion"**, o navegue a **"Perfil" > "Configuracion"**.
2. Las opciones disponibles son:

**Tema de la interfaz:**
- **Claro:** Fondo blanco con textos oscuros.
- **Oscuro:** Fondo oscuro con textos claros, ideal para uso nocturno o ambientes con poca luz.
- Haga clic en el toggle para alternar entre temas. La preferencia se guarda automaticamente.

**Notificaciones:**
- **Sonido de notificaciones:** Active o desactive el sonido al recibir notificaciones en tiempo real.
- **Notificaciones de escritorio:** Permita al navegador mostrar notificaciones emergentes.

> **Nota:** El tema seleccionado se guarda en las preferencias de su usuario y se mantiene al cerrar sesion.

---

## 14. Notificaciones

### 14.1 Panel de Notificaciones

El sistema envia notificaciones en tiempo real a traves de WebSockets.

**Acceder a las notificaciones:**

1. En la barra superior, ubique el icono de campana.
2. Si tiene notificaciones no leidas, vera un badge rojo con el numero de notificaciones pendientes.
3. Haga clic en la campana para abrir el panel desplegable con las notificaciones mas recientes.
4. Para ver todas las notificaciones, haga clic en **"Ver todas"** al final del desplegable, o navegue a **"Perfil" > "Notificaciones"**.

**Pantalla completa de notificaciones:**

1. Vera el listado completo de notificaciones con paginacion (20 por pagina).
2. **Filtros disponibles:**

| Filtro | Opciones |
|--------|----------|
| Todas | Muestra todas las notificaciones |
| No leidas | Solo las que no han sido marcadas como leidas |
| Despachos | Notificaciones relacionadas con despachos |
| Alertas | Alertas del sistema (inventario, vehiculos) |
| Clientes | Notificaciones de clientes |
| Reportes | Notificaciones de reportes generados |
| Sistema | Notificaciones generales del sistema |
| Inventario | Notificaciones de inventario |

3. **Buscar:** Use la barra de busqueda para filtrar por texto.

**Acciones sobre notificaciones:**

| Accion | Descripcion |
|--------|-------------|
| Marcar como leida | Haga clic en la notificacion o en el icono de check |
| Marcar todas como leidas | Boton "Marcar todas" en la parte superior |
| Eliminar | Boton de papelera en cada notificacion |
| Ver detalle | Haga clic en la notificacion para ir al recurso relacionado |

**Prioridades:**

| Prioridad | Indicador | Descripcion |
|-----------|-----------|-------------|
| Urgente | Badge rojo | Requiere atencion inmediata |
| Alta | Badge naranja | Importante pero no critica |
| Normal | Badge gris | Informativa |
| Baja | Badge gris claro | Informacion secundaria |

### 14.2 Tipos de Notificaciones

El sistema genera notificaciones automaticas en los siguientes eventos:

**Sincronizacion WMS:**
- Nueva entrada (CO) recibida del WMS.
- Nueva salida (PK) recibida del WMS.
- Nuevo kardex (CR) recibido del WMS.
- Error de sincronizacion con Centhrix.

**Aprobaciones:**
- Movimiento de caja menor pendiente de aprobacion (notifica a financiera/admin).
- Movimiento aprobado (notifica al solicitante).
- Movimiento rechazado (notifica al solicitante).

**Cierres:**
- Auditoria de entrada/salida cerrada.
- Caja menor cerrada.

**Alertas:**
- Producto con stock agotado.
- Producto con stock bajo.
- Producto por vencer.
- SOAT por vencer o vencido.
- Tecnomecanica por vencer o vencida.

**Reportes:**
- Reporte programado generado y enviado exitosamente.
- Error al generar reporte programado.

**Sistema:**
- Bienvenida al nuevo usuario.
- Contrasena restablecida.
- Sesion forzada a cerrar por un administrador.

---

## 15. Almacenamiento de Archivos (Amazon S3)

El sistema CRM CenthriX utiliza **Amazon S3** como servicio de almacenamiento en la nube para todos los archivos subidos por los usuarios.

**Caracteristicas principales:**

- **Almacenamiento en la nube:** Todos los archivos (fotos, PDFs, documentos, evidencias, avatares) se almacenan en Amazon S3, no en el servidor local.
- **Acceso seguro:** Los archivos son privados. El sistema genera enlaces temporales de acceso (validos por 15 minutos) cada vez que necesita mostrar un archivo. Esto garantiza que solo usuarios autorizados puedan verlos.
- **Persistencia entre redesploys:** Los archivos **no se pierden** cuando el servidor se reinicia o se realiza un nuevo despliegue (deploy). Los archivos en S3 son permanentes.
- **Disponibilidad continua:** No se pierden archivos al reiniciar el sistema.

**Tipos de archivos soportados:**

| Tipo | Formatos | Uso tipico |
|------|----------|------------|
| Imagenes | JPG, PNG | Evidencias de auditoria, fotos de averias, avatares de usuario |
| Documentos | PDF | Soportes documentales, facturas, remisiones |
| Comprimidos | ZIP, RAR | Paquetes de evidencias multiples |

> **Nota:** Los limites de archivos por seccion se indican en cada modulo. Por ejemplo, en Auditoria WMS se permiten maximo 10 fotos y 5 PDFs por documento.

---

## 16. Solicitudes del Cliente (Portal)

Los usuarios con rol **cliente** pueden enviar solicitudes de servicio directamente desde el portal.

### 16.1 Tipos de Solicitud

| Tipo | Descripcion |
|------|-------------|
| **Aviso de Ingreso** | Notifica a ISTHO que llegara mercancia para almacenar. Permite adjuntar documentos de referencia |
| **Solicitud de Despacho** | Solicita el despacho de mercancia desde la bodega. Incluye destino y productos a despachar |

### 16.2 Crear una Solicitud

1. En el menu lateral, haga clic en **"Solicitudes"**.
2. Haga clic en **"+ Nueva Solicitud"**.
3. Seleccione el tipo: **Aviso de Ingreso** o **Solicitud de Despacho**.
4. Complete los campos del formulario segun el tipo seleccionado.
5. Adjunte los documentos de soporte si los tiene (PDF, imágenes, ZIP).
6. Haga clic en **"Enviar"**.

El equipo de ISTHO recibira la solicitud y podra agregar comentarios o cambiar el estado.

### 16.3 Seguimiento de Solicitudes

Desde la pantalla de **Solicitudes** puede:
- Ver el listado de todas sus solicitudes con estado actual.
- Filtrar por tipo, estado o rango de fechas.
- Hacer clic en una solicitud para ver el detalle, comentarios del equipo ISTHO y documentos adjuntos.

**Estados posibles:**

| Estado | Descripcion |
|--------|-------------|
| Pendiente | Recibida, sin respuesta del equipo aun |
| En revision | ISTHO esta procesando la solicitud |
| Aprobada | La solicitud fue aceptada |
| Rechazada | La solicitud fue rechazada (con motivo en comentarios) |
| Completada | La operacion fue realizada |

---

## 17. Portal Cliente

El **Portal Cliente** es un acceso especial del sistema CenthriX destinado exclusivamente a los clientes de ISTHO S.A.S. Permite consultar información propia en tiempo real sin acceso a datos de otros clientes.

### 16.1 Acceso y Credenciales

Un administrador del sistema crea las credenciales del portal y las envía al representante del cliente por correo electronico. Al primer inicio de sesion, el sistema solicitara cambiar la contrasena.

### 16.2 Identificacion en el Sistema

Al iniciar sesion como cliente portal, el encabezado del sistema muestra:

- **Badge "Portal Cliente"** junto al nombre del sistema con el logo y nombre de su empresa.
- Este badge es **clickeable** y lleva directamente al detalle de su empresa.
- El menu de navegacion muestra unicamente las opciones disponibles para el perfil cliente.

### 16.3 Funciones Disponibles

| Modulo | Que puede hacer |
|--------|----------------|
| Mi Empresa | Ver información general, contactos e historial de operaciones de su empresa |
| Inventario | Consultar productos propios en bodega con cantidades y ubicaciones |
| Operaciones | Ver entradas (CO), salidas (PK) y kardex (CR) de sus operaciones |
| Reportes | Visualizar reportes de sus operaciones |
| Configuracion | Gestionar preferencias personales (idioma, zona horaria, tema, notificaciones) |

### 16.4 Restricciones

- No puede ver informacion de otros clientes.
- No puede crear, editar ni eliminar operaciones o inventario.
- No puede acceder a modulos de administracion, viajes, cajas menores ni vehiculos.
- Al ingresar a la seccion "Clientes", el sistema lo redirige automaticamente al detalle de su propia empresa.

### 16.5 Ver Mi Empresa

Desde la pantalla de detalle de su empresa puede consultar:

1. **Informacion General** — Razon social, NIT, direccion, tipo, sector y estado del cliente.
2. **Contactos** — Personas de contacto registradas, con opcion de filtrar por tipo de notificacion.
3. **Historial** — Registro de operaciones cerradas con fecha y nombre del responsable del cierre.

---

## Glosario

| Termino | Definicion |
|---------|-----------|
| WMS | Warehouse Management System (Sistema de Gestion de Almacen). En ISTHO se usa el WMS CenthriX |
| CO | Codigo de documento de recepcion (entrada) en el WMS |
| PK | Codigo de documento de picking (salida/despacho) en el WMS |
| CR | Codigo de documento de kardex (ajuste/correccion) en el WMS |
| Caja Menor | Fondo de efectivo asignado a un usuario para gastos operativos |
| Kardex | Registro de movimientos de inventario (entradas, salidas, ajustes) |
| SOAT | Seguro Obligatorio de Accidentes de Transito |
| Tecnomecanica | Revision tecnico-mecanica y de emisiones contaminantes del vehiculo |
| NIT | Numero de Identificacion Tributaria |
| KPI | Key Performance Indicator (Indicador Clave de Desempeno) |

---

## Soporte Tecnico

Si tiene preguntas o inconvenientes con el sistema, puede contactar al equipo de TI:

- **Correo:** soporte@istho.com.co
- **Ubicacion:** Centro Logistico Industrial del Norte, Girardota, Antioquia
- **Horario de atencion:** Lunes a Viernes, 7:00 AM - 5:00 PM

---

*ISTHO S.A.S. - ISO 9001:2015*
*Documento actualizado: Junio 2026*
*CRM CenthriX v1.3.0*
