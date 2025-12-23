import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { logger } from '../_core/logger';

/**
 * Router de geolocalización
 * Usa Nominatim (OpenStreetMap) para geocodificar direcciones
 */
export const geolocationRouter = router({
  /**
   * Geocodificar una dirección a coordenadas lat/lng
   * Se llama desde el backend para evitar problemas CORS
   */
  geocodeAddress: publicProcedure
    .input(z.object({
      address: z.string().min(5, "Dirección debe tener al menos 5 caracteres"),
    }))
    .query(async ({ input }) => {
      const { address } = input;
      
      try {
        logger.info('geocoding_request', { address });
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=mx&limit=1`,
          {
            headers: {
              'User-Agent': 'integra-rh-app/1.0'
            }
          }
        );

        if (!response.ok) {
          logger.warn('geocoding_error', { 
            status: response.status, 
            address 
          });
          return {
            success: false,
            error: `Error en geocodificación: ${response.statusText}`,
            lat: null,
            lng: null,
          };
        }

        const results = await response.json() as Array<{
          lat: string;
          lon: string;
          display_name: string;
        }>;

        if (!results || results.length === 0) {
          logger.warn('geocoding_not_found', { address });
          return {
            success: false,
            error: 'Dirección no encontrada',
            lat: null,
            lng: null,
          };
        }

        const { lat, lon } = results[0];
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lon);

        logger.info('geocoding_success', { 
          address, 
          lat: parsedLat, 
          lng: parsedLng 
        });

        return {
          success: true,
          error: null,
          lat: parsedLat,
          lng: parsedLng,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        logger.error('geocoding_exception', { 
          address, 
          error: errorMessage 
        });
        
        return {
          success: false,
          error: `Error al geocodificar: ${errorMessage}`,
          lat: null,
          lng: null,
        };
      }
    }),
});
