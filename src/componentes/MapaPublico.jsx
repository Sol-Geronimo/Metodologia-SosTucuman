import { useState, useEffect } from "react";
import { Container, Row, Col, Badge, Button, Form } from "react-bootstrap";
import { GeoAltFill, FunnelFill, PlusCircleFill } from "react-bootstrap-icons";
import MapaInteractivo from "./MapaInteractivo";
import { RepositorioIncidente, ESTADOS_FLUJO } from "../services/api";

const CATEGORIAS = [
  "Todas",
  "Alumbrado Público",
  "Baches y Calles",
  "Higiene Urbana",
  "Semáforos y Tránsito",
];

export default function MapaPublico({ onReport, onVerDetalle }) {
  const [reportes, setReportes] = useState([]);
  const [filtroCat, setFiltroCat] = useState("Todas");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const cargar = async () => {
    try {
      const data = await RepositorioIncidente.obtenerTodos();
      setReportes(data);
    } catch (error) {
      console.error("Error cargando mapa público:", error);
    }
  };

  useEffect(() => {
    cargar();
    window.addEventListener("reporteCreado", cargar);
    return () => window.removeEventListener("reporteCreado", cargar);
  }, []);

  const filtrados = reportes.filter((r) => {
    const okCat = filtroCat === "Todas" || r.categoria === filtroCat;
    const okEst = filtroEstado === "Todos" || r.estado === filtroEstado;
    return okCat && okEst;
  });

  return (
    <section id="mapa-publico" className="py-5 bg-white">
      <Container>
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end mb-4 gap-3">
          <div>
            <span
              className="text-uppercase fw-bold d-inline-block mb-2 px-3 py-1 rounded-pill"
              style={{
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                fontSize: "0.78rem",
                letterSpacing: "0.06em",
              }}
            >
              Mapa Interactivo en Tiempo Real · RF-06
            </span>
            <h2
              className="fw-bolder mb-1"
              style={{
                fontFamily: "Outfit, sans-serif",
                color: "#082f49",
                fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              }}
            >
              Mapa ciudadano de San Miguel de Tucumán
            </h2>
            <p className="text-muted mb-0">
              Explorá los incidentes georreferenciados por estado, verificá la
              evidencia de cierre y sumá tu apoyo vecinal.
            </p>
          </div>

          <Button
            onClick={onReport}
            className="rounded-pill px-4 py-2 fw-bold border-0 d-inline-flex align-items-center gap-2 shadow-sm"
            style={{ backgroundColor: "#f97316" }}
          >
            <PlusCircleFill /> Reportar en el mapa
          </Button>
        </div>

        {/* Barra de filtros + Leyenda de 4 estados */}
        <div className="bg-light p-3 rounded-4 border mb-3">
          <Row className="g-2 align-items-center">
            <Col xs={12} md={4}>
              <div className="d-flex align-items-center gap-2">
                <FunnelFill className="text-muted" />
                <Form.Select
                  size="sm"
                  value={filtroCat}
                  onChange={(e) => setFiltroCat(e.target.value)}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      Categoría: {c}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </Col>

            <Col xs={12} md={3}>
              <Form.Select
                size="sm"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="Todos">Estado: Todos</option>
                {ESTADOS_FLUJO.map((est) => (
                  <option key={est} value={est}>
                    {est}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col
              xs={12}
              md={5}
              className="d-flex flex-wrap justify-content-md-end gap-2 mt-2 mt-md-0"
            >
              <Badge bg="light" text="dark" className="border d-flex align-items-center gap-1">
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#f97316" }} />
                Reportado
              </Badge>
              <Badge bg="light" text="dark" className="border d-flex align-items-center gap-1">
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#8b5cf6" }} />
                En revisión
              </Badge>
              <Badge bg="light" text="dark" className="border d-flex align-items-center gap-1">
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#0ea5e9" }} />
                En reparación
              </Badge>
              <Badge bg="light" text="dark" className="border d-flex align-items-center gap-1">
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#10b981" }} />
                Resuelto
              </Badge>
            </Col>
          </Row>
        </div>

        {/* Mapa Leaflet */}
        <div className="shadow-sm rounded-4 border p-1 bg-white">
          <MapaInteractivo
            modo="publico"
            reportes={filtrados}
            onVerDetalle={onVerDetalle}
            altura="450px"
          />
        </div>

        <div className="d-flex justify-content-between align-items-center mt-2 text-muted small">
          <span>
            <GeoAltFill className="text-danger me-1" />
            Mostrando <strong>{filtrados.length}</strong> incidentes dentro del
            ejido de San Miguel de Tucumán
          </span>
          <span>Agrupación espacial automática: radio de 20 m (RN-02)</span>
        </div>
      </Container>
    </section>
  );
}