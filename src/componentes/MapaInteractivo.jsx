import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  CENTRO_SMT,
  POLIGONO_EJIDO_SMT,
  estaDentroDeSMT,
} from "../utils/geoUtils";

const COLORES_ESTADO = {
  Reportado: "#f97316",
  "En revisión": "#8b5cf6",
  "En reparación": "#0ea5e9",
  Resuelto: "#10b981",
};

export default function MapaInteractivo({
  modo = "publico", // "publico" | "selector"
  reportes = [],
  coordenadaSeleccionada = null,
  onSeleccionarCoordenada = null,
  onVerDetalle = null,
  altura = "430px",
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const selectorMarkerRef = useRef(null);
  const radioCircleRef = useRef(null);

  // 1. Inicializar mapa base y polígono jurisdiccional de San Miguel de Tucumán
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const centroInicial = coordenadaSeleccionada
      ? [coordenadaSeleccionada.lat, coordenadaSeleccionada.lng]
      : [CENTRO_SMT.lat, CENTRO_SMT.lng];

    const map = L.map(mapContainerRef.current, {
      center: centroInicial,
      zoom: modo === "selector" ? 15 : 13,
      scrollWheelZoom: modo === "selector",
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap · Ejido San Miguel de Tucumán',
    }).addTo(map);

    // Polígono sutil del ejido urbano de San Miguel de Tucumán (RN-01)
    L.polygon(POLIGONO_EJIDO_SMT, {
      color: "#0ea5e9",
      weight: 2,
      dashArray: "6, 6",
      fillColor: "#0ea5e9",
      fillOpacity: 0.04,
    })
      .addTo(map)
      .bindTooltip("Jurisdicción San Miguel de Tucumán", { sticky: false });

    markersLayerRef.current = L.layerGroup().addTo(map);

    // Si es modo selector, permitir hacer clic en el mapa para ubicar el incidente
    if (modo === "selector" && onSeleccionarCoordenada) {
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        onSeleccionarCoordenada({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          valido: estaDentroDeSMT(lat, lng),
        });
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Renderizar marcadores de incidentes en modo público
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer || modo !== "publico") return;

    layer.clearLayers();

    reportes.forEach((rep) => {
      if (rep.latitud == null || rep.longitud == null) return;
      const color = COLORES_ESTADO[rep.estado] || "#64748b";

      const customIcon = L.divIcon({
        className: "sostucuman-pin",
        html: `
          <div style="
            background-color: ${color};
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid #ffffff;
            box-shadow: 0 3px 8px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="
              transform: rotate(45deg);
              color: white;
              font-size: 11px;
              font-weight: 800;
              font-family: Outfit, sans-serif;
            ">${rep.afectadosIniciales || 1}</span>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -28],
      });

      const marker = L.marker([Number(rep.latitud), Number(rep.longitud)], {
        icon: customIcon,
      });

      const popupDiv = document.createElement("div");
      popupDiv.style.minWidth = "220px";
      popupDiv.style.fontFamily = "Inter, sans-serif";
      popupDiv.innerHTML = `
        <div style="margin-bottom:6px;">
          <span style="
            background:${color}20;
            color:${color};
            font-weight:700;
            font-size:11px;
            padding:2px 8px;
            border-radius:999px;
            border:1px solid ${color}50;
          ">${rep.estado}</span>
          <span style="font-size:11px;color:#64748b;margin-left:6px;">${rep.categoria}</span>
        </div>
        <div style="font-weight:700;color:#082f49;font-size:14px;margin-bottom:4px;">
          ${rep.titulo}
        </div>
        <div style="font-size:12px;color:#475569;margin-bottom:8px;">
          📍 ${rep.ubicacion}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;font-weight:600;color:#0f172a;">
            ✋ +${rep.afectadosIniciales || 1} afectados
          </span>
          <button id="btn-detalle-${rep.id}" style="
            background:#082f49;
            color:white;
            border:none;
            border-radius:999px;
            padding:4px 12px;
            font-size:12px;
            font-weight:600;
            cursor:pointer;
          ">Ver detalle</button>
        </div>
      `;

      marker.bindPopup(popupDiv);
      marker.on("popupopen", () => {
        const btn = document.getElementById(`btn-detalle-${rep.id}`);
        if (btn && onVerDetalle) {
          btn.onclick = () => onVerDetalle(rep);
        }
      });

      marker.addTo(layer);
    });
  }, [reportes, modo, onVerDetalle]);

  // 3. Actualizar pin y círculo de 20m en modo selector
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || modo !== "selector") return;

    if (selectorMarkerRef.current) {
      selectorMarkerRef.current.remove();
      selectorMarkerRef.current = null;
    }
    if (radioCircleRef.current) {
      radioCircleRef.current.remove();
      radioCircleRef.current = null;
    }

    if (!coordenadaSeleccionada) return;

    const { lat, lng } = coordenadaSeleccionada;
    const dentro = estaDentroDeSMT(lat, lng);
    const pinColor = dentro ? "#f97316" : "#dc2626";

    const icon = L.divIcon({
      className: "sostucuman-selector-pin",
      html: `<div style="
        background:${pinColor};
        width:26px;height:26px;
        border-radius:50%;
        border:3px solid white;
        box-shadow:0 0 0 4px ${pinColor}40;
      "></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    const marker = L.marker([lat, lng], {
      draggable: true,
      icon,
    }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      if (onSeleccionarCoordenada) {
        onSeleccionarCoordenada({
          lat: Number(pos.lat.toFixed(6)),
          lng: Number(pos.lng.toFixed(6)),
          valido: estaDentroDeSMT(pos.lat, pos.lng),
        });
      }
    });

    // Círculo visual de 20 metros para deduplicación espacial (RN-02)
    const circle = L.circle([lat, lng], {
      radius: 20,
      color: dentro ? "#0ea5e9" : "#dc2626",
      fillColor: dentro ? "#0ea5e9" : "#dc2626",
      fillOpacity: 0.2,
      weight: 2,
    }).addTo(map);

    selectorMarkerRef.current = marker;
    radioCircleRef.current = circle;
    map.setView([lat, lng], Math.max(map.getZoom(), 16));
  }, [coordenadaSeleccionada, modo, onSeleccionarCoordenada]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        height: altura,
        width: "100%",
        borderRadius: "16px",
        overflow: "hidden",
        zIndex: 1,
      }}
    />
  );
}