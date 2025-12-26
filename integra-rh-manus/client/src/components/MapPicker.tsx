import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Map as MapIcon, X } from "lucide-react";

// Fijar ícono predeterminado de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number } | null) => void;
  address: string; // dirección para geocodificación
  disabled?: boolean;
}

/** Componente auxiliar para capturar clics en el mapa */
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Componente auxiliar para centrar el mapa */
function MapCenter({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], 16);
  }, [center, map]);
  return null;
}

export function MapPicker({ value, onChange, address, disabled }: MapPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 19.4326,
    lng: -99.1332,
  }); // Centro en Ciudad de México por defecto
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(value);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Si hay coordenadas guardadas, usar esas
  useEffect(() => {
    if (value) {
      setSelectedCoords(value);
      setMapCenter(value);
    }
  }, [value]);

  // Geocodificar dirección
  const handleGeocodeAddress = async () => {
    if (!address || address.trim().length < 5) {
      setSearchError("Por favor, completa la dirección");
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      // Limpiar la dirección para mejorar la búsqueda
      const cleanAddress = address
        .replace(/#/g, " ")  // Quitar #
        .replace(/\s+/g, " ") // Normalizar espacios
        .trim();
      
      // Agregar México para dar contexto geográfico
      const searchQuery = `${cleanAddress}, México`;
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=mx`
      );
      const data = await response.json();

      if (data.length > 0) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setMapCenter(coords);
        setSelectedCoords(coords);
        setSearchError(null);
      } else {
        // Si no encuentra, intentar con solo colonia, municipio, estado
        const parts = cleanAddress.split(",").map(p => p.trim());
        if (parts.length >= 3) {
          // Tomar los últimos 3 elementos (colonia, municipio, estado)
          const fallbackQuery = parts.slice(-3).join(", ") + ", México";
          const fallbackResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackQuery)}&limit=1&countrycodes=mx`
          );
          const fallbackData = await fallbackResponse.json();
          
          if (fallbackData.length > 0) {
            const coords = { lat: parseFloat(fallbackData[0].lat), lng: parseFloat(fallbackData[0].lon) };
            setMapCenter(coords);
            setSelectedCoords(coords);
            setSearchError("Ubicación aproximada. Ajusta el pin a tu dirección exacta.");
          } else {
            setSearchError("No se encontró la dirección. Haz clic en el mapa para ubicar manualmente.");
          }
        } else {
          setSearchError("No se encontró la dirección. Haz clic en el mapa para ubicar manualmente.");
        }
      }
    } catch (error) {
      setSearchError("Error al buscar la dirección");
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  // Guardar y cerrar
  const handleSaveLocation = () => {
    if (selectedCoords) {
      onChange(selectedCoords);
    }
    setIsOpen(false);
  };

  // Limpiar ubicación
  const handleClearLocation = () => {
    onChange(null);
    setSelectedCoords(null);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label>Ubicación en el Mapa</Label>
      
      {/* Botón para abrir mapa */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <MapIcon className="h-4 w-4" />
          {selectedCoords ? "Ajustar ubicación" : "Seleccionar en mapa"}
        </Button>
        {selectedCoords && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearLocation}
            disabled={disabled}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Mostrar coordenadas guardadas */}
      {selectedCoords && (
        <p className="text-xs text-muted-foreground">
          Ubicación guardada: {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
        </p>
      )}

      {/* Modal con mapa */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="border-b p-4 flex items-center justify-between">
              <h3 className="font-semibold">Localizar dirección en el mapa</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Search bar */}
            <div className="border-b p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                {address || "Completa la dirección para localizarla en el mapa"}
              </p>
              {address && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGeocodeAddress}
                    disabled={isSearching}
                  >
                    {isSearching ? "Buscando..." : "Buscar dirección"}
                  </Button>
                </div>
              )}
              {searchError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                  <AlertCircle className="h-4 w-4" />
                  {searchError}
                </div>
              )}
            </div>

            {/* Mapa */}
            <div style={{ height: "400px", width: "100%" }}>
              <MapContainer 
                center={[mapCenter.lat, mapCenter.lng]} 
                zoom={16} 
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                {selectedCoords && (
                  <Marker position={[selectedCoords.lat, selectedCoords.lng]} />
                )}
                <MapClickHandler
                  onLocationSelect={(coords) => {
                    setSelectedCoords(coords);
                    setMapCenter(coords);
                  }}
                />
                <MapCenter center={mapCenter} />
              </MapContainer>
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex gap-2 justify-end bg-gray-50">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveLocation}
                disabled={!selectedCoords}
              >
                Guardar ubicación
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
