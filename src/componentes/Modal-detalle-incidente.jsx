import { useState, useEffect } from "react";
import { Modal, Button, Badge, Row, Col } from "react-bootstrap";
import {
  GeoAltFill,
  ClockHistory,
  CheckCircleFill,
  HandThumbsUpFill,
} from "react-bootstrap-icons";
import Swal from "sweetalert2";
import {
  ControladorAutenticacion,
  ControladorValidacion,
  RepositorioHistorial,
  RepositorioValidacion,
} from "../services/api";

const BADGE_COLOR = {
  Reportado: "warning",
  "En revisión": "secondary",
  "En reparación": "primary",
  Resuelto: "success",
};

export default function ModalDetalleIncidente({ show, onHide, reporte }) {
  const [historial, setHistorial] = useState([]);
  const [contador, setContador] = useState(0);
  const [yaValido, setYaValido] = useState(false);

  const sesion = ControladorAutenticacion.obtenerSesionActual();

  useEffect(() => {
    if (!show || !reporte) return;
    setContador(reporte.afectadosIniciales || 1);

    const cargarTrazabilidad = async () => {
      try {
        const hist = await RepositorioHistorial.obtenerPorIncidente(reporte.id);
        setHistorial(hist);
        if (sesion?.email) {
          const v = await RepositorioValidacion.verificarExistencia(
            sesion.email,
            reporte.id
          );
          setYaValido(v);
        } else {
          setYaValido(false);
        }
      } catch (err) {
        console.error(err);
      }
    };

    cargarTrazabilidad();
  }, [show, reporte]);

  if (!reporte) return null;

  const handleValidar = async () => {
    if (!sesion) {
      Swal.fire({
        icon: "warning",
        title: "Iniciá sesión",
        text: "Necesitás estar autenticado para validar este incidente.",
      });
      return;
    }
    try {
      const res = await ControladorValidacion.registrarValidacion(
        sesion,
        reporte.id
      );
      setContador(res.nuevoContador);
      setYaValido(true);
      Swal.fire({
        icon: "success",
        title: res.mensaje,
        text: "Tu adhesión ciudadana quedó registrada.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "info",
        title: "Validación ya registrada",
        text: error.message,
      });
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header
        closeButton
        style={{ backgroundColor: "#082f49", color: "white" }}
      >
        <Modal.Title
          className="fs-5 fw-bold d-flex align-items-center gap-2"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <span>Detalle del Incidente · {reporte.id}</span>
          <Badge bg={BADGE_COLOR[reporte.estado] || "secondary"}>
            {reporte.estado}
          </Badge>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <div className="mb-3">
          <span className="fw-bold small text-info text-uppercase">
            {reporte.categoria}
          </span>
          <h4 className="fw-bold text-dark mt-1">{reporte.titulo}</h4>
          <p className="text-muted mb-2">{reporte.descripcion}</p>
          <div className="d-flex flex-wrap gap-3 small text-muted">
            <span>
              <GeoAltFill className="text-danger me-1" />
              {reporte.ubicacion}
            </span>
            {reporte.latitud && reporte.longitud && (
              <span>
                GPS: {Number(reporte.latitud).toFixed(5)},{" "}
                {Number(reporte.longitud).toFixed(5)}
              </span>
            )}
            <span>Reportado por: {reporte.usuario}</span>
          </div>
        </div>

        {/* Evidencia Fotográfica: Antes y Después (RF-08) */}
        <Row className="g-3 mb-4">
          <Col md={reporte.fotografia_cierre ? 6 : 12}>
            <div className="border rounded-4 p-2 bg-light h-100">
              <div className="small fw-bold text-muted mb-2 px-1">
                📷 Evidencia Inicial (Reportado)
              </div>
              {reporte.imagen ? (
                <img
                  src={reporte.imagen}
                  alt="Evidencia inicial"
                  className="w-100 rounded-3 object-fit-cover"
                  style={{ height: "210px" }}
                />
              ) : (
                <div
                  className="d-flex align-items-center justify-content-center text-muted bg-white rounded-3"
                  style={{ height: "210px" }}
                >
                  Sin fotografía inicial
                </div>
              )}
            </div>
          </Col>

          {reporte.fotografia_cierre && (
            <Col md={6}>
              <div className="border border-success rounded-4 p-2 bg-success bg-opacity-10 h-100">
                <div className="small fw-bold text-success mb-2 px-1 d-flex align-items-center gap-1">
                  <CheckCircleFill /> Evidencia de Cierre (Reparado)
                </div>
                <img
                  src={reporte.fotografia_cierre}
                  alt="Evidencia de cierre"
                  className="w-100 rounded-3 object-fit-cover"
                  style={{ height: "210px" }}
                />
              </div>
            </Col>
          )}
        </Row>

        {/* Historial Auditable de Estados (RF-09) */}
        <div className="bg-light rounded-4 p-3 border mb-4">
          <h6 className="fw-bold text-dark d-flex align-items-center gap-2 mb-3">
            <ClockHistory className="text-primary" /> Trazabilidad e Historial
            de Estados (RF-09)
          </h6>
          {historial.length === 0 ? (
            <p className="text-muted small mb-0">
              Incidente registrado el {reporte.fecha}. Sin cambios posteriores.
            </p>
          ) : (
            <div className="d-flex flex-column gap-2">
              {historial.map((h) => (
                <div
                  key={h.id}
                  className="bg-white p-2 px-3 rounded-3 border d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-1"
                >
                  <div>
                    <Badge bg="secondary" className="me-1">
                      {h.estado_anterior}
                    </Badge>
                    <span className="mx-1">→</span>
                    <Badge bg={BADGE_COLOR[h.estado_nuevo] || "info"}>
                      {h.estado_nuevo}
                    </Badge>
                    <span className="ms-2 small fw-medium text-dark">
                      {h.observacion}
                    </span>
                  </div>
                  <small className="text-muted text-nowrap">
                    {h.usuario_modificador} · {h.fecha_hora_modificacion}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón Validación Ciudadana (CU-03 / RN-03) */}
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 pt-2 border-top">
          <span className="small text-muted">
            Validación ciudadana única por vecino (RN-03)
          </span>
          <Button
            variant={yaValido ? "success" : "outline-primary"}
            disabled={yaValido}
            onClick={handleValidar}
            className="rounded-pill px-4 fw-bold d-flex align-items-center gap-2"
          >
            <HandThumbsUpFill />
            <span>
              {yaValido
                ? "Ya validaste este reporte"
                : "A mí también me afecta"}
            </span>
            <Badge bg="light" text="dark" className="rounded-pill border">
              +{contador}
            </Badge>
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}