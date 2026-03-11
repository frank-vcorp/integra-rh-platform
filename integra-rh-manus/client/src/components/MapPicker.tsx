import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Map as MapIcon, X } from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}

interface MapPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number } | null) => void;
  address: string; // dirección para geocodificación
  disabled?: boolean;
}

export function MapPicker({ value, onChange, address, disabled }: MapPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 19.4326,
    lng: -99.1332,
  });
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(value);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState(address);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Cargar Google Maps API
  useEffect(() => {
    if (!window.google) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
      
      if (!apiKey) {
        console.error('VITE_GOOGLE_MAPS_API_KEY no está configurada en import.meta.env');
        setSearchError('Error de configuración: API Key faltante. Contacte a soporte.');
        return;
      }
      
      // Evitar inyectar script duplicado si ya existe en DOM
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
         return;
      }

      const script = document.createElement('script');
      // Adding loading=async based on best practices
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.maps) {
          geocoderRef.current = new window.google.maps.Geocoder();
          // Forzar re-render si es necesario
          setIsOpen(prev => prev); 
        }
      };
      script.onerror = (e) => {
        console.error('Error cargando script Google Maps:', e);
        setSearchError('Error de red al cargar Google Maps API');
      };
      document.head.appendChild(script);
    } else if (window.google?.maps && !geocoderRef.current) {
        // Si ya está cargado pero no tenemos geocoder
        geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, [isOpen]);

  // Si hay coordenadas guardadas, usar esas
  useEffect(() => {
    if (value) {
      setSelectedCoords(value);
      setMapCenter(value);
    }
  }, [value]);

  // Autocompletar mientras escribe (usando nueva API AutocompleteSuggestion)
  const handleSearchChange = async (query: string) => {
    setSearchInput(query);
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    if (!window.google?.maps) {
      console.warn('Google Maps API no está listo');
      return;
    }

    try {
      // Usar la nueva API AutocompleteSuggestion (recomendado desde Mar 2025)
      // Utilizar window.google para evitar errores de tipo si no existen las definiciones globales
      const { AutocompleteSuggestion, AutocompleteSessionToken } = await window.google.maps.importLibrary("places") as any;
      const sessionToken = new AutocompleteSessionToken();
      
      const request = {
        input: query,
        sessionToken,
        includedRegionCodes: ["mx"], // Restringir a México
        language: "es-419", // Español latinoamericano
      };

      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      
      // Mapear resultado al formato esperado por el componente
      const mappedSuggestions = suggestions.map((s: any) => ({
        place_id: s.placePrediction.placeId,
        main_text: s.placePrediction.mainText.text,
        secondary_text: s.placePrediction.secondaryText.text,
        description: s.placePrediction.text.text
      }));

      setSuggestions(mappedSuggestions);
    } catch (error) {
      console.error('Autocomplete error:', error);
      setSuggestions([]);
    }
  };

  // Geocodificar cuando selecciona una sugerencia
  const handleSelectSuggestion = async (placeId: string) => {
    if (!geocoderRef.current) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await new Promise<google.maps.GeocoderResult[]>((resolve) => {
        geocoderRef.current?.geocode({ placeId }, (results) => {
          resolve(results || []);
        });
      });

      if (results && results.length > 0) {
        const location = results[0].geometry.location;
        const coords = { lat: location.lat(), lng: location.lng() };
        setMapCenter(coords);
        setSelectedCoords(coords);
        setSearchError(null);
        setSuggestions([]);
        setSearchInput(results[0].formatted_address);
      } else {
        setSearchError('No se encontró la ubicación');
      }
    } catch (error) {
      setSearchError('Error al geocodificar: ' + (error as Error).message);
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  // Geocodificar dirección completa
  const handleGeocodeAddress = async () => {
    if (!searchInput || searchInput.trim().length < 5) {
      setSearchError("Por favor, completa la dirección");
      return;
    }

    if (!geocoderRef.current) {
      setSearchError("Google Maps no está listo");
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await new Promise<google.maps.GeocoderResult[]>((resolve) => {
        geocoderRef.current?.geocode(
          {
            address: searchInput,
            componentRestrictions: { country: 'mx' },
          },
          (results) => {
            resolve(results || []);
          }
        );
      });

      if (results && results.length > 0) {
        const location = results[0].geometry.location;
        const coords = { lat: location.lat(), lng: location.lng() };
        setMapCenter(coords);
        setSelectedCoords(coords);
        setSearchError(null);
        setSearchInput(results[0].formatted_address);
      } else {
        setSearchError('No se encontró la dirección. Verifica que sea una dirección válida en México.');
      }
    } catch (error) {
      setSearchError('Error al buscar: ' + (error as Error).message);
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
              <div className="relative">
                <Input
                  placeholder="Busca tu dirección..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGeocodeAddress();
                  }}
                  disabled={isSearching}
                  className="pr-10"
                />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-md shadow-lg z-10 max-h-48 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.place_id}
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion.place_id)}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                      >
                        <p className="font-medium">{suggestion.main_text}</p>
                        <p className="text-xs text-gray-500">{suggestion.secondary_text}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {searchInput && !suggestions.length && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGeocodeAddress}
                  disabled={isSearching}
                  className="w-full"
                >
                  {isSearching ? "Buscando..." : "Buscar dirección exacta"}
                </Button>
              )}

              {searchError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                  <AlertCircle className="h-4 w-4" />
                  {searchError}
                </div>
              )}
            </div>

            {/* Google Maps */}
            <div style={{ height: "400px", width: "100%" }} id="google-map-container">
              {mapCenter && (
                <div style={{
                  width: "100%",
                  height: "100%",
                  background: "#f0f0f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#666",
                }}>
                  📍 {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
                  <p style={{ fontSize: "12px", marginTop: "8px", textAlign: "center" }}>
                    (Google Maps se mostrará aquí cuando selecciones una dirección)
                  </p>
                </div>
              )}
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
