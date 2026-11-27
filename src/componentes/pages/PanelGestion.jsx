import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  Form,
  Modal,
  Alert,
} from "react-bootstrap";
import {
  Tools,
  CheckCircleFill,
  CameraFill,
  ShieldCheck,
  GeoAltFill,
  ClockHistory,
} from "react-bootstrap-icons";
import Swal from "sweetalert2";
import {
  ControladorAutenticacion,
  ControladorIncidente,
  RepositorioIncidente,
  ESTADOS_FLUJO,
} from "../../services/api";

const CUADRILLAS_DISPONIBLES = [
  "Cuadrilla Operativa Zona Centro",
  "Cuadrilla Bacheo Norte",
  "Cuadrilla Alumbrado Sur",
  "Cuadrilla Higiene y Poda",
  "Cuadrilla Semaforización Vial",
];

const COLOR_BADGE = {
  Reportado: "warning",
  "En revisión": "secondary",
  "En reparación": "primary",
  Resuelto: "success",
};

export default function PanelGestion({ onAuth, onVerDetalle }) {
  const [sesion, setSesion] = useState(
    ControladorAutenticacion.obtenerSesionActual()
  );
  const [reportes, setReportes] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  // Estados para Modal de Resolución en Terreno (CU-04 / RN-04)
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [incidenteACerrar, setIncidenteACerrar] = useState(null);
  const [fotoCierreBase64, setFotoCierreBase64] = useState("");
  const [observacionCierre, setObservacionCierre] = useState("");

  const cargarTodo = async () => {
    setSesion(ControladorAutenticacion.obtenerSesionActual());
    try {
      const data = await RepositorioIncidente.obtenerTodos();
      setReportes(data);
    } catch (error) {
      console.error("Error cargando panel de gestión:", error);
    }
  };

  useEffect(() => {
    cargarTodo();
    window.addEventListener("usuarioActualizado", cargarTodo);
    window.addEventListener("reporteCreado", cargarTodo);
    return () => {
      window.removeEventListener("usuarioActualizado", cargarTodo);
      window.removeEventListener("reporteCreado", cargarTodo);
    };
  }, []);

  // Control de acceso RBAC (RNF-03)
  const tienePermiso =
    sesion && (sesion.rol === "moderador" || sesion.rol === "cuadrilla");

  if (!tienePermiso) {
    return (
      <div
        className="d-flex align-items-center justify-content-center bg-light"
        style={{ minHeight: "100vh", paddingTop: "90px" }}
      >
        <Container className="text-center" style={{ maxWidth: "540px" }}>
          <div className="bg-white p-5 rounded-4 shadow-sm border">
            <ShieldCheck size={48} className="text-warning mb-3" />
            <h3
              className="fw-bolder text-dark"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Acceso restringido a Personal Municipal
            </h3>
            <p className="text-muted">
              El Panel de Gestión y Resolución en Terreno requiere iniciar
              sesión con rol de <strong>Moderador Municipal</strong> o{" "}
              <strong>Cuadrilla Operativa</strong> (RNF-03).
            </p>
            <Button
              onClick={onAuth}
              className="rounded-pill px-4 py-2 fw-bold border-0"
              style={{ backgroundColor: "#082f49" }}
            >
              Iniciar sesión con cuenta operativa
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  // Transiciones intermedias (Moderador: Reportado -> En revisión -> En reparación)
  const handleTransicionEstado = async (reporte, nuevoEstado, cuadrilla) => {
    try {
      await ControladorIncidente.cambiarEstado({
        idIncidente: reporte.id,
        nuevoEstado,
        cuadrillaAsignada:
          cuadrilla !== undefined ? cuadrilla : reporte.cuadrillaAsignada,
        sesion,
      });
      Swal.fire({
        icon: "success",
        title: "Estado actualizado",
        text: `El incidente ${reporte.id} pasó a "${nuevoEstado}".`,
        toast: true,
        position: "top-end",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Operación no permitida",
        text: error.message,
      });
    }
  };

  // Abrir Modal CU-04 para cierre con fotografía obligatoria
  const abrirModalResolucion = (reporte) => {
    setIncidenteACerrar(reporte);
    setFotoCierreBase64("");
    setObservacionCierre("");
    setShowCierreModal(true);
  };

  const handleSubirFotoCierre = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setFotoCierreBase64(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Confirmar cierre CU-04 (RN-04 / RF-08 / RF-09)
  const handleConfirmarResolucion = async (e) => {
    e.preventDefault();
    if (!fotoCierreBase64) {
      // Flujo alternativo 5a (CU-04): Falta fotografía de cierre
      Swal.fire({
        icon: "error",
        title: "Fotografía obligatoria (RN-04)",
        text: "Es obligatorio adjuntar una fotografía del arreglo antes de cerrar el incidente.",
      });
      return;
    }

    try {
      const res = await ControladorIncidente.resolverIncidente({
        idIncidente: incidenteACerrar.id,
        fotoCierre: fotoCierreBase64,
        observacion: observacionCierre.trim(),
        sesion,
      });
      setShowCierreModal(false);
      Swal.fire({
        icon: "success",
        title: res.mensaje,
        text: "La evidencia de cierre y el historial auditable ya son públicos.",
        timer: 2400,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error al cerrar incidente",
        text: error.message,
      });
    }
  };

  const filtrados = reportes.filter(
    (r) => filtroEstado === "Todos" || r.estado === filtroEstado
  );

  const contarPorEstado = (est) =>
    reportes.filter((r) => r.estado === est).length;

  return (
    <div
      className="bg-light pb-5"
      style={{ minHeight: "100vh", fontFamily: "Inter, sans-serif" }}
    >
      {/* Cabecera Institucional */}
      <div
        className="text-white"
        style={{
          background: "linear-gradient(135deg, #082f49 0%, #0369a1 100%)",
          paddingTop: "115px",
          paddingBottom: "55px",
        }}
      >
        <Container>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <Badge
                bg="warning"
                text="dark"
                className="mb-2 px-3 py-1 rounded-pill fw-bold"
              >
                MÓDULO 4 · PANEL OPERATIVO ({sesion.rol.toUpperCase()})
              </Badge>
              <h1
                className="fw-bolder mb-1"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Gestión y Resolución de Incidentes
              </h1>
              <p className="opacity-75 mb-0">
                Operador activo: <strong>{sesion.nombre}</strong> · Flujo
                auditable de 4 estados con cierre fotográfico obligatorio
                (RF-07 / RN-04).
              </p>
            </div>
          </div>
        </Container>
      </div>

      <Container style={{ marginTop: "-30px" }}>
        {/* Tarjetas KPI de los 4 estados */}
        <Row className="g-3 mb-4">
          {ESTADOS_FLUJO.map((est) => (
            <Col xs={6} md={3} key={est}>
              <Card
                onClick={() =>
                  setFiltroEstado(filtroEstado === est ? "Todos" : est)
                }
                className={`border-0 shadow-sm rounded-4 p-3 h-100 ${
                  filtroEstado === est ? "border border-2 border-info" : ""
                }`}
                style={{ cursor: "pointer" }}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <Badge bg={COLOR_BADGE[est]}>{est}</Badge>
                  <span className="fw-bolder fs-3 text-dark">
                    {contarPorEstado(est)}
                  </span>
                </div>
                <small className="text-muted">Clic para filtrar</small>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Filtro rápido */}
        <div className="d-flex flex-wrap gap-2 mb-4">
          <Button
            size="sm"
            variant={filtroEstado === "Todos" ? "dark" : "outline-secondary"}
            className="rounded-pill px-3 fw-semibold"
            onClick={() => setFiltroEstado("Todos")}
          >
            Todos ({reportes.length})
          </Button>
          {ESTADOS_FLUJO.map((est) => (
            <Button
              key={est}
              size="sm"
              variant={filtroEstado === est ? "info" : "outline-secondary"}
              className="rounded-pill px-3 fw-semibold"
              onClick={() => setFiltroEstado(est)}
            >
              {est} ({contarPorEstado(est)})
            </Button>
          ))}
        </div>

        {/* Listado operativo de incidentes */}
        <Row className="g-4">
          {filtrados.map((rep) => (
            <Col xs={12} lg={6} key={rep.id}>
              <Card className="border-0 shadow-sm rounded-4 h-100">
                <Card.Body className="p-4 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <div>
                      <Badge
                        bg={COLOR_BADGE[rep.estado] || "secondary"}
                        className="me-2"
                      >
                        {rep.estado}
                      </Badge>
                      <span className="small fw-bold text-info">
                        {rep.categoria}
                      </span>
                    </div>
                    <Badge bg="light" text="dark" className="border">
                      ✋ {rep.afectadosIniciales || 1} afectados
                    </Badge>
                  </div>

                  <h5 className="fw-bold text-dark mb-1">{rep.titulo}</h5>
                  <p className="text-muted small mb-2">{rep.descripcion}</p>

                  <div className="small text-muted mb-3">
                    <GeoAltFill className="text-danger me-1" />
                    {rep.ubicacion}
                  </div>

                  {/* Asignación de Cuadrilla (Moderador) */}
                  <div className="bg-light p-3 rounded-3 border mb-3">
                    <div className="small fw-bold text-dark mb-1 d-flex align-items-center gap-1">
                      <Tools className="text-primary" /> Cuadrilla asignada:
                    </div>
                    {sesion.rol === "moderador" && rep.estado !== "Resuelto" ? (
                      <Form.Select
                        size="sm"
                        value={rep.cuadrillaAsignada || ""}
                        onChange={(e) =>
                          handleTransicionEstado(
                            rep,
                            rep.estado === "Reportado"
                              ? "En revisión"
                              : rep.estado,
                            e.target.value
                          )
                        }
                      >
                        <option value="">Sin cuadrilla asignada...</option>
                        {CUADRILLAS_DISPONIBLES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Form.Select>
                    ) : (
                      <span className="small text-muted">
                        {rep.cuadrillaAsignada || "Pendiente de derivación"}
                      </span>
                    )}
                  </div>

                  {/* Botonera de flujo de 4 estados */}
                  <div className="mt-auto pt-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="rounded-pill px-3 fw-semibold d-flex align-items-center gap-1"
                      onClick={() => onVerDetalle && onVerDetalle(rep)}
                    >
                      <ClockHistory /> Historial y Fotos
                    </Button>

                    <div className="d-flex flex-wrap gap-2">
                      {rep.estado === "Reportado" && (
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="rounded-pill px-3 fw-bold"
                          onClick={() =>
                            handleTransicionEstado(rep, "En revisión")
                          }
                        >
                          Pasar a En revisión
                        </Button>
                      )}

                      {(rep.estado === "Reportado" ||
                        rep.estado === "En revisión") && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="rounded-pill px-3 fw-bold"
                          onClick={() =>
                            handleTransicionEstado(rep, "En reparación")
                          }
                        >
                          Derivar a En reparación
                        </Button>
                      )}

                      {rep.estado === "En reparación" && (
                        <Button
                          size="sm"
                          variant="success"
                          className="rounded-pill px-3 fw-bold d-flex align-items-center gap-1"
                          onClick={() => abrirModalResolucion(rep)}
                        >
                          <CameraFill /> Cargar resolución (CU-04)
                        </Button>
                      )}

                      {rep.estado === "Resuelto" && (
                        <span className="text-success small fw-bold d-flex align-items-center gap-1">
                          <CheckCircleFill /> Cerrado con evidencia
                        </span>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      {/* MODAL CU-04: RESOLVER INCIDENTE EN TERRENO (RN-04 / RF-08) */}
      <Modal
        show={showCierreModal}
        onHide={() => setShowCierreModal(false)}
        centered
      >
        <Modal.Header
          closeButton
          style={{ backgroundColor: "#082f49", color: "white" }}
        >
          <Modal.Title className="fs-5 fw-bold">
            Cargar Resolución en Terreno · {incidenteACerrar?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Alert variant="info" className="small">
            <strong>Regla de Negocio RN-04:</strong> Ningún incidente puede
            pasar al estado <strong>Resuelto</strong> sin adjuntar una
            fotografía válida de evidencia de reparación.
          </Alert>

          <Form onSubmit={handleConfirmarResolucion}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small">
                Fotografía de evidencia de cierre *
              </Form.Label>
              <Form.Control
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleSubirFotoCierre}
              />
              {fotoCierreBase64 && (
                <div className="mt-3 text-center">
                  <img
                    src={fotoCierreBase64}
                    alt="Evidencia de cierre"
                    className="img-fluid rounded-3 shadow-sm"
                    style={{ maxHeight: "200px", objectFit: "cover" }}
                  />
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small">
                Observación técnica de la cuadrilla
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Ej: Bache cubierto con mezcla asfáltica en caliente y señalización retirada."
                value={observacionCierre}
                onChange={(e) => setObservacionCierre(e.target.value)}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="light"
                className="border"
                onClick={() => setShowCierreModal(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="success" className="fw-bold px-4">
                Confirmar Cierre y Pasar a Resuelto
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}