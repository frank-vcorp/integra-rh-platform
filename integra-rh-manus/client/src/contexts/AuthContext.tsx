import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConnected: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Función para refrescar token de forma proactiva (antes de expirar)
const setupTokenRefresh = (user: User) => {
  // Token expira en 60 minutos, refrescamos cada 45 para evitar intermitencias
  const refreshInterval = setInterval(async () => {
    try {
      await user.getIdToken(true); // force refresh
      console.debug('[Auth] Token refreshed proactively');
    } catch (err) {
      console.error('[Auth] Token refresh failed:', err);
    }
  }, 45 * 60 * 1000); // 45 minutos

  return () => clearInterval(refreshInterval);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      // Si hay usuario, configurar refresh automático de token
      if (user) {
        return setupTokenRefresh(user);
      }
    });

    return () => unsubscribe();
  }, []);

  // Monitorear conexión a Internet (para evitar re-login innecesario)
  useEffect(() => {
    const handleOnline = () => {
      setIsConnected(true);
      console.debug('[Auth] Connection restored');
    };
    const handleOffline = () => {
      setIsConnected(false);
      console.warn('[Auth] Lost connection');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isConnected,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
