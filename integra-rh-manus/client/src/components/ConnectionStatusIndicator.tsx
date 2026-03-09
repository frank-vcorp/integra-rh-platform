import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Check, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Indicador visual de estado de conexión y sesión.
 * Uso: <ConnectionStatusIndicator /> (agregar en DashboardLayout o root)
 * 
 * Muestra:
 * - ✅ Verde: Conectado y autenticado
 * - ⚠️ Amarillo: Conectado pero sin usuario
 * - 🔴 Rojo: Sin conexión a Internet
 * - 🔄 Gris: Cargando
 */
export function ConnectionStatusIndicator() {
  const { user, loading, isConnected } = useAuth();
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const isHealthy = isConnected && user && !loading;
  const statusColor = !isConnected
    ? 'bg-red-100 text-red-700 border-red-300'
    : loading
      ? 'bg-gray-100 text-gray-600 border-gray-300'
      : user
        ? 'bg-green-100 text-green-700 border-green-300'
        : 'bg-yellow-100 text-yellow-700 border-yellow-300';

  const statusIcon = !isConnected ? (
    <WifiOff className="w-4 h-4" />
  ) : loading ? (
    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
  ) : user ? (
    <Check className="w-4 h-4" />
  ) : (
    <AlertCircle className="w-4 h-4" />
  );

  const statusText = !isConnected
    ? 'Sin conexión'
    : loading
      ? 'Cargando...'
      : user
        ? 'Sesión activa'
        : 'Sin usuario';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Badge compacto */}
      <button
        onClick={() => setShowDebugInfo(!showDebugInfo)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border
          text-sm font-medium transition-all cursor-pointer
          ${statusColor}
          hover:shadow-md
        `}
      >
        {statusIcon}
        <span>{statusText}</span>
      </button>

      {/* Panel de debug (mostrar si clickeaste el badge) */}
      {showDebugInfo && (
        <div className="mt-2 bg-gray-900 text-gray-100 text-xs p-4 rounded-lg max-w-xs shadow-lg border border-gray-700">
          <h3 className="font-bold mb-2 text-white">Debug Info</h3>
          <div className="space-y-1 font-mono">
            <div>
              <span className="text-gray-400">Usuario:</span> {user?.email || 'null'}
            </div>
            <div>
              <span className="text-gray-400">Conectado:</span> {isConnected ? '✅ Sí' : '❌ No'}
            </div>
            <div>
              <span className="text-gray-400">Cargando:</span> {loading ? 'Sí' : 'No'}
            </div>
            <div>
              <span className="text-gray-400">Token expira en:</span>{' '}
              {user ? (
                <span className="text-blue-400">~45 minutos (refrescado auto)</span>
              ) : (
                '—'
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700 text-gray-500">
              <p>💡 Abre Console (F12) para ver logs de [Auth] y [Heartbeat]</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
