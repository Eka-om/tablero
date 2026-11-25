// URL de la API. La levanta json-server cuando corres `npm run api`.
const API_URL = 'http://localhost:3000/tickets';

// Estado de la aplicación: la lista de tickets tal como la conoce el navegador.
// La pantalla siempre se dibuja a partir de este arreglo.
let tickets = [];

// Textos para personas y colores (clases completas, nunca armadas por pedazos)
const ESTADOS = {
  abierto: {
    etiqueta: 'Abierto',
    clases: 'bg-sky-100 text-sky-800',
    siguiente: 'en_progreso',
    textoBoton: 'Empezar',
  },
  en_progreso: {
    etiqueta: 'En progreso',
    clases: 'bg-amber-100 text-amber-800',
    siguiente: 'resuelto',
    textoBoton: 'Marcar resuelto',
  },
  resuelto: {
    etiqueta: 'Resuelto',
    clases: 'bg-emerald-100 text-emerald-800',
    siguiente: null,
    textoBoton: null,
  },
};

const PRIORIDADES = {
  baja: { etiqueta: 'Prioridad baja', clases: 'bg-slate-100 text-slate-700', borde: 'border-t-slate-300' },
  media: { etiqueta: 'Prioridad media', clases: 'bg-yellow-100 text-yellow-800', borde: 'border-t-amber-400' },
  alta: { etiqueta: 'Prioridad alta', clases: 'bg-red-100 text-red-800', borde: 'border-t-red-500' },
};

const CATEGORIAS = {
  hardware: 'Hardware',
  software: 'Software',
  red: 'Red',
  accesos: 'Accesos',
};

// Elementos de la página
const listaTickets = document.getElementById('lista-tickets');
const mensaje = document.getElementById('mensaje');

// ---------- Mensajes ----------
function mostrarMensaje(texto, clases) {
  mensaje.textContent = texto;
  mensaje.className = 'mt-4 rounded p-3 ' + clases;
}

function ocultarMensaje() {
  mensaje.textContent = '';
  mensaje.className = 'hidden';
}

// ---------- Dibujar ----------
// Crea un elemento con clases y texto. Usa textContent (no innerHTML)
// para que lo que escriba el usuario nunca se interprete como HTML.
function crearElemento(etiqueta, clases, texto) {
  const elemento = document.createElement(etiqueta);
  elemento.className = clases;
  elemento.textContent = texto;
  return elemento;
}

function crearTarjeta(ticket) {
  const estado = ESTADOS[ticket.estado];

  const tarjeta = document.createElement('article');
  // Los resueltos se ven apagados; los demás llevan una franja de color según la prioridad
  tarjeta.className =
    ticket.estado === 'resuelto'
      ? 'rounded-2xl border border-slate-200 bg-slate-100 p-5 opacity-70'
      : 'rounded-2xl border border-slate-200 border-t-4 bg-white p-5 shadow-md transition hover:-translate-y-1 hover:shadow-lg ' +
        PRIORIDADES[ticket.prioridad].borde;

  tarjeta.append(
    crearElemento('p', 'text-sm text-slate-500', '#' + ticket.id),
    crearElemento('h3', 'text-lg font-semibold', ticket.titulo),
    crearElemento('p', 'mt-1 text-slate-700', ticket.descripcion),
    crearElemento('p', 'mt-2 text-sm', 'Solicitante: ' + ticket.solicitante),
    crearElemento('p', 'text-sm', 'Categoría: ' + CATEGORIAS[ticket.categoria])
  );

  const etiquetas = document.createElement('div');
  etiquetas.className = 'mt-3 flex flex-wrap gap-2';
  etiquetas.append(
    crearElemento(
      'span',
      'rounded-full px-3 py-1 text-xs font-medium ' + PRIORIDADES[ticket.prioridad].clases,
      PRIORIDADES[ticket.prioridad].etiqueta
    ),
    crearElemento(
      'span',
      'rounded-full px-3 py-1 text-xs font-medium ' + estado.clases,
      estado.etiqueta
    )
  );
  tarjeta.append(etiquetas);

  const botones = document.createElement('div');
  botones.className = 'mt-4 flex flex-wrap gap-2';

  if (estado.siguiente !== null) {
    const botonAvanzar = crearElemento(
      'button',
      'rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700',
      estado.textoBoton
    );
    botonAvanzar.type = 'button';
    botonAvanzar.addEventListener('click', () => cambiarEstado(ticket));
    botones.append(botonAvanzar);
  }

  const botonEditar = crearElemento(
    'button',
    'rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium hover:bg-slate-100',
    'Editar'
  );
  botonEditar.type = 'button';
  botonEditar.addEventListener('click', () => entrarModoEdicion(ticket));
  botones.append(botonEditar);

  const botonEliminar = crearElemento(
    'button',
    'rounded-full border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50',
    'Eliminar'
  );
  botonEliminar.type = 'button';
  botonEliminar.addEventListener('click', () => eliminarTicket(ticket));
  botones.append(botonEliminar);

  tarjeta.append(botones);
  return tarjeta;
}

// Borra la lista y la vuelve a dibujar a partir del arreglo `tickets`
// ---------- Filtros y resumen ----------
const filtroEstado = document.getElementById('filtro-estado');
const campoBusqueda = document.getElementById('busqueda');
const resumen = document.getElementById('resumen');

// Devuelve solo los tickets que pasan los dos filtros a la vez
function ticketsFiltrados() {
  const estadoElegido = filtroEstado.value;
  const texto = campoBusqueda.value.trim().toLowerCase();

  return tickets.filter((ticket) => {
    const coincideEstado = estadoElegido === 'todos' || ticket.estado === estadoElegido;
    const coincideTexto = ticket.titulo.toLowerCase().includes(texto);
    return coincideEstado && coincideTexto;
  });
}

// Cuenta TODOS los tickets (sin importar el filtro)
function pintarResumen() {
  const porEstado = tickets.reduce(
    (conteo, ticket) => {
      conteo[ticket.estado] += 1;
      return conteo;
    },
    { abierto: 0, en_progreso: 0, resuelto: 0 }
  );

  const altaSinResolver = tickets.filter(
    (ticket) => ticket.prioridad === 'alta' && ticket.estado !== 'resuelto'
  ).length;

  resumen.innerHTML = '';
  resumen.className = 'mt-2 flex flex-wrap gap-2 text-sm';

  Object.keys(ESTADOS).forEach((estado) => {
    resumen.append(
      crearElemento(
        'span',
        'rounded px-2 py-1 font-medium ' + ESTADOS[estado].clases,
        ESTADOS[estado].etiqueta + ': ' + porEstado[estado]
      )
    );
  });

  resumen.append(
    crearElemento(
      'span',
      'rounded px-2 py-1 font-medium ' + PRIORIDADES.alta.clases,
      'Prioridad alta sin resolver: ' + altaSinResolver
    )
  );
}

// Borra la lista y la vuelve a dibujar a partir del arreglo `tickets`
function pintar() {
  pintarResumen();
  listaTickets.innerHTML = '';

  if (tickets.length === 0) {
    mostrarMensaje(
      'Todavía no hay tickets. ¡Crea el primero con el formulario!',
      'bg-slate-100 text-slate-700'
    );
    return;
  }

  const visibles = ticketsFiltrados();

  if (visibles.length === 0) {
    mostrarMensaje(
      'Ningún ticket coincide con tu búsqueda o filtro.',
      'bg-slate-100 text-slate-700'
    );
    return;
  }

  ocultarMensaje();
  visibles.forEach((ticket) => {
    listaTickets.append(crearTarjeta(ticket));
  });
}

// El select avisa con `change`; la caja de búsqueda con `input` (mientras escribes)
filtroEstado.addEventListener('change', pintar);
campoBusqueda.addEventListener('input', pintar);

// ---------- API ----------
async function cargarTickets() {
  mostrarMensaje('Cargando tickets...', 'bg-sky-100 text-sky-800');

  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) {
      throw new Error('El servidor respondió con el código ' + respuesta.status);
    }
    tickets = await respuesta.json();
    pintar();
  } catch (error) {
    listaTickets.innerHTML = '';
    mostrarMensaje(
      'No se pudieron cargar los tickets. Revisa que la API esté corriendo (npm run api) y recarga la página.',
      'bg-red-100 text-red-800'
    );
    console.error(error);
  }
}

async function cambiarEstado(ticket) {
  const siguiente = ESTADOS[ticket.estado].siguiente;

  try {
    const respuesta = await fetch(API_URL + '/' + ticket.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: siguiente }),
    });
    if (!respuesta.ok) {
      throw new Error('El servidor respondió con el código ' + respuesta.status);
    }
    const ticketActualizado = await respuesta.json();
    tickets = tickets.map((t) => (t.id === ticketActualizado.id ? ticketActualizado : t));
    pintar();
  } catch (error) {
    mostrarMensaje(
      'No se pudo cambiar el estado del ticket. Intenta de nuevo.',
      'bg-red-100 text-red-800'
    );
    console.error(error);
  }
}

async function eliminarTicket(ticket) {
  const confirmado = confirm('¿Seguro que quieres eliminar el ticket #' + ticket.id + '?');
  if (!confirmado) return;

  try {
    const respuesta = await fetch(API_URL + '/' + ticket.id, { method: 'DELETE' });
    if (!respuesta.ok) {
      throw new Error('El servidor respondió con el código ' + respuesta.status);
    }

    tickets = tickets.filter((t) => t.id !== ticket.id);

    // Si el ticket eliminado era el que estaba en el formulario, volver a modo crear
    if (idEnEdicion === ticket.id) {
      salirModoEdicion();
    }

    pintar();
  } catch (error) {
    mostrarMensaje(
      'No se pudo eliminar el ticket. Intenta de nuevo.',
      'bg-red-100 text-red-800'
    );
    console.error(error);
  }
}

// ---------- Formulario ----------
const formulario = document.getElementById('form-ticket');
const campoTitulo = document.getElementById('titulo');
const campoDescripcion = document.getElementById('descripcion');
const campoSolicitante = document.getElementById('solicitante');
const campoCategoria = document.getElementById('categoria');
const campoPrioridad = document.getElementById('prioridad');
const errorTitulo = document.getElementById('error-titulo');
const errorSolicitante = document.getElementById('error-solicitante');

// Cada validador muestra o quita su error y devuelve true si el dato está bien
function validarTitulo() {
  if (campoTitulo.value.trim().length < 5) {
    errorTitulo.textContent = 'El título debe tener al menos 5 caracteres.';
    return false;
  }
  errorTitulo.textContent = '';
  return true;
}

function validarSolicitante() {
  if (campoSolicitante.value.trim() === '') {
    errorSolicitante.textContent = 'Escribe el nombre del solicitante.';
    return false;
  }
  errorSolicitante.textContent = '';
  return true;
}


const tituloFormulario = document.getElementById('titulo-formulario');
const botonGuardar = document.getElementById('btn-guardar');
const botonCancelar = document.getElementById('btn-cancelar');

// null = creando un ticket nuevo; un número = editando el ticket con ese id
let idEnEdicion = null;

function entrarModoEdicion(ticket) {
  idEnEdicion = ticket.id;

  campoTitulo.value = ticket.titulo;
  campoDescripcion.value = ticket.descripcion;
  campoSolicitante.value = ticket.solicitante;
  campoCategoria.value = ticket.categoria;
  campoPrioridad.value = ticket.prioridad;
  errorTitulo.textContent = '';
  errorSolicitante.textContent = '';

  tituloFormulario.textContent = 'Editar ticket #' + ticket.id;
  botonGuardar.textContent = 'Guardar cambios';
  botonCancelar.hidden = false;
  campoTitulo.focus();
}

function salirModoEdicion() {
  idEnEdicion = null;

  formulario.reset();
  errorTitulo.textContent = '';
  errorSolicitante.textContent = '';

  tituloFormulario.textContent = 'Nuevo ticket';
  botonGuardar.textContent = 'Crear ticket';
  botonCancelar.hidden = true;
}

botonCancelar.addEventListener('click', salirModoEdicion);

async function actualizarTicket(ticketCompleto) {
  const respuesta = await fetch(API_URL + '/' + ticketCompleto.id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticketCompleto),
  });
  if (!respuesta.ok) {
    throw new Error('El servidor respondió con el código ' + respuesta.status);
  }
  return respuesta.json();
}


// Si el campo ya mostraba un error, se vuelve a revisar mientras la persona corrige
campoTitulo.addEventListener('input', () => {
  if (errorTitulo.textContent !== '') validarTitulo();
});
campoSolicitante.addEventListener('input', () => {
  if (errorSolicitante.textContent !== '') validarSolicitante();
});

async function crearTicket(datos) {
  const respuesta = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!respuesta.ok) {
    throw new Error('El servidor respondió con el código ' + respuesta.status);
  }
  return respuesta.json();
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const tituloValido = validarTitulo();
  const solicitanteValido = validarSolicitante();
  if (!tituloValido || !solicitanteValido) return;

  // Los campos que sí tiene el formulario
  const datos = {
    titulo: campoTitulo.value.trim(),
    descripcion: campoDescripcion.value.trim(),
    solicitante: campoSolicitante.value.trim(),
    categoria: campoCategoria.value,
    prioridad: campoPrioridad.value,
  };

  try {
    if (idEnEdicion === null) {
      // Modo crear (POST)
      const ticketCreado = await crearTicket({ ...datos, estado: 'abierto' });
      tickets.push(ticketCreado);
    } else {
      // Modo editar (PUT): se envía el ticket COMPLETO
      const original = tickets.find((t) => t.id === idEnEdicion);
      const ticketActualizado = await actualizarTicket({ ...original, ...datos });
      tickets = tickets.map((t) => (t.id === ticketActualizado.id ? ticketActualizado : t));
    }

    pintar();
    salirModoEdicion();
  } catch (error) {
    mostrarMensaje(
      'No se pudo guardar el ticket. Intenta de nuevo en un momento.',
      'bg-red-100 text-red-800'
    );
    console.error(error);
  }
});




// ---------- Arranque ----------
ocultarMensaje();
cargarTickets();
