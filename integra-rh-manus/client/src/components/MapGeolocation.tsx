import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapGeolocationProps {
  onCoordinatesChange?: (lat: number, lng: number, address?: string) => void;
  initialLat?: number;
  initialLng?: number;
  height?: string;
  autoZoomToAddress?: string; // Dirección para geocodificar automáticamente
}

const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapGeolocation: React.FC<MapGeolocationProps> = ({
  onCoordinatesChange,
  initialLat = 19.4326,
  initialLng = -99.1332,
  height = '400px',
  autoZoomToAddress,
}) => {
  const [position, setPosition] = useState<[number, number]>([initialLat, initialLng]);
  const [loading, setLoading] = useState(true);
  const [geoMessage, setGeoMessage] = useState('');
  const mapRef = useRef(null);
  const geoAttempted = useRef(false);

  // Función para geocodificar una dirección usando fetch directo (evita caché de tRPC)
  const geocodeAddress = async (address: string) => {
    if (!address || address.trim().length < 5) return;
    
    try {
      setLoading(true);
      setGeoMessage(`Buscando: ${address}...`);
      
      // URLs a intentar en orden
      const urls = [
        'https://integra-rh-backend-559788019343.us-central1.run.app/api/trpc/geolocation.geocodeAddress',
        '/api/trpc/geolocation.geocodeAddress', // fallback a local
      ];
      
      let lastError = null;
      for (const baseUrl of urls) {
        try {
          // Construir URL con parámetros (GET para queries en tRPC)
          const params = new URLSearchParams({
            input: JSON.stringify({
              json: { address },
            }),
          });
          
          const response = await fetch(`${baseUrl}?${params.toString()}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });

          if (!response.ok) {
            lastError = new Error(`Status ${response.status}`);
            continue;
          }

          const data = await response.json();
          
          // En tRPC, la respuesta viene directamente (es un objeto, no un array)
          if (data?.result?.data?.json?.success && data?.result?.data?.json?.lat && data?.result?.data?.json?.lng) {
            const newLat = data.result.data.json.lat;
            const newLng = data.result.data.json.lng;
            setPosition([newLat, newLng]);
            onCoordinatesChange?.(newLat, newLng, address);
            setGeoMessage('');
            setLoading(false);
            return;
          } else if (data?.result?.data?.json?.error) {
            setGeoMessage(data.result.data.json.error);
            setLoading(false);
            return;
          }
        } catch (error) {
          lastError = error;
          continue;
        }
      }

      // Si llegamos aquí, ninguna URL funcionó
      const errorMsg = lastError ? `Error: ${lastError.message}` : 'Dirección no encontrada. Intenta con otro formato.';
      setGeoMessage(errorMsg);
      console.error('Geocoding error:', lastError);
    } finally {
      setLoading(false);
    }
  };

  // Solo intenta GPS UNA SOLA VEZ al montar el componente
  useEffect(() => {
    if (geoAttempted.current) return; // No reintentar si ya se intentó
    geoAttempted.current = true;

    // NO intenta GPS automáticamente, solo usa la ubicación por defecto
    setGeoMessage('');
    setLoading(false);
  }, []);

  // Efecto para geocodificar automáticamente cuando cambia la dirección
  useEffect(() => {
    if (autoZoomToAddress && autoZoomToAddress.trim().length > 0) {
      // Debounce: espera 500ms después de que deje de cambiar
      const timer = setTimeout(() => {
        geocodeAddress(autoZoomToAddress);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoZoomToAddress]);

  const handleMapClick = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onCoordinatesChange?.(lat, lng);
  };

  if (loading) {
    return (
      <div
        style={{ height }}
        className="w-full bg-gray-100 rounded-lg flex items-center justify-center"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">{geoMessage || 'Cargando mapa...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-300 shadow-sm">
      <MapContainer
        center={position}
        zoom={17}
        style={{ height, width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold mb-1">Tu ubicación</p>
              <p>Lat: {position[0].toFixed(6)}</p>
              <p>Lng: {position[1].toFixed(6)}</p>
              <p className="text-xs text-gray-500 mt-2">Haz clic en el mapa para marcar otra ubicación</p>
            </div>
          </Popup>
        </Marker>
        <MapClickHandler onMapClick={handleMapClick} />
      </MapContainer>
      <div className="bg-blue-50 p-3 text-xs text-gray-700 border-t border-gray-300">
        <p className="font-semibold mb-1">📍 Ubicación actual:</p>
        <p>Latitud: <span className="font-mono">{position[0].toFixed(6)}</span></p>
        <p>Longitud: <span className="font-mono">{position[1].toFixed(6)}</span></p>
        <p className="text-gray-500 mt-2">Haz clic en el mapa para cambiar la ubicación</p>
      </div>
    </div>
  );
};

export default MapGeolocation;
