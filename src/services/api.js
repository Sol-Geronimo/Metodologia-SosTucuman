import axios from "axios";
import { estaDentroDeSMT, calcularDistanciaMetros } from "../utils/geoUtils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const ESTADOS_FLUJO = [
  "Reportado",
  "En revisión",
  "En reparación",
  "Resuelto",
];

// ============================================================================
// REPOSITORIOS (Patrón GRASP: Experto en Información / Bajo Acoplamiento)
// ============================================================================
export const RepositorioUsuario = {
  async buscarPorEmail(email) {
    const res = await axios.get(
      `${API_URL}/usuarios?email=${encodeURIComponent(email.trim())}`
    );
    return res.data[0] || null;
  },

  async crear(usuario) {
    const res = await axios.post(`${API_URL}/usuarios`, usuario);
    return res.data;
  },
};

export const RepositorioIncidente = {
  async obtenerTodos() {
    const res = await axios.get(`${API_URL}/reportes`);
    return res.data.slice().reverse();
  },

  async obtenerPorId(id) {
    const res = await axios.get(`${API_URL}/reportes/${id}`);
    return res.data;
  },

  async buscarEnRadio(latitud, longitud, categoria, radioMetros = 20) {
    const todos = await this.obtenerTodos();
    return todos.filter((inc) => {
      if (inc.estado === "Resuelto") return false;
      if (inc.categoria !== categoria) return false;
      if (inc.latitud == null || inc.longitud == null) return false;
      const dist = calcularDistanciaMetros(
        latitud,
        longitud,
        Number(inc.latitud),
        Number(inc.longitud)
      );
      return dist <= radioMetros;
    });
  },

  async guardar(incidente) {
    const res = await axios.post(`${API_URL}/reportes`, incidente);
    return res.data;
  },

  async actualizar(id, campos) {
    const res = await axios.patch(`${API_URL}/reportes/${id}`, campos);
    return res.data;
  },
};

export const RepositorioValidacion = {
  async verificarExistencia(usuarioEmail, idIncidente) {
    const res = await axios.get(
      `${API_URL}/validaciones?usuarioEmail=${encodeURIComponent(
        usuarioEmail
      )}&id_incidente=${encodeURIComponent(idIncidente)}`
    );
    return res.data.length > 0;
  },

  async obtenerPorIncidente(idIncidente) {
    const res = await axios.get(
      `${API_URL}/validaciones?id_incidente=${encodeURIComponent(idIncidente)}`
    );
    return res.data;
  },

  async guardar(validacion) {
    const res = await axios.post(`${API_URL}/validaciones`, validacion);
    return res.data;
  },
};

export const RepositorioHistorial = {
  async obtenerPorIncidente(idIncidente) {
    const res = await axios.get(
      `${API_URL}/historialEstados?id_incidente=${encodeURIComponent(
        idIncidente
      )}`
    );
    return res.data;
  },

  async guardar(registro) {
    const res = await axios.post(`${API_URL}/historialEstados`, registro);
    return res.data;
  },
};

// ============================================================================
// CONTROLADORES DE APLICACIÓN (Patrón GRASP: Controlador y Creador)
// ============================================================================
export const ControladorAutenticacion = {
  guardarSesion(usuario) {
    const sesion = {
      token: `jwt-sostucuman-${usuario.id}-${Date.now()}`,
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol || "vecino",
    };
    localStorage.setItem("sostucumanSesion", JSON.stringify(sesion));
    localStorage.setItem("sostucumanNombre", sesion.nombre);
    localStorage.setItem("sostucumanEmail", sesion.email);
    localStorage.setItem("sostucumanRol", sesion.rol);
    window.dispatchEvent(new Event("usuarioActualizado"));
    return sesion;
  },

  obtenerSesionActual() {
    const raw = localStorage.getItem("sostucumanSesion");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // Fallback a claves individuales
      }
    }
    const nombre = localStorage.getItem("sostucumanNombre");
    const email = localStorage.getItem("sostucumanEmail");
    const rol = localStorage.getItem("sostucumanRol") || "vecino";
    if (nombre && email) {
      return { nombre, email, rol };
    }
    return null;
  },

  cerrarSesion() {
    localStorage.removeItem("sostucumanSesion");
    localStorage.removeItem("sostucumanNombre");
    localStorage.removeItem("sostucumanEmail");
    localStorage.removeItem("sostucumanRol");
    window.dispatchEvent(new Event("usuarioActualizado"));
  },

  async autenticarUsuario(correo, password) {
    const usuario = await RepositorioUsuario.buscarPorEmail(correo);
    if (!usuario || usuario.password !== password) {
      throw new Error("Credenciales incorrectas o usuario no registrado.");
    }
    return this.guardarSesion(usuario);
  },

  async autenticarConGoogle({ nombre, email }) {
    let usuario = await RepositorioUsuario.buscarPorEmail(email);
    if (!usuario) {
      usuario = await RepositorioUsuario.crear({
        id: "USR-" + Date.now(),
        nombre,
        email,
        password: "oauth-google-token",
        rol: "vecino",
        fecha_registro: new Date().toISOString(),
      });
    }
    return this.guardarSesion(usuario);
  },

  async registrarUsuario({ nombre, email, password, rol = "vecino" }) {
    const existente = await RepositorioUsuario.buscarPorEmail(email);
    if (existente) {
      throw new Error("Este correo electrónico ya está registrado en el sistema.");
    }
    const nuevo = await RepositorioUsuario.crear({
      id: "USR-" + Date.now(),
      nombre: nombre.trim(),
      email: email.trim(),
      password,
      rol,
      fecha_registro: new Date().toISOString(),
    });
    return this.guardarSesion(nuevo);
  },
};

export const ControladorValidacion = {
  /**
   * Caso de Uso 3 (CU-03): Validar Incidente ("A mí también me afecta")
   * Cumple RN-03: Un usuario puede validar un mismo incidente como máximo una sola vez.
   */
  async registrarValidacion(sesion, idIncidente) {
    if (!sesion?.email) {
      throw new Error("Debés iniciar sesión para validar un incidente.");
    }

    const yaExiste = await RepositorioValidacion.verificarExistencia(
      sesion.email,
      idIncidente
    );

    if (yaExiste) {
      throw new Error("Ya has validado este incidente anteriormente.");
    }

    const nuevaValidacion = {
      id: "VAL-" + Date.now(),
      id_incidente: idIncidente,
      usuarioEmail: sesion.email,
      usuarioNombre: sesion.nombre,
      fecha_hora_validacion: new Date().toLocaleString("es-AR"),
    };

    await RepositorioValidacion.guardar(nuevaValidacion);

    const incidente = await RepositorioIncidente.obtenerPorId(idIncidente);
    const nuevoContador = (incidente.afectadosIniciales || 1) + 1;
    await RepositorioIncidente.actualizar(idIncidente, {
      afectadosIniciales: nuevoContador,
    });

    window.dispatchEvent(new Event("reporteCreado"));
    return {
      mensaje: "Validación registrada con éxito",
      nuevoContador,
    };
  },
};

export const ControladorIncidente = {
  /**
   * Caso de Uso 2 (CU-02): Registrar Incidente
   * - Valida ejido urbano de San Miguel de Tucumán (RN-01 / RF-03)
   * - Deduplica automáticamente en radio de 20 metros (RN-02 / RF-04)
   */
  async registrarIncidente({
    categoria,
    titulo,
    ubicacion,
    latitud,
    longitud,
    descripcion,
    imagen,
    sesion,
  }) {
    if (!sesion?.email) {
      throw new Error("Debes iniciar sesión para publicar un reporte.");
    }

    if (!estaDentroDeSMT(latitud, longitud)) {
      throw new Error(
        "El incidente reportado se encuentra fuera de la jurisdicción de San Miguel de Tucumán."
      );
    }

    // Buscar incidentes activos de igual categoría en radio <= 20 metros (RN-02)
    const cercanos = await RepositorioIncidente.buscarEnRadio(
      Number(latitud),
      Number(longitud),
      categoria,
      20
    );

    if (cercanos.length > 0) {
      const incidenteExistente = cercanos[0];
      const yaValido = await RepositorioValidacion.verificarExistencia(
        sesion.email,
        incidenteExistente.id
      );

      if (!yaValido) {
        await RepositorioValidacion.guardar({
          id: "VAL-" + Date.now(),
          id_incidente: incidenteExistente.id,
          usuarioEmail: sesion.email,
          usuarioNombre: sesion.nombre,
          fecha_hora_validacion: new Date().toLocaleString("es-AR"),
        });

        await RepositorioIncidente.actualizar(incidenteExistente.id, {
          afectadosIniciales: (incidenteExistente.afectadosIniciales || 1) + 1,
        });
      }

      window.dispatchEvent(new Event("reporteCreado"));
      return {
        agrupado: true,
        incidente: incidenteExistente,
        mensaje: "Agrupado a reporte existente",
      };
    }

    // No hay duplicados en 20m: instanciar nuevo Incidente en estado "Reportado"
    const nuevoIncidente = {
      id: "REP-" + Date.now(),
      categoria,
      titulo,
      ubicacion,
      latitud: Number(latitud),
      longitud: Number(longitud),
      descripcion,
      imagen: imagen || "",
      fotografia_cierre: "",
      usuario: sesion.nombre,
      usuarioEmail: sesion.email,
      fecha: new Date().toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      tiempo: "Recién publicado",
      estado: "Reportado",
      cuadrillaAsignada: "",
      afectadosIniciales: 1,
    };

    const creado = await RepositorioIncidente.guardar(nuevoIncidente);

    // Registrar creación inicial en HistorialEstado (RF-09)
    await RepositorioHistorial.guardar({
      id: "HIS-" + Date.now(),
      id_incidente: creado.id,
      estado_anterior: "Nuevo",
      estado_nuevo: "Reportado",
      usuario_modificador: sesion.nombre,
      rol_modificador: sesion.rol || "vecino",
      observacion: "Reporte georreferenciado ingresado por ciudadano.",
      fecha_hora_modificacion: new Date().toLocaleString("es-AR"),
    });

    window.dispatchEvent(new Event("reporteCreado"));
    return {
      agrupado: false,
      incidente: creado,
      mensaje: "Incidente creado exitosamente",
    };
  },

  /**
   * Transición de estados administrativa (Moderador / Cuadrilla) con registro en HistorialEstado (RF-07 / RF-09)
   */
  async cambiarEstado({
    idIncidente,
    nuevoEstado,
    cuadrillaAsignada,
    observacion,
    sesion,
  }) {
    if (nuevoEstado === "Resuelto") {
      throw new Error(
        "Para marcar como Resuelto debe utilizar el cierre con fotografía obligatoria."
      );
    }

    const actual = await RepositorioIncidente.obtenerPorId(idIncidente);
    const payload = { estado: nuevoEstado };
    if (cuadrillaAsignada !== undefined) {
      payload.cuadrillaAsignada = cuadrillaAsignada;
    }

    const actualizado = await RepositorioIncidente.actualizar(
      idIncidente,
      payload
    );

    await RepositorioHistorial.guardar({
      id: "HIS-" + Date.now(),
      id_incidente: idIncidente,
      estado_anterior: actual.estado,
      estado_nuevo: nuevoEstado,
      usuario_modificador: sesion.nombre,
      rol_modificador: sesion.rol,
      observacion:
        observacion ||
        (cuadrillaAsignada
          ? `Asignado a ${cuadrillaAsignada}.`
          : `Estado actualizado a ${nuevoEstado}.`),
      fecha_hora_modificacion: new Date().toLocaleString("es-AR"),
    });

    window.dispatchEvent(new Event("reporteCreado"));
    return actualizado;
  },

  /**
   * Caso de Uso 4 (CU-04): Resolver Incidente en Terreno
   * Cumple RN-04 / RF-08: Exige fotografía de cierre obligatoria antes de pasar a "Resuelto".
   */
  async resolverIncidente({ idIncidente, fotoCierre, observacion, sesion }) {
    if (!fotoCierre || fotoCierre.trim() === "") {
      throw new Error("Es obligatorio adjuntar una fotografía del arreglo.");
    }

    const actual = await RepositorioIncidente.obtenerPorId(idIncidente);
    const fechaResolucion = new Date().toLocaleString("es-AR");

    const actualizado = await RepositorioIncidente.actualizar(idIncidente, {
      estado: "Resuelto",
      fotografia_cierre: fotoCierre,
      fecha_hora_resolucion: fechaResolucion,
    });

    await RepositorioHistorial.guardar({
      id: "HIS-" + Date.now(),
      id_incidente: idIncidente,
      estado_anterior: actual.estado,
      estado_nuevo: "Resuelto",
      usuario_modificador: sesion.nombre,
      rol_modificador: sesion.rol,
      observacion:
        observacion ||
        "Reparación finalizada y verificada con evidencia fotográfica de cierre.",
      fecha_hora_modificacion: fechaResolucion,
    });

    window.dispatchEvent(new Event("reporteCreado"));
    return {
      incidente: actualizado,
      mensaje: "Incidente resuelto y cerrado exitosamente",
    };
  },
};