import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';

interface ClientAuthContextType {
  clientId: number | null;
  clientData: any | null;
  isClientAuth: boolean;
  isLoading: boolean;
  logout: () => void;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Leer clientId y token desde sessionStorage al montar y cuando cambian
  useEffect(() => {
    const loadFromStorage = () => {
      const storedClientId = sessionStorage.getItem('clientId');
      const storedToken = sessionStorage.getItem('clientAccessToken');
      
      if (storedClientId && storedToken) {
        setClientId(parseInt(storedClientId));
        setToken(storedToken);
      } else {
        setClientId(null);
        setToken(null);
      }
      setIsLoading(false);
    };

    loadFromStorage();

    // Escuchar cambios en storage (para cuando ClienteAcceso guarda el token)
    const handleStorageChange = () => {
      loadFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('clientAuthChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('clientAuthChanged', handleStorageChange);
    };
  }, []);

  // Obtener datos del cliente si hay token
  const { data: clientData } = trpc.clientAccess.getClientData.useQuery(
    { token: token! },
    {
      enabled: !!token,
      retry: false,
    }
  );

  const logout = () => {
    sessionStorage.removeItem('clientId');
    sessionStorage.removeItem('clientAccessToken');
    setClientId(null);
    window.location.href = '/';
  };

  const value: ClientAuthContextType = {
    clientId,
    clientData,
    isClientAuth: !!clientId,
    isLoading,
    logout,
  };

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const context = useContext(ClientAuthContext);
  if (context === undefined) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
}
