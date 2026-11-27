import { useState } from "react";
import { Modal, Button, Form, Alert, Badge } from "react-bootstrap";
import { GeoAltFill, Search } from "react-bootstrap-icons";
import Swal from "sweetalert2";
import MapaInteractivo from "./MapaInteractivo";
import {
  CENTRO_SMT,
  estaDentroDeSMT,
  buscarDireccionEnSMT,
} from "../utils/geoUtils";
import {
  ControladorAutenticacion,
  ControladorIncidente,
} from "../services/api";

export default function ReportModal({ show, onHide }) {
  const [categoria, setCategoria] = useState("");
  const [titulo, setTitulo] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotoBase64, setFotoBase64] = useState("");

  // Coordenadas GPS seleccionadas (por clic en mapa, GPS o búsqueda)
  const [coordenada, setCoordenada] = useState({
    lat: CENTRO_SMT.lat,
    lng: CENTRO_SMT.lng,
    valido: true,
  });
  const [loadingUbicacion, setLoadingUbicacion] = useState(false);

  // 1. Captura GPS del navegador
  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      Swal.fire({
        icon: "error",
        title: "Geolocalización no soportada",
        text: "Tu navegador no permite obtener la ubicación automáticamente.",
      });
      return;
    }

    setLoadingUbicacion(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const valido = estaDentroDeSMT(lat, lng);

        setCoordenada({ lat, lng, valido });
        if (!ubicacion.trim()) {
          setUbicacion(`GPS (${lat}, ${lng}) - San Miguel de Tucumán`);
        }
        setLoadingUbicacion(false);

        if (!valido) {
          Swal.fire({
            icon: "warning",
            title: "Fuera de jurisdicción",
            text: "Tus coordenadas actuales están fuera del ejido urbano de San Miguel de Tucumán. Marcá el punto en el mapa.",
          });
        }
      },
      () => {
        Swal.fire({
          icon: "warning",
          title: "Error de ubicación",
          text: "No pudimos acceder al GPS. Hacé clic directamente sobre el mapa para marcar el incidente.",
        });
        setLoadingUbicacion(false);
      }
    );
  };

  // 2. Buscar dirección escrita y proyectarla en el mapa
  const handleGeocodificarDireccion = async () => {
    if (!ubicacion.trim()) return;
    setLoadingUbicacion(true);
    try {
      const res = await buscarDireccionEnSMT(ubicacion);
      if (res) {
        const valido = estaDentroDeSMT(res.lat, res.lng);
        setCoordenada({
          lat: Number(res.lat.toFixed(6)),
          lng: Number(res.lng.toFixed(6)),
          valido,
        });
      } else {
        Swal.fire({
          icon: "info",
          title: "Dirección no localizada",
          text: "Podés ajustar el marcador haciendo clic directamente en la esquina exacta del mapa.",
        });
      }
    } catch {
      // Silencioso: el usuario puede marcar en el mapa
    } finally {
      setLoadingUbicacion(false);
    }
  };

  // 3. Vista previa de fotografía inicial
  const handleCargarFoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setFotoBase64(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  // 4. Envío con validación jurisdiccional (RN-01) y deduplicación en 20m (RN-02)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const sesion = ControladorAutenticacion.obtenerSesionActual();
    if (!sesion) {
      Swal.fire({
        icon: "warning",
        title: "Acceso denegado",
        text: "Debes iniciar sesión para publicar un reporte.",
      });
      return;
    }

    if (!categoria || !titulo.trim() || !ubicacion.trim() || !descripcion.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Completá todos los campos obligatorios marcados con asterisco (*).",
      });
      return;
    }

    // Flujo alternativo 3a (CU-02 / RN-01): Fuera de San Miguel de Tucumán
    if (!coordenada.valido || !estaDentroDeSMT(coordenada.lat, coordenada.lng)) {
      Swal.fire({
        icon: "error",
        title: "Fuera de jurisdicción",
        text: "El incidente reportado se encuentra fuera de la jurisdicción de San Miguel de Tucumán.",
      });
      return;
    }

    try {
      const resultado = await ControladorIncidente.registrarIncidente({
        categoria,
        titulo: titulo.trim(),
        ubicacion: ubicacion.trim(),
        latitud: coordenada.lat,
        longitud: coordenada.lng,
        descripcion: descripcion.trim(),
        imagen: fotoBase64,
        sesion,
      });

      if (resultado.agrupado) {
        // Flujo alternativo 5a (CU-02 / RN-02): Deduplicación espacial en 20m
        Swal.fire({
          icon: "info",
          title: resultado.mensaje,
          html: `Detectamos un reclamo activo de <strong>${categoria}</strong> a menos de <strong>20 metros</strong>:<br/><em>"${resultado.incidente.titulo}"</em>.<br/><br/>Para evitar duplicados, sumamos tu reporte como una validación vecinal (+1).`,
        });
      } else {
        Swal.fire({
          icon: "success",
          title: resultado.mensaje,
          text: "Tu reporte georreferenciado ya es visible en el mapa público en estado Reportado.",
          timer: 2400,
          showConfirmButton: false,
        });
      }

      handleClose();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudo registrar",
        text: error.message || "Error de conexión con la base de datos.",
      });
    }
  };

  const handleClose = () => {
    setCategoria("");
    setTitulo("");
    setUbicacion("");
    setDescripcion("");
    setFotoBase64("");
    setCoordenada({ lat: CENTRO_SMT.lat, lng: CENTRO_SMT.lng, valido: true });
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header
        closeButton
        style={{ backgroundColor: "#082f49", color: "white" }}
        className="border-0"
      >
        <Modal.Title
          className="fw-bold fs-5 d-flex align-items-center gap-2"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <GeoAltFill style={{ color: "#f97316" }} /> Crear Nuevo Reporte
          Georreferenciado
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4 bg-light">
        <Form onSubmit={handleSubmit}>
          <div className="row g-3">
            {/* Categoría */}
            <div className="col-12 col-md-6">
              <Form.Label className="fw-semibold small">Categoría *</Form.Label>
              <Form.Select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                <option value="">Seleccioná una categoría...</option>
                <option value="Baches y Calles">Baches y Calles</option>
                <option value="Alumbrado Público">Alumbrado Público</option>
                <option value="Higiene Urbana">Higiene Urbana</option>
                <option value="Semáforos y Tránsito">
                  Semáforos y Tránsito
                </option>
              </Form.Select>
            </div>

            {/* Título */}
            <div className="col-12 col-md-6">
              <Form.Label className="fw-semibold small">
                Título breve *
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Ej: Bache en Av. Mate de Luna"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            {/* Dirección textual + Geolocalización + Mapa Interactivo */}
            <div className="col-12">
              <Form.Label className="fw-semibold small">
                Ubicación / Calle y altura * (hacé clic o arrastrá el pin en el
                mapa)
              </Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                <Form.Control
                  type="text"
                  className="flex-grow-1"
                  placeholder="Ej: San Martín 500, San Miguel de Tucumán"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                />
                <Button
                  variant="outline-primary"
                  onClick={handleGeocodificarDireccion}
                  disabled={loadingUbicacion}
                  title="Ubicar dirección en el mapa"
                >
                  <Search /> Ubicar
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={obtenerUbicacion}
                  disabled={loadingUbicacion}
                >
                  {loadingUbicacion ? "Ubicando..." : "📍 Mi GPS"}
                </Button>
              </div>

              {/* Mapa interactivo con círculo de 20m y validación de ejido SMT */}
              <div className="border rounded-3 p-1 bg-white shadow-sm">
                <MapaInteractivo
                  modo="selector"
                  coordenadaSeleccionada={coordenada}
                  onSeleccionarCoordenada={(nuevaCoord) =>
                    setCoordenada(nuevaCoord)
                  }
                  altura="230px"
                />
              </div>

              <div className="d-flex justify-content-between align-items-center mt-2">
                <small className="text-muted">
                  Coordenadas: <strong>{coordenada.lat}</strong>,{" "}
                  <strong>{coordenada.lng}</strong> (Círculo azul = radio 20 m)
                </small>
                {coordenada.valido ? (
                  <Badge bg="success">✓ Dentro de San Miguel de Tucumán</Badge>
                ) : (
                  <Badge bg="danger">✕ Fuera de jurisdicción SMT</Badge>
                )}
              </div>

              {!coordenada.valido && (
                <Alert variant="danger" className="py-2 px-3 small mt-2 mb-0">
                  El incidente reportado se encuentra fuera de la jurisdicción
                  de San Miguel de Tucumán (RN-01). Mové el marcador dentro del
                  perímetro delimitado.
                </Alert>
              )}
            </div>

            {/* Descripción */}
            <div className="col-12">
              <Form.Label className="fw-semibold small">
                Descripción del problema *
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Detallá lo que sucede y si representa riesgo vial o peatonal..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            {/* Fotografía inicial */}
            <div className="col-12">
              <Form.Label className="fw-semibold small">
                Fotografía inicial del problema
              </Form.Label>
              <Form.Control
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCargarFoto}
              />

              {fotoBase64 && (
                <div className="mt-3 text-center position-relative">
                  <img
                    src={fotoBase64}
                    alt="Previsualización"
                    className="img-fluid rounded-3 shadow-sm"
                    style={{ maxHeight: "160px", objectFit: "cover" }}
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    className="rounded-circle position-absolute top-0 end-0 m-2"
                    onClick={() => setFotoBase64("")}
                  >
                    ×
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Button
              variant="light"
              className="border fw-semibold"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!coordenada.valido}
              className="fw-semibold px-4 border-0"
              style={{ backgroundColor: "#f97316" }}
            >
              Publicar Reporte
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}