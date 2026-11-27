import Hero from "../Inicio";
import Categorias from "../Categorias";
import MapaPublico from "../MapaPublico";
import ComoFunciona from "../Como-funciona";
import CarruselReportes from "../Reportes-activos";
import TodosLosReportes from "../Todos-los-reportes";
import Footer from "../Footer";

export default function Home({
  onReport,
  activeCategory,
  setActiveCategory,
  onVerDetalle,
}) {
  const handleSeleccionarCategoria = (catId) => {
    setActiveCategory(catId);
    const seccionReportes = document.getElementById("reportes");
    if (seccionReportes && catId) {
      seccionReportes.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <Hero onReport={onReport} />
      <Categorias
        activeCategory={activeCategory}
        setActiveCategory={handleSeleccionarCategoria}
      />
      <MapaPublico onReport={onReport} onVerDetalle={onVerDetalle} />
      <ComoFunciona />
      <CarruselReportes
        onReport={onReport}
        activeCategory={activeCategory}
        onVerDetalle={onVerDetalle}
      />
      <TodosLosReportes />
      <Footer />
    </>
  );
}