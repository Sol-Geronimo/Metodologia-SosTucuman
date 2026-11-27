// src/componentes/routes/Rutas.jsx
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Navbar from "../Navbar";
import Home from "../pages/Home";
import Reportes from "../pages/Reportes";
import PanelGestion from "../pages/PanelGestion";
import Error404 from "../pages/Error404";

function NavegadorEventos() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) navigate(e.detail);
    };
    window.addEventListener("navegarRuta", handler);
    return () => window.removeEventListener("navegarRuta", handler);
  }, [navigate]);
  return null;
}

const Rutas = ({
  onAuth,
  onReport,
  activeCategory,
  setActiveCategory,
  onVerDetalle,
}) => {
  return (
    <BrowserRouter>
      <NavegadorEventos />
      <Navbar onAuth={onAuth} />
      <Routes>
        <Route
          path="/"
          element={
            <Home
              onReport={onReport}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              onVerDetalle={onVerDetalle}
            />
          }
        />
        <Route
          path="/reportes"
          element={<Reportes onVerDetalle={onVerDetalle} />}
        />
        <Route
          path="/gestion"
          element={
            <PanelGestion onAuth={onAuth} onVerDetalle={onVerDetalle} />
          }
        />
        <Route path="*" element={<Error404 />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Rutas;