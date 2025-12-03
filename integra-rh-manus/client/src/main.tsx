// Initialize Firebase app once for getAuth() usage across app
import "@/lib/firebase";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";
import { ClientAuthProvider } from "./contexts/ClientAuthContext";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      return;
    }
  } catch {}

  const currentPath = window.location.pathname;
  if (currentPath.startsWith("/login")) return;
  console.warn('[Auth] 401; skipping auto-redirect');
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

import { AuthProvider } from "./contexts/AuthContext";
import { getAuth } from "firebase/auth";

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL || "/api/trpc",
      transformer: superjson,
      async headers() {
        const headers: Record<string, string> = {};

        // Token de Firebase para usuarios internos (admin / backoffice)
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          headers.Authorization = `Bearer ${token}`;
          return headers;
        }

        // Token de acceso de cliente (enlace sin credenciales)
        try {
          const clientToken = sessionStorage.getItem("clientAccessToken");
          if (clientToken) {
            headers.Authorization = `ClientToken ${clientToken}`;
          }
        } catch {
          // sessionStorage puede no estar disponible en algunos contextos
        }

        return headers;
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ClientAuthProvider>
          <App />
        </ClientAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  </trpc.Provider>
);


