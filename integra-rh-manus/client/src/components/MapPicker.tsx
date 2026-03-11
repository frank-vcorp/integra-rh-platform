/*
 * ID: FIX-20251218-02
 * Archivo: client/src/components/MapPicker.tsx
 * Descripción: Corrección crítica de visualización de mapa interactivo, inicialización de Marker y versión de API.
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Map as MapIcon, X, Loader2, Search } from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}

interface MapPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number } | null) => void;
  address: string;
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
  const [searchInput, setSearchInput] = useState(address || "");
  const [isMapReady, setIsMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerInstanceRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (value) {
      setSelectedCoords(value);
      setMapCenter(value);
    }
  }, [value]);

  useEffect(() => {
    if (isOpen && address && !searchInput) {
      setSearchInput(address);
    }
  }, [isOpen, address]);

  // Cleanup map instance when modal closes to force re-init on reopen
  useEffect(() => {
    if (!isOpen) {
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
        setIsMapReady(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (!window.google?.maps) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
      if (!apiKey) {
        console.warn("API Key de Google Maps no detectada. El mapa podría no cargar correctamente.");
      }
      
      if (!document.querySelector("script[src*=\"maps.googleapis.com\"]")) {
        const script = document.createElement("script");
        script.src = "https://maps.googleapis.com/maps/api/js?key=" + apiKey + "&libraries=places,marker&v=weekly&loading=async";
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    // Only init if open and container is mounted
    if (!isOpen || !mapContainerRef.current) return;

    const initMap = async () => {
      try {
        if (!window.google?.maps) {
            await new Promise((resolve) => {
               const check = setInterval(() => {
                   if (window.google?.maps) {
                       clearInterval(check);
                       resolve(null);
                   }
               }, 100);
            });
        }

        const { Map } = await window.google.maps.importLibrary("maps");
        const { Marker } = await window.google.maps.importLibrary("marker");
        const { Geocoder } = await window.google.maps.importLibrary("geocoding");

        geocoderRef.current = new Geocoder();

        if (!mapInstanceRef.current && mapContainerRef.current) {
            const map = new Map(mapContainerRef.current, {
                center: mapCenter,
                zoom: 15,
                mapId: "INTEGRA_RH_MAP_ID",
                disableDefaultUI: false,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
            });

            map.addListener("click", (e) => {
                if (e.latLng) {
                    updateMarker(e.latLng);
                }
            });

            mapInstanceRef.current = map;
        }

        if (mapInstanceRef.current && !markerInstanceRef.current) {
            const marker = new Marker({
                position: mapCenter,
                map: mapInstanceRef.current,
                draggable: true,
                title: "Ubicación seleccionada",
                animation: google.maps.Animation.DROP
            });

            marker.addListener("dragend", () => {
                const pos = marker.getPosition();
                if (pos) {
                    updateMarker(pos);
                }
            });

            markerInstanceRef.current = marker;
        }

        setIsMapReady(true);

      } catch (e) {
        console.error("Error al inicializar mapa:", e);
        setSearchError("No se pudo cargar el mapa interactivo");
      }
    };

    initMap();
  }, [isOpen]); // Depend on isOpen to trigger validation of refs

  useEffect(() => {
      if (mapInstanceRef.current && markerInstanceRef.current && mapCenter) {
          mapInstanceRef.current.panTo(mapCenter);
          markerInstanceRef.current.setPosition(mapCenter);
          mapInstanceRef.current.setZoom(17);
      }
  }, [mapCenter]);

  const updateMarker = (latLng) => {
      const newCoords = { lat: latLng.lat(), lng: latLng.lng() };
      setSelectedCoords(newCoords);
      markerInstanceRef.current?.setPosition(latLng);
  };

  const handleSearchChange = async (query) => {
    setSearchInput(query);
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    if (!window.google?.maps) return;

    try {
      const { AutocompleteSuggestion, AutocompleteSessionToken } = await window.google.maps.importLibrary("places");
      const sessionToken = new AutocompleteSessionToken();
      
      const request = {
        input: query,
        sessionToken,
        includedRegionCodes: ["mx"],
        language: "es-419",
      };

      const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      
      const mapped = results.map((s) => ({
        place_id: s.placePrediction.placeId,
        main_text: s.placePrediction.mainText.text,
        secondary_text: s.placePrediction.secondaryText.text,
        description: s.placePrediction.text.text
      }));

      setSuggestions(mapped);
    } catch (error) {
      console.warn("Error en autocomplete:", error);
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = async (placeId) => {
    if (!geocoderRef.current) {
        setSearchError("El servicio de geocodificación no está listo.");
        return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
       const results = await new Promise((resolve, reject) => {
           geocoderRef.current.geocode({ placeId }, (res, status) => {
               if (status === "OK" && res) resolve(res);
               else reject(new Error(status));
           });
       });

       if (results && results.length > 0) {
           const loc = results[0].geometry.location;
           const newPos = { lat: loc.lat(), lng: loc.lng() };
           
           setMapCenter(newPos);
           setSelectedCoords(newPos);
           setSearchInput(results[0].formatted_address);
           setSuggestions([]);
       }
    } catch (e) {
        setSearchError("Error al obtener detalles del lugar: " + e.message);
    } finally {
        setIsSearching(false);
    }
  };

  const handleGeocodeAddress = async () => {
      if (!searchInput || searchInput.length < 4) return;
      if (!geocoderRef.current) return;

      setIsSearching(true);
      setSearchError(null);

      try {
          const results = await new Promise((resolve, reject) => {
              geocoderRef.current.geocode({ 
                  address: searchInput, 
                  componentRestrictions: { country: "mx" } 
              }, (res, status) => {
                  if (status === "OK" && res) resolve(res);
                  else reject(new Error(status));
              });
          });

          if (results.length > 0) {
              const loc = results[0].geometry.location;
              const newPos = { lat: loc.lat(), lng: loc.lng() };
              setMapCenter(newPos);
              setSelectedCoords(newPos);
              setSearchInput(results[0].formatted_address);
          } else {
              setSearchError("No se encontró la dirección especificada.");
          }
      } catch (e) {
          setSearchError("Error: " + e.message);
      } finally {
          setIsSearching(false);
      }
  };

  const handleSave = () => {
      if (selectedCoords) onChange(selectedCoords);
      setIsOpen(false);
  };

  const handleClear = () => {
      onChange(null);
      setSelectedCoords(null);
      setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label>Ubicación (Google Maps)</Label>
      
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
                onClick={handleClear}
                disabled={disabled}
                className="text-red-600 hover:bg-red-50"
            >
                <X className="h-4 w-4" />
            </Button>
        )}
      </div>

      {selectedCoords && (
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <MapIcon className="w-3 h-3" />
            <span>Lat: {selectedCoords.lat.toFixed(5)}, Lng: {selectedCoords.lng.toFixed(5)}</span>
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="border-b p-4 flex justify-between items-center bg-gray-50">
                <div>
                    <h3 className="font-bold text-lg">Seleccionar Ubicación</h3>
                    <p className="text-sm text-gray-500">Busca una dirección o arrastra el pin en el mapa</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="h-5 w-5" />
                </Button>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {/* Buscador */}
                <div className="relative z-10">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                                placeholder="Escribe para buscar calle, colonia..." 
                                value={searchInput}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleGeocodeAddress()}
                                className="pl-9"
                            />
                        </div>
                        <Button type="button" onClick={handleGeocodeAddress} disabled={isSearching}>
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                        </Button>
                    </div>

                    {/* Sugerencias */}
                    {suggestions.length > 0 && (
                        <div className="absolute top-12 left-0 right-0 bg-white border rounded-lg shadow-xl max-h-60 overflow-y-auto z-20">
                            {suggestions.map((s) => (
                                <button
                                    key={s.place_id}
                                    type="button"
                                    onClick={() => handleSelectSuggestion(s.place_id)}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-b-0 transition-colors"
                                >
                                    <p className="font-medium text-sm text-gray-900">{s.main_text}</p>
                                    <p className="text-xs text-gray-500">{s.secondary_text}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {searchError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {searchError}
                    </div>
                )}

                {/* Mapa Container */}
                <div 
                    ref={mapContainerRef} 
                    className="w-full h-[400px] rounded-lg border border-gray-200 bg-gray-100 relative"
                >
                    {!isMapReady && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm font-medium text-gray-600">Cargando mapa interactivo...</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                </Button>
                <Button onClick={handleSave} disabled={!selectedCoords}>
                    Confirmar Ubicación
                </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
