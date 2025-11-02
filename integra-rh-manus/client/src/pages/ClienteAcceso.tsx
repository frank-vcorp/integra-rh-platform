import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';

/**
 * Página de acceso de clientes mediante token único
 * Valida el token y redirige al dashboard de cliente
 */
export default function ClienteAcceso() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const token = params.token as string;

  const { data, isLoading, error } = trpc.clientAccess.validateToken.useQuery(
    { token },
    {
      enabled: !!token,
      retry: false,
    }
  );

  useEffect(() => {
    if (data?.valid && data.clientId) {
      // Token válido, guardar en sessionStorage
      sessionStorage.setItem('clientAccessToken', token);
      sessionStorage.setItem('clientId', data.clientId.toString());
      
      // Disparar evento personalizado para notificar el cambio
      window.dispatchEvent(new Event('clientAuthChanged'));
      
      // Pequeño delay para asegurar que el sessionStorage se actualice
      setTimeout(() => {
        setLocation('/cliente/dashboard');
      }, 100);
    }
  }, [data, token, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Validando acceso...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Enlace Inválido o Expirado
          </h1>
          
          <p className="text-gray-600 mb-6">
            El enlace de acceso que intentaste usar no es válido o ha expirado.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-700">
              <strong>¿Necesitas ayuda?</strong>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Contacta con INTEGRA-RH para solicitar un nuevo enlace de acceso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
