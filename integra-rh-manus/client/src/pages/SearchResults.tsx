import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  FileText,
  Search,
  Users,
  Briefcase,
  UserCheck,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";

function useQueryParam(name: string): string {
  // Usamos siempre la barra de direcciones real para evitar perder el query
  const search =
    typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  return (params.get(name) || "").trim();
}

export default function SearchResults() {
  const termRaw = useQueryParam("q");
  const term = termRaw.toLowerCase();
  const { user } = useAuth();
  const isClient = user?.role === "client";

  const { data: clients = [], isLoading: loadingClients } =
    trpc.clients.list.useQuery();
  const { data: allCandidates = [], isLoading: loadingCandidates } =
    trpc.candidates.list.useQuery();
  const { data: allProcesses = [], isLoading: loadingProcesses } =
    trpc.processes.list.useQuery();
  const { data: posts = [], isLoading: loadingPosts } =
    trpc.posts.list.useQuery();
  const { data: surveyors = [], isLoading: loadingSurveyors } =
    trpc.surveyors.list.useQuery(undefined as any, {
      enabled: !isClient,
      initialData: [] as any,
    } as any);

  const scopedClients = useMemo(
    () =>
      isClient && user?.clientId
        ? clients.filter((c) => c.id === user.clientId)
        : clients,
    [clients, isClient, user?.clientId],
  );

  const getClientName = (clientId: number | null) => {
    if (!clientId) return "-";
    const client = scopedClients.find((c) => c.id === clientId);
    return client?.nombreEmpresa || "-";
  };

  const getPostName = (postId: number | null) => {
    if (!postId) return "-";
    const post = posts.find((p) => p.id === postId);
    return post?.nombreDelPuesto || "-";
  };

  const scopedCandidates = useMemo(
    () =>
      isClient && user?.clientId
        ? allCandidates.filter((c) => c.clienteId === user.clientId)
        : allCandidates,
    [allCandidates, isClient, user?.clientId],
  );

  const scopedProcesses = useMemo(
    () =>
      isClient && user?.clientId
        ? allProcesses.filter((p) => p.clienteId === user.clientId)
        : allProcesses,
    [allProcesses, isClient, user?.clientId],
  );

  const matchText = (value: string | null | undefined) =>
    value ? value.toLowerCase().includes(term) : false;

  const filteredClients = useMemo(() => {
    if (!term) return [];
    return scopedClients.filter((c) => {
      const haystack = [
        c.nombreEmpresa,
        c.contacto,
        c.telefono,
        c.email,
        c.ubicacionPlaza,
        c.reclutador,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [scopedClients, term]);

  const filteredCandidates = useMemo(() => {
    if (!term) return [];
    return scopedCandidates.filter((c) => {
      const haystack = [
        c.nombreCompleto,
        c.email,
        c.telefono,
        c.medioDeRecepcion,
        getClientName(c.clienteId),
        getPostName(c.puestoId),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [scopedCandidates, term, scopedClients, posts]);

  const filteredPosts = useMemo(() => {
    if (!term) return [];
    return posts.filter((p: any) => {
      const haystack = [
        p.nombreDelPuesto,
        getClientName(p.clienteId),
        p.estatus,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [posts, term, scopedClients]);

  const filteredProcesses = useMemo(() => {
    if (!term) return [];
    return scopedProcesses.filter((p: any) => {
      const haystack = [
        p.clave,
        p.tipoProducto,
        getClientName(p.clienteId),
        getPostName(p.puestoId),
        scopedCandidates.find((c) => c.id === p.candidatoId)?.nombreCompleto,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [scopedProcesses, term, scopedClients, posts, scopedCandidates]);

  const filteredSurveyors = useMemo(() => {
    if (!term || isClient) return [];
    return (surveyors as any[]).filter((s) => {
      const haystack = [
        s.nombre,
        s.telefono,
        s.email,
        s.ciudadBase,
        Array.isArray(s.estadosCobertura) ? s.estadosCobertura.join(" ") : "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [surveyors, term, isClient]);

  const isLoading =
    loadingClients ||
    loadingCandidates ||
    loadingProcesses ||
    loadingPosts ||
    loadingSurveyors;

  const hasAnyResults =
    filteredClients.length ||
    filteredCandidates.length ||
    filteredPosts.length ||
    filteredProcesses.length ||
    filteredSurveyors.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Resultados de búsqueda</h1>
            <p className="text-sm text-muted-foreground">
              {termRaw
                ? `Mostrando resultados para “${termRaw}”.`
                : "Escribe un término en el buscador superior y presiona Enter."}
            </p>
          </div>
        </div>
      </div>

      {isLoading && term ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : null}

      {!term && !isLoading && (
        <p className="text-sm text-muted-foreground">
          Usa el campo de búsqueda en la parte superior para encontrar
          candidatos, clientes, puestos o procesos.
        </p>
      )}

      {term && !isLoading && !hasAnyResults && (
        <p className="text-sm text-muted-foreground">
          No se encontraron resultados que coincidan con “{termRaw}”.
        </p>
      )}

      {term && (filteredCandidates.length > 0 || !isLoading) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Candidatos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin coincidencias en candidatos.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredCandidates.slice(0, 20).map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/candidatos/${c.id}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {c.nombreCompleto}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.email || c.telefono || "Sin contacto"} •{" "}
                        {getClientName(c.clienteId)}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Ver
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {term && (filteredClients.length > 0 || !isLoading) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin coincidencias en clientes.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredClients.slice(0, 20).map((c: any) => (
                  <Link
                    key={c.id}
                    href="/clientes"
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {c.nombreEmpresa}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.contacto || "-"} • {c.telefono || c.email || "-"}
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Ver en lista de clientes
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {term && (filteredPosts.length > 0 || !isLoading) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Puestos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin coincidencias en puestos.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredPosts.slice(0, 20).map((p: any) => (
                  <Link
                    key={p.id}
                    href="/puestos"
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {p.nombreDelPuesto}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {getClientName(p.clienteId)} • {p.estatus}
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Ver en lista de puestos
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {term && (filteredProcesses.length > 0 || !isLoading) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Procesos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredProcesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin coincidencias en procesos.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredProcesses.slice(0, 20).map((p: any) => {
                  const cand = scopedCandidates.find(
                    (c) => c.id === p.candidatoId,
                  );
                  return (
                    <Link
                      key={p.id}
                      href={`/procesos/${p.id}`}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {p.clave} — {p.tipoProducto}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {cand?.nombreCompleto || "Sin candidato"} •{" "}
                          {getClientName(p.clienteId)}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Ver
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {term && !isClient && (filteredSurveyors.length > 0 || !isLoading) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Encuestadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSurveyors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin coincidencias en encuestadores.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredSurveyors.slice(0, 20).map((s: any) => (
                  <Link
                    key={s.id}
                    href={`/encuestadores/${s.id}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.nombre}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.telefono || s.email || "-"} •{" "}
                        {s.ciudadBase || "Sin ciudad base"}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Ver
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
