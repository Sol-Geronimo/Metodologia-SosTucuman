import { useState } from "react";
import { Modal, Button, Form, Tabs, Tab, Badge } from "react-bootstrap";
import { Google, ShieldLockFill } from "react-bootstrap-icons";
import Swal from "sweetalert2";
import { ControladorAutenticacion } from "../services/api";

export default function AuthModal({ show, onHide }) {
    const [tabActiva, setTabActiva] = useState("login");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nombre, setNombre] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [rol, setRol] = useState("vecino");

    const esEmailValido = (valor) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());

    const finalizarAcceso = (sesion, saludo) => {
        Swal.fire({
            icon: "success",
            title: saludo,
            text: `Bienvenido/a, ${sesion.nombre} (${sesion.rol.toUpperCase()})`,
            timer: 1800,
            showConfirmButton: false,
        });

        onHide();
        limpiarFormulario();

        // Postcondición CU-01: Redirigir a la vista correspondiente a su rol
        if (sesion.rol === "moderador" || sesion.rol === "cuadrilla") {
            window.dispatchEvent(
                new CustomEvent("navegarRuta", { detail: "/gestion" })
            );
        }
    };

    // --- FLUJO PRINCIPAL CU-01: Correo y contraseña ---
    const handleLogin = async (e) => {
        e.preventDefault();

        if (!esEmailValido(email) || password.trim().length < 4) {
            Swal.fire({
                icon: "warning",
                title: "Datos incompletos",
                text: "Por favor, revisá tu correo y contraseña.",
            });
            return;
        }

        try {
            const sesion = await ControladorAutenticacion.autenticarUsuario(
                email,
                password
            );
            finalizarAcceso(sesion, "Inicio de sesión exitoso");
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Acceso denegado",
                text: error.message || "Credenciales incorrectas o usuario no registrado.",
            });
        }
    };

    // --- FLUJO ALTERNATIVO / OAUTH 2.0: Google Sign-In (RF-01) ---
    const handleGoogleSignIn = async () => {
        const { value: formValues } = await Swal.fire({
            title: "Ingresar con Google (OAuth 2.0)",
            html: `
        <p class="small text-muted mb-2">Seleccioná o ingresá tu cuenta de Google vinculada:</p>
        <input id="swal-google-name" class="swal2-input" placeholder="Nombre completo" value="Vecino Google Tucumán">
        <input id="swal-google-email" class="swal2-input" placeholder="cuenta@gmail.com" value="vecino.tucuman@gmail.com">
      `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: "Continuar con Google",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#0ea5e9",
            preConfirm: () => {
                const gName = document.getElementById("swal-google-name").value.trim();
                const gEmail = document.getElementById("swal-google-email").value.trim();
                if (!gName || !esEmailValido(gEmail)) {
                    Swal.showValidationMessage("Ingresá un nombre y un correo Gmail válido");
                    return false;
                }
                return { nombre: gName, email: gEmail };
            },
        });

        if (formValues) {
            try {
                const sesion = await ControladorAutenticacion.autenticarConGoogle(
                    formValues
                );
                finalizarAcceso(sesion, "Inicio de sesión exitoso con Google");
            } catch {
                Swal.fire({
                    icon: "error",
                    title: "Error de autenticación",
                    text: "No se pudo validar el token OAuth con el servidor.",
                });
            }
        }
    };

    // --- REGISTRO CON ROL ---
    const handleRegistro = async (e) => {
        e.preventDefault();

        if (
            nombre.trim().length < 3 ||
            !esEmailValido(email) ||
            password.length < 6 ||
            confirmPassword !== password
        ) {
            Swal.fire({
                icon: "warning",
                title: "Revisá tus datos",
                text: "Completá todos los campos (contraseña mínimo 6 caracteres) y verificá que coincidan.",
            });
            return;
        }

        try {
            const sesion = await ControladorAutenticacion.registrarUsuario({
                nombre,
                email,
                password,
                rol,
            });
            finalizarAcceso(sesion, "¡Cuenta creada!");
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error al registrar",
                text: error.message,
            });
        }
    };

    const autocompletarDemo = (correoDemo) => {
        setEmail(correoDemo);
        setPassword("password123");
    };

    const limpiarFormulario = () => {
        setEmail("");
        setPassword("");
        setNombre("");
        setConfirmPassword("");
        setRol("vecino");
    };

    return (
        <Modal
            show={show}
            onHide={() => {
                onHide();
                limpiarFormulario();
            }}
            centered
            style={{ fontFamily: "Inter, sans-serif" }}
        >
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title
                    style={{ fontFamily: "Outfit", fontWeight: 800, color: "#082f49" }}
                >
                    Tu cuenta SoSTucumán
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="px-4 pb-4">
                {/* Botón Google Sign-In (RF-01 / CU-01) */}
                <Button
                    variant="outline-dark"
                    onClick={handleGoogleSignIn}
                    className="w-100 rounded-3 fw-semibold py-2 mb-3 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                >
                    <Google className="text-danger" />
                    <span>Ingresar con Google</span>
                </Button>

                <div className="text-center text-muted small mb-3">
                    — o con tu correo institucional / ciudadano —
                </div>

                <Tabs
                    activeKey={tabActiva}
                    onSelect={(k) => setTabActiva(k)}
                    className="mb-3 nav-fill"
                >
                    <Tab
                        eventKey="login"
                        title={<span className="fw-semibold">Iniciar sesión</span>}
                    >
                        <Form onSubmit={handleLogin} noValidate>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold small">
                                    Correo electrónico
                                </Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="vos@correo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold small">
                                    Contraseña
                                </Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </Form.Group>
                            <Button
                                type="submit"
                                variant="primary"
                                className="w-100 mt-1 rounded-3 fw-bold border-0"
                                style={{ backgroundColor: "#082f49" }}
                            >
                                Ingresar
                            </Button>
                        </Form>

                        {/* Accesos rápidos de evaluación por rol RBAC (RNF-03) */}
                        <div className="mt-3 pt-3 border-top">
                            <div className="small text-muted fw-semibold mb-2 d-flex align-items-center gap-1">
                                <ShieldLockFill /> Cuentas de prueba por rol (RBAC):
                            </div>
                            <div className="d-flex flex-wrap gap-1">
                                <Badge
                                    bg="info"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => autocompletarDemo("sol@sostucuman.com.ar")}
                                >
                                    Vecino
                                </Badge>
                                <Badge
                                    bg="primary"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => autocompletarDemo("moderador@smt.gob.ar")}
                                >
                                    Moderador Municipal
                                </Badge>
                                <Badge
                                    bg="warning"
                                    text="dark"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => autocompletarDemo("cuadrilla@smt.gob.ar")}
                                >
                                    Cuadrilla Operativa
                                </Badge>
                            </div>
                        </div>
                    </Tab>

                    <Tab
                        eventKey="registro"
                        title={<span className="fw-semibold">Registrarse</span>}
                    >
                        <Form onSubmit={handleRegistro} noValidate>
                            <Form.Group className="mb-2">
                                <Form.Label className="fw-semibold small">
                                    Nombre y apellido
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Ej: Sofía Pérez"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label className="fw-semibold small">
                                    Correo electrónico
                                </Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="vos@correo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label className="fw-semibold small">
                                    Rol en la plataforma
                                </Form.Label>
                                <Form.Select
                                    value={rol}
                                    onChange={(e) => setRol(e.target.value)}
                                >
                                    <option value="vecino">Vecino / Ciudadano</option>
                                    <option value="moderador">Moderador Municipal</option>
                                    <option value="cuadrilla">Cuadrilla Operativa</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label className="fw-semibold small">
                                    Contraseña
                                </Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Mínimo 6 caracteres"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold small">
                                    Repetir contraseña
                                </Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </Form.Group>
                            <Button
                                type="submit"
                                className="w-100 rounded-3 fw-bold border-0"
                                style={{ backgroundColor: "#f97316" }}
                            >
                                Crear cuenta
                            </Button>
                        </Form>
                    </Tab>
                </Tabs>
            </Modal.Body>
        </Modal>
    );
}