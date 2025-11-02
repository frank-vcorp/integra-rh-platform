import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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
import ClienteAcceso from "./pages/ClienteAcceso";
import ClienteDashboard from "./pages/ClienteDashboard";
import ClienteProcesoDetalle from "./pages/ClienteProcesoDetalle";
import ClienteCandidatoDetalle from "./pages/ClienteCandidatoDetalle";
import Visitas from "./pages/Visitas";

import LoginPage from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      {/* Rutas públicas para acceso de clientes mediante token */}
      <Route path="/cliente/dashboard" component={ClienteDashboard} />
      <Route path="/cliente/proceso/:id" component={ClienteProcesoDetalle} />
      <Route path="/cliente/candidato/:id" component={ClienteCandidatoDetalle} />
      <Route path="/cliente/:token" component={ClienteAcceso} />
      {/* Ruta de Login */}
      <Route path="/login" component={LoginPage} />

      {/* Rutas protegidas con DashboardLayout */}
      <Route path="/">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/" component={Dashboard} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/clientes">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/clientes" component={Clientes} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/puestos">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/puestos" component={Puestos} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/candidatos/:id">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/candidatos/:id" component={CandidatoDetalle} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/candidatos">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/candidatos" component={Candidatos} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/flujo-completo">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/flujo-completo" component={ClienteFormularioIntegrado} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/flujo-candidato">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/flujo-candidato" component={CandidatoFormularioIntegrado} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/flujo-puesto">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/flujo-puesto" component={PuestoProcesoFlow} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Procesos - listado */}
      <Route path="/procesos">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/procesos" component={Procesos} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      {/* Procesos - detalle */}
      <Route path="/procesos/:id">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/procesos/:id" component={ProcesoDetalle} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/encuestadores">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/encuestadores" component={Encuestadores} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/encuestadores/:id">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/encuestadores/:id" component={EncuestadorDetalle} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/visitas">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/visitas" component={Visitas} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/pagos">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/pagos" component={Pagos} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/usuarios">
        <ProtectedRoute>
          <DashboardLayout>
            <Route path="/usuarios" component={Usuarios} />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
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
