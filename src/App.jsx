// src/App.jsx
import { useState, useEffect } from "react";
import AuthModal from "./componentes/Modal-login";
import ReportModal from "./componentes/Modal-reporte";
import ModalDetalleIncidente from "./componentes/Modal-detalle-incidente";
import Rutas from "./componentes/routes/Rutas";

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const handleOpenAuth = () => setShowAuthModal(true);
  const handleCloseAuth = () => setShowAuthModal(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const handleOpenReport = () => setShowReportModal(true);
  const handleCloseReport = () => setShowReportModal(false);

  const [reporteDetalle, setReporteDetalle] = useState(null);
  const handleVerDetalle = (rep) => setReporteDetalle(rep);
  const handleCerrarDetalle = () => setReporteDetalle(null);

  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    window.addEventListener("abrirModalAuth", handleOpenAuth);
    window.addEventListener("abrirModalReporte", handleOpenReport);
    return () => {
      window.removeEventListener("abrirModalAuth", handleOpenAuth);
      window.removeEventListener("abrirModalReporte", handleOpenReport);
    };
  }, []);

  return (
    <>
      <AuthModal show={showAuthModal} onHide={handleCloseAuth} />
      <ReportModal show={showReportModal} onHide={handleCloseReport} />
      <ModalDetalleIncidente
        show={Boolean(reporteDetalle)}
        onHide={handleCerrarDetalle}
        reporte={reporteDetalle}
      />

      <Rutas
        onAuth={handleOpenAuth}
        onReport={handleOpenReport}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        onVerDetalle={handleVerDetalle}
      />
    </>
  );
}

export default App;