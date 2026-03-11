/*
 * ID: FIX-20260310-03
 * Archivo: client/src/components/MapPicker.tsx
 * Corrección: Eliminado uso de importLibrary (no disponible en todas las versiones).
 * Usa constructores legacy: new google.maps.Map(), new google.maps.Geocoder(), etc.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Map as MapIcon, X, Loader2, Search } from "lucide-react";

declare global {
  interface Window {
    google: any;
    _gmapsCallback?: () => void;
  }
}

interface MapPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number } | null) => void;
  address: string;
  disabled?: boolean;
}

/** Espera a que window.google.maps esté disponible */
function waitForGoogleMaps(timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.Map) { resolve(); return; }
    const start = Date.now();
    const check = setInterval(() => {
      if (window.google?.maps?.Map) { clearInterval(check); resolve(); }
      else if (Date.now() - start > timeoutMs) { clearInterval(check); reject(new Error("Timeout esperando Google Maps API")); }
    }, 150);
  });
}

export function MapPicker({ value, onChange, address, disabled }: MapPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 19.4326, lng: -99.1332,
  });
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(value);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState(address || "");
  const [isMapReady, setIsMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const autocompleteServiceRef = useRef<any>(null);

  // Sync external value
  useEffect(() => {
    if (value) { setSelectedCoords(value); setMapCenter(value); }
  }, [value]);

  // Sync address into search input when modal opens
  useEffect(() => {
    if (isOpen && address && !searchInput) setSearchInput(address);
  }, [isOpen, address]);

  // Cleanup refs when modal closes
  useEffect(() => {
    if (!isOpen) { mapRef.current = null; markerRef.current = null; setIsMapReady(false); }
  }, [isOpen]);

  // --- Load Google Maps script (legacy, sin loading=async ni importLibrary) ---
  useEffect(() => {
    if (!isOpen) return;
    if (window.google?.maps?.Map) return; // Ya cargado

    // Ya hay un script en DOM? Solo esperar
    if (document.querySelector("script[src*='maps.googleapis.com']")) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
    const script = document.createElement("script");
    // CLAVE: NO usar loading=async ni v=weekly. Carga clásica que garantiza constructores legacy.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, [isOpen]);

  // --- Inicializar mapa cuando el modal está abierto ---
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      try {
        await waitForGoogleMaps();
        if (cancelled) return;

        const G = window.google.maps;

        // Geocoder
        if (!geocoderRef.current) geocoderRef.current = new G.Geocoder();

        // AutocompleteService (legacy)
        if (!autocompleteServiceRef.current) autocompleteServiceRef.current = new G.places.AutocompleteService();

        // Mapa
        if (!mapRef.current && mapContainerRef.current) {
          const map = new G.Map(mapContainerRef.current, {
            center: mapCenter,
            zoom: 15,
            disableDefaultUI: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          });

          map.addListener("click", (e: any) => {
            if (e.latLng) placeMarker(e.latLng, map);
          });

          mapRef.current = map;
        }

        // Marcador
        if (mapRef.current && !markerRef.current) {
          const marker = new G.Marker({
            position: mapCenter,
            map: mapRef.current,
            draggable: true,
            title: "Ubicación seleccionada",
          });

          marker.addListener("dragend", () => {
            const pos = marker.getPosition();
            if (pos) setSelectedCoords({ lat: pos.lat(), lng: pos.lng() });
          });

          markerRef.current = marker;
        }

        setIsMapReady(true);
      } catch (e: any) {
        console.error("Error al inicializar mapa:", e);
        setSearchError("No se pudo cargar el mapa. Verifica tu conexión.");
      }
    };

    initMap();
    return () => { cancelled = true; };
  }, [isOpen]);

  // Mover mapa y marker cuando cambian las coords (búsqueda, click, etc.)
  useEffect(() => {
    if (mapRef.current && markerRef.current && mapCenter) {
      mapRef.current.panTo(mapCenter);
      markerRef.current.setPosition(mapCenter);
      mapRef.current.setZoom(17);
    }
  }, [mapCenter]);

  // Helper: colocar marcador + actualizar estado
  const placeMarker = useCallback((latLng: any, _map?: any) => {
    setSelectedCoords({ lat: latLng.lat(), lng: latLng.lng() });
    markerRef.current?.setPosition(latLng);
  }, []);

  // --- Autocompletar (legacy AutocompleteService) ---
  const handleSearchChange = useCallback(async (query: string) => {
    setSearchInput(query);
    if (!query || query.trim().length < 3) { setSuggestions([]); return; }

    const svc = autocompleteServiceRef.current;
    if (!svc) return;

    svc.getPlacePredictions(
      { input: query, componentRestrictions: { country: "mx" } },
      (predictions: any[] | null, status: string) => {
        if (status === "OK" && predictions) {
          setSuggestions(predictions.map((p: any) => ({
            place_id: p.place_id,
            main_text: p.structured_formatting?.main_text || p.description,
            secondary_text: p.structured_formatting?.secondary_text || "",
            description: p.description,
          })));
        } else {
          setSuggestions([]);
        }
      }
    );
  }, []);

  // --- Seleccionar sugerencia ---
  const handleSelectSuggestion = useCallback(async (placeId: string) => {
    if (!geocoderRef.current) return;
    setIsSearching(true);
    setSearchError(null);
    setSuggestions([]);

    geocoderRef.current.geocode({ placeId }, (results: any, status: string) => {
      setIsSearching(false);
      if (status === "OK" && results?.length) {
        const loc = results[0].geometry.location;
        setMapCenter({ lat: loc.lat(), lng: loc.lng() });
        setSelectedCoords({ lat: loc.lat(), lng: loc.lng() });
        setSearchInput(results[0].formatted_address);
      } else {
        setSearchError("No se encontró la ubicación.");
      }
    });
  }, []);

  // --- Buscar dirección con Enter ---
  const handleGeocodeAddress = useCallback(async () => {
    if (!searchInput || searchInput.length < 4 || !geocoderRef.current) return;
    setIsSearching(true);
    setSearchError(null);

    geocoderRef.current.geocode(
      { address: searchInput, componentRestrictions: { country: "mx" } },
      (results: any, status: string) => {
        setIsSearching(false);
        if (status === "OK" && results?.length) {
          const loc = results[0].geometry.location;
          setMapCenter({ lat: loc.lat(), lng: loc.lng() });
          setSelectedCoords({ lat: loc.lat(), lng: loc.lng() });
          setSearchInput(results[0].formatted_address);
        } else {
          setSearchError("No se encontró esa dirección en México.");
        }
      }
    );
  }, [searchInput]);

  const handleSave = () => { if (selectedCoords) onChange(selectedCoords); setIsOpen(false); };
  const handleClear = () => { onChange(null); setSelectedCoords(null); setIsOpen(false); };

  return (
    <div className="space-y-2">
      <Label>Ubicación (Google Maps)</Label>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)} disabled={disabled} className="flex items-center gap-2">
          <MapIcon className="h-4 w-4" />
          {selectedCoords ? "Ajustar ubicación" : "Seleccionar en mapa"}
        </Button>
        {selectedCoords && (
          <Button type="button" variant="ghost" size="sm" onClick={handleClear} disabled={disabled} className="text-red-600 hover:bg-red-50">
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

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="border-b p-4 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-lg">Seleccionar Ubicación</h3>
                <p className="text-sm text-gray-500">Busca una dirección o arrastra el pin en el mapa</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="h-5 w-5" /></Button>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {/* Buscador */}
              <div className="relative z-10">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input placeholder="Escribe para buscar calle, colonia..." value={searchInput}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleGeocodeAddress()}
                      className="pl-9" />
                  </div>
                  <Button type="button" onClick={handleGeocodeAddress} disabled={isSearching}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                  </Button>
                </div>

                {suggestions.length > 0 && (
                  <div className="absolute top-12 left-0 right-0 bg-white border rounded-lg shadow-xl max-h-60 overflow-y-auto z-20">
                    {suggestions.map((s) => (
                      <button key={s.place_id} type="button" onClick={() => handleSelectSuggestion(s.place_id)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-b-0 transition-colors">
                        <p className="font-medium text-sm text-gray-900">{s.main_text}</p>
                        <p className="text-xs text-gray-500">{s.secondary_text}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {searchError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />{searchError}
                </div>
              )}

              {/* Mapa - wrapper con overlay separado del contenedor que Google Maps controla */}
              <div className="w-full h-[400px] rounded-lg border border-gray-200 bg-gray-100 relative overflow-hidden">
                {/* Contenedor exclusivo para Google Maps - SIN hijos React */}
                <div ref={mapContainerRef} className="absolute inset-0" />
                {/* Overlay de carga - hermano, no hijo del contenedor del mapa */}
                {!isMapReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2 bg-gray-100 z-10 pointer-events-none">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-gray-600">Cargando mapa interactivo...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!selectedCoords}>Confirmar Ubicación</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
