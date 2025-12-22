import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Puestos from "./pages/Puestos";
import Candidatos from "./pages/Candidatos";
import Procesos from "./pages/Procesos";
import ProcesoDetalle from "./pages/ProcesoDetalle";
import Encuestadores from "./pages/Encuestadores";
import EncuestadorDetalle from "./pages/EncuestadorDetalle";
import Pagos from "./pages/Pagos";
import CandidatoDetalle from "./pages/CandidatoDetalle";
import ClienteFormularioIntegrado from "./pages/ClienteFormularioIntegrado";
import CandidatoFormularioIntegrado from "./pages/CandidatoFormularioIntegrado";
import PuestoProcesoFlow from "./pages/PuestoProcesoFlow";
import Usuarios from "./pages/Usuarios";
import UsuariosRegistros from "./pages/UsuariosRegistros";
import Roles from "./pages/Roles";
import ClienteAcceso from "./pages/ClienteAcceso";
import ClienteDashboard from "./pages/ClienteDashboard";
import ClienteProcesoDetalle from "./pages/ClienteProcesoDetalle";
import ClienteCandidatoDetalle from "./pages/ClienteCandidatoDetalle";
import Visitas from "./pages/Visitas";
import { ConsentPage } from "./pages/ConsentPage";
import SearchResults from "./pages/SearchResults";
import CandidatoSelfService from "./pages/CandidatoSelfService";

import LoginPage from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

// This component wraps our protected routes, applying the DashboardLayout.
const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoute>
);

function Router() {
  return (
    <Switch>
      {/* Public consent route */}
      <Route path="/consentir/:token" component={ConsentPage} />
      {/* Public candidate self-service route */}
      <Route path="/pre-registro/:token" component={CandidatoSelfService} />

      {/* Public client access routes */}
      <Route path="/cliente/dashboard" component={ClienteDashboard} />
      <Route path="/cliente/proceso/:id" component={ClienteProcesoDetalle} />
      <Route path="/cliente/candidato/:id" component={ClienteCandidatoDetalle} />
      <Route path="/cliente/:token" component={ClienteAcceso} />
      <Route path="/cliente" component={ClienteAcceso} />
      
      {/* Login Route */}
      <Route path="/login" component={LoginPage} />

      {/* Protected Routes */}
      <Route path="/">
        <ProtectedLayout>
          <Dashboard />
        </ProtectedLayout>
      </Route>
      <Route path="/clientes">
        <ProtectedLayout>
          <Clientes />
        </ProtectedLayout>
      </Route>
      <Route path="/puestos">
        <ProtectedLayout>
          <Puestos />
        </ProtectedLayout>
      </Route>
      <Route path="/candidatos/:id">
        <ProtectedLayout>
          <CandidatoDetalle />
        </ProtectedLayout>
      </Route>
      <Route path="/candidatos">
        <ProtectedLayout>
          <Candidatos />
        </ProtectedLayout>
      </Route>
      <Route path="/flujo-completo">
        <ProtectedLayout>
          <ClienteFormularioIntegrado />
        </ProtectedLayout>
      </Route>
      <Route path="/flujo-candidato">
        <ProtectedLayout>
          <CandidatoFormularioIntegrado />
        </ProtectedLayout>
      </Route>
      <Route path="/flujo-puesto">
        <ProtectedLayout>
          <PuestoProcesoFlow />
        </ProtectedLayout>
      </Route>
      <Route path="/procesos">
        <ProtectedLayout>
          <Procesos />
        </ProtectedLayout>
      </Route>
      <Route path="/procesos/:id">
        <ProtectedLayout>
          <ProcesoDetalle />
        </ProtectedLayout>
      </Route>
      <Route path="/encuestadores">
        <ProtectedLayout>
          <Encuestadores />
        </ProtectedLayout>
      </Route>
      <Route path="/encuestadores/:id">
        <ProtectedLayout>
          <EncuestadorDetalle />
        </ProtectedLayout>
      </Route>
      <Route path="/visitas">
        <ProtectedLayout>
          <Visitas />
        </ProtectedLayout>
      </Route>
      <Route path="/pagos">
        <ProtectedLayout>
          <Pagos />
        </ProtectedLayout>
      </Route>
      <Route path="/usuarios">
        <ProtectedLayout>
          <Usuarios />
        </ProtectedLayout>
      </Route>
      <Route path="/roles">
        <ProtectedLayout>
          <Roles />
        </ProtectedLayout>
      </Route>
      <Route path="/usuarios/registros">
        <ProtectedLayout>
          <UsuariosRegistros />
        </ProtectedLayout>
      </Route>
      <Route path="/buscar">
        <ProtectedLayout>
          <SearchResults />
        </ProtectedLayout>
      </Route>

      {/* Fallback and Not Found */}
      <Route path="/404" component={NotFound} />
      <Route>
        <Redirect to="/404" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
