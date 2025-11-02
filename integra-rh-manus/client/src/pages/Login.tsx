import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import '@/lib/firebase'; // Asegúrate que la ruta es correcta
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Chrome } from 'lucide-react';

const provider = new GoogleAuthProvider();

export default function Login() {
  const [location, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!loading && user) {
      setLocation('/');
    }
  }, [user, loading, setLocation]);

  const handleLogin = async () => {
    const auth = getAuth();
    try {
      await signInWithPopup(auth, provider);
      // Después de un login exitoso, el token se adjuntará automáticamente
      // a las siguientes peticiones tRPC gracias a la configuración en main.tsx.
      // Invalidamos la query 'auth.me' para forzar al hook useAuth a recargar los datos del usuario.
      await utils.auth.me.invalidate();
      setLocation('/');
    } catch (error) {
      console.error('Popup login failed; falling back to redirect:', error);
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectErr) {
        console.error('Redirect login also failed:', redirectErr);
        // Aquí podrías mostrar un toast o mensaje de error al usuario.
      }
    }
  };
  
  // Al regresar de signInWithRedirect, procesamos el resultado y estabilizamos la sesión
  useEffect(() => {
    const run = async () => {
      try {
        const auth = getAuth();
        const res = await getRedirectResult(auth);
        if (res?.user) {
          await utils.auth.me.invalidate();
          setLocation('/');
        }
      } catch (e) {
        // Si no hay resultado o hay un error no bloqueamos la UI
        // Solo registramos para diagnóstico.
        if (e) console.debug('No redirect result or error processing it:', e);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-gray-600">Cargando…</div>
      </div>
    );
  }

  if (user) {
    // Si ya hay un usuario, no mostramos nada mientras redirigimos.
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <div className="max-w-md w-full bg-white p-8 border border-gray-200 rounded-lg shadow-sm text-center">
        <img src="/integra_rh_logo.png" alt="Integra RH Logo" className="w-32 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Bienvenido a Integra RH
        </h1>
        <p className="text-gray-600 mb-8">
          Inicia sesión para acceder a tu panel de control.
        </p>
        <Button onClick={handleLogin} className="w-full">
          <Chrome className="w-4 h-4 mr-2" />
          Iniciar sesión con Google
        </Button>
      </div>
      <p className="mt-6 text-xs text-gray-500">
        &copy; {new Date().getFullYear()} Integra RH. Todos los derechos reservados.
      </p>
    </div>
  );
}
