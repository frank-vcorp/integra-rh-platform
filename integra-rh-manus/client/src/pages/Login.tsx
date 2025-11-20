import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import '@/lib/firebase'; // Inicializa Firebase
import { useAuth as useFirebaseAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Chrome } from 'lucide-react';

const provider = new GoogleAuthProvider();

export default function Login() {
  const [location, setLocation] = useLocation();
  const { user, loading } = useFirebaseAuth();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (window.location.pathname !== '/') {
      setLocation('/');
    }
  }, [user, loading, setLocation]);

  const handleLogin = async () => {
    const auth = getAuth();
    try {
      const cred = await signInWithPopup(auth, provider);
      try { await cred.user.getIdToken(true); } catch {}
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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getAuth();
    setSubmitting(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      try { await cred.user.getIdToken(true); } catch {}
      await utils.auth.me.invalidate();
      setLocation('/');
    } catch (err:any) {
      console.error('Email login failed:', err);
      alert('No fue posible iniciar sesión. Verifica tu correo y contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!email) { alert('Escribe tu correo para enviarte el enlace de restablecimiento.'); return; }
    try {
      await sendPasswordResetEmail(getAuth(), email);
      alert('Te enviamos un correo para restablecer tu contraseña.');
    } catch (e) {
      console.error('Reset failed', e);
      alert('No pudimos enviar el correo de restablecimiento.');
    }
  };
  
  // Al regresar de signInWithRedirect, procesamos el resultado y estabilizamos la sesión
  useEffect(() => {
    const run = async () => {
      try {
        const auth = getAuth();
        const res = await getRedirectResult(auth);
        if (res?.user) {
          try { await res.user.getIdToken(true); } catch {}
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
        <Button onClick={handleLogin} className="w-full mb-4">
          <Chrome className="w-4 h-4 mr-2" />
          Iniciar sesión con Google
        </Button>
        <div className="mt-2 text-left">
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Correo</label>
              <input type="email" className="mt-1 w-full border rounded-md h-10 px-3" value={email} onChange={e=> setEmail(e.target.value)} placeholder="usuario@empresa.com" required />
            </div>
            <div>
              <label className="text-sm text-gray-600">Contraseña</label>
              <input type="password" className="mt-1 w-full border rounded-md h-10 px-3" value={password} onChange={e=> setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={handleReset} className="text-blue-600 hover:underline">Olvidé mi contraseña</button>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>Entrar</Button>
          </form>
        </div>
      </div>
      <p className="mt-6 text-xs text-gray-500">
        &copy; {new Date().getFullYear()} Integra RH. Todos los derechos reservados.
      </p>
    </div>
  );
}
