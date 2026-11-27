import { useState, useEffect } from "react";
import { Navbar, Nav, Container, Button, NavDropdown, Badge } from "react-bootstrap";
import logoImg from "../assets/imagenes/LOGOO.png";
import { Link, useLocation } from "react-router-dom";
import { ControladorAutenticacion } from "../services/api";

export default function NavigationBar({ onAuth }) {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [usuario, setUsuario] = useState(null);

  const esRutaInterna = location.pathname !== "/";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const chequearUsuario = () => {
      setUsuario(ControladorAutenticacion.obtenerSesionActual());
    };
    chequearUsuario();
    window.addEventListener("usuarioActualizado", chequearUsuario);
    return () =>
      window.removeEventListener("usuarioActualizado", chequearUsuario);
  }, []);

  const cerrarSesion = () => {
    ControladorAutenticacion.cerrarSesion();
    setUsuario(null);
  };

  const esOperador =
    usuario && (usuario.rol === "moderador" || usuario.rol === "cuadrilla");

  return (
    <Navbar
      expand="md"
      fixed="top"
      variant="dark"
      style={{
        transition: "all 0.4s ease",
        padding: scrolled || esRutaInterna ? "0.75rem 0" : "1.25rem 0",
        background:
          scrolled || esRutaInterna ? "rgba(8, 47, 73, 0.98)" : "transparent",
        backdropFilter: scrolled || esRutaInterna ? "blur(12px)" : "none",
        borderBottom:
          scrolled || esRutaInterna
            ? "1px solid rgba(255,255,255,0.1)"
            : "none",
      }}
    >
      <Container>
        <Navbar.Brand
          as={Link}
          to="/"
          className="d-flex align-items-center gap-2"
          style={{ textDecoration: "none" }}
        >
          <img
            src={logoImg}
            alt="Logo SosTucumán"
            height="36"
            className="d-inline-block align-top rounded-3"
          />
          <span
            style={{
              fontFamily: "Outfit, sans-serif",
              fontWeight: 800,
              fontSize: "1.2rem",
              color: "white",
            }}
          >
            Sos<span style={{ color: "#f97316" }}>Tucumán</span>
          </span>
        </Navbar.Brand>

        <Navbar.Toggle
          aria-controls="menu-navegacion"
          className="border-0 shadow-none"
        />

        <Navbar.Collapse id="menu-navegacion">
          <Nav className="mx-auto gap-2 gap-md-4 text-center my-3 my-md-0">
            <Nav.Link as={Link} to="/" className="text-white fw-medium">
              Inicio
            </Nav.Link>
            <Nav.Link as={Link} to="/reportes" className="text-white fw-medium">
              Mapa y Reportes
            </Nav.Link>
            {esOperador && (
              <Nav.Link
                as={Link}
                to="/gestion"
                className="fw-bold"
                style={{ color: "#fb923c" }}
              >
                Panel de Gestión
              </Nav.Link>
            )}
          </Nav>

          <div className="d-flex flex-column flex-md-row align-items-center gap-2">
            {!usuario ? (
              <>
                <Button
                  onClick={onAuth}
                  variant="outline-light"
                  style={{
                    borderRadius: "50px",
                    fontFamily: "Outfit",
                    fontWeight: 600,
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  Iniciar sesión
                </Button>
                <Button
                  onClick={onAuth}
                  className="text-white"
                  style={{
                    borderRadius: "50px",
                    fontFamily: "Outfit",
                    fontWeight: 600,
                    background: "#f97316",
                    border: "none",
                  }}
                >
                  Registrarse
                </Button>
              </>
            ) : (
              <NavDropdown
                align="end"
                title={
                  <div className="d-flex align-items-center gap-2 d-inline-flex">
                    <span
                      className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center fw-bold shadow-sm"
                      style={{
                        width: "35px",
                        height: "35px",
                        fontSize: "0.95rem",
                      }}
                    >
                      {usuario.nombre.charAt(0).toUpperCase()}
                    </span>
                    <span
                      className="d-none d-sm-inline-block text-truncate"
                      style={{
                        maxWidth: "130px",
                        color: "white",
                        fontFamily: "Outfit",
                        fontWeight: 500,
                      }}
                    >
                      {usuario.nombre.split(" ")[0]}
                    </span>
                  </div>
                }
                id="user-dropdown"
              >
                <div className="px-3 py-2 border-bottom bg-light">
                  <p
                    className="mb-0 fw-bold text-dark text-truncate"
                    style={{ fontSize: "0.95rem" }}
                  >
                    {usuario.nombre}
                  </p>
                  <small
                    className="text-muted text-truncate d-block mb-1"
                    style={{ fontSize: "0.8rem" }}
                  >
                    {usuario.email}
                  </small>
                  <Badge bg={esOperador ? "warning" : "info"} text="dark">
                    Rol: {usuario.rol.toUpperCase()}
                  </Badge>
                </div>

                {esOperador && (
                  <NavDropdown.Item
                    as={Link}
                    to="/gestion"
                    className="py-2 fw-bold text-primary"
                  >
                    Panel de Gestión (CU-04)
                  </NavDropdown.Item>
                )}

                <NavDropdown.Item
                  as={Link}
                  to="/reportes"
                  state={{ tabActiva: "mis-reportes" }}
                  className="py-2 fw-medium"
                >
                  Mis reportes
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item
                  onClick={cerrarSesion}
                  className="text-danger py-2 fw-medium"
                >
                  Cerrar sesión
                </NavDropdown.Item>
              </NavDropdown>
            )}
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}