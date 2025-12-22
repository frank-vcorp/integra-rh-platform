import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type WorkHistoryDraft = {
  id?: number;
  empresa: string;
  puesto?: string;
  fechaInicio?: string;
  fechaFin?: string;
  tiempoTrabajado?: string;
   esActual?: boolean;
};

const MONTHS = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const YEARS = Array.from({ length: 60 }, (_, i) =>
  (new Date().getFullYear() - i).toString(),
);

function MonthYearInput({
  value,
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) {
  // Parse value YYYY-MM or YYYY-MM-DD or YYYY
  const parts = (value || "").split("-");
  // Si viene YYYY-MM-DD, parts[0]=YYYY, parts[1]=MM
  // Si viene YYYY-MM, parts[0]=YYYY, parts[1]=MM
  // Si viene YYYY, parts[0]=YYYY
  const year = parts[0]?.length === 4 ? parts[0] : "";
  const month = parts[1] && parts[1].length === 2 ? parts[1] : "";

  const handleYearChange = (newYear: string) => {
    if (!newYear) {
      onChange("");
      return;
    }
    onChange(month ? `${newYear}-${month}` : newYear);
  };

  const handleMonthChange = (newMonth: string) => {
    if (!year) return; // No permitir mes sin año
    if (!newMonth) {
      onChange(year);
    } else {
      onChange(`${year}-${newMonth}`);
    }
  };

  return (
    <div className="flex gap-2">
      <select
        className="flex h-9 w-[140px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        value={month}
        onChange={(e) => handleMonthChange(e.target.value)}
        disabled={!year}
      >
        <option value="">Mes (opc)</option>
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <select
        className="flex h-9 w-[100px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        value={year}
        onChange={(e) => handleYearChange(e.target.value)}
      >
        <option value="">Año</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function CandidatoSelfService() {
  const [, params] = useRoute("/pre-registro/:token");
  const token = params?.token ?? "";

  const [formCandidate, setFormCandidate] = useState<{
    email: string;
    telefono: string;
  }>({ email: "", telefono: "" });

  const [perfil, setPerfil] = useState<{
    // Generales
    fechaNacimiento: string;
    nss: string;
    curp: string;
    rfc: string;
    ciudadResidencia: string;
    lugarNacimiento: string;
    puestoSolicitado: string;
    plaza: string;
    telefonoCasa: string;
    telefonoRecados: string;
    // Domicilio
    calle: string;
    numero: string;
    interior: string;
    colonia: string;
    municipio: string;
    estado: string;
    cp: string;
    mapLink: string;
    // Redes sociales
    facebook: string;
    instagram: string;
    twitterX: string;
    tiktok: string;
    // Situación familiar
    estadoCivil: string;
    fechaMatrimonioUnion: string;
    parejaDeAcuerdoConTrabajo: string;
    esposaEmbarazada: string;
    hijosDescripcion: string;
    quienCuidaHijos: string;
    dondeVivenCuidadores: string;
    pensionAlimenticia: string;
    vivienda: string;
    // Pareja / noviazgo
    tieneNovio: string;
    nombreNovio: string;
    ocupacionNovio: string;
    domicilioNovio: string;
    apoyoEconomicoMutuo: string;
    negocioEnConjunto: string;
    // Financiero / antecedentes
    tieneDeudas: string;
    institucionDeuda: string;
    buroCreditoDeclarado: string;
    haSidoSindicalizado: string;
    haEstadoAfianzado: string;
    accidentesVialesPrevios: string;
    accidentesTrabajoPrevios: string;
    // Contacto emergencia
    contactoNombre: string;
    contactoParentesco: string;
    contactoTelefono: string;
  }>({
    fechaNacimiento: "",
    nss: "",
    curp: "",
    rfc: "",
    ciudadResidencia: "",
    lugarNacimiento: "",
    puestoSolicitado: "",
    plaza: "",
    telefonoCasa: "",
    telefonoRecados: "",
    calle: "",
    numero: "",
    interior: "",
    colonia: "",
    municipio: "",
    estado: "",
    cp: "",
    mapLink: "",
    facebook: "",
    instagram: "",
    twitterX: "",
    tiktok: "",
    estadoCivil: "",
    fechaMatrimonioUnion: "",
    parejaDeAcuerdoConTrabajo: "",
    esposaEmbarazada: "",
    hijosDescripcion: "",
    quienCuidaHijos: "",
    dondeVivenCuidadores: "",
    pensionAlimenticia: "",
    vivienda: "",
    tieneNovio: "",
    nombreNovio: "",
    ocupacionNovio: "",
    domicilioNovio: "",
    apoyoEconomicoMutuo: "",
    negocioEnConjunto: "",
    tieneDeudas: "",
    institucionDeuda: "",
    buroCreditoDeclarado: "",
    haSidoSindicalizado: "",
    haEstadoAfianzado: "",
    accidentesVialesPrevios: "",
    accidentesTrabajoPrevios: "",
    contactoNombre: "",
    contactoParentesco: "",
    contactoTelefono: "",
  });

  const [jobs, setJobs] = useState<WorkHistoryDraft[]>([]);
  const [docs, setDocs] = useState<
    { id: number; tipoDocumento: string; nombreArchivo: string; url: string }[]
  >([]);
  const [docTipo, setDocTipo] = useState("INE");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [aceptoAviso, setAceptoAviso] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasAttemptedLocalStorage, setHasAttemptedLocalStorage] = useState(false);

  // Recuperar estado guardado en localStorage
  useEffect(() => {
    if (!token) return;
    const saved = localStorage.getItem(`self-service-${token}`);
    if (saved) {
      try {
        const { formCandidate: fc, perfil: p, jobs: j } = JSON.parse(saved);
        // Solo usar localStorage si tiene datos significativos (al menos un email o perfil)
        if (fc?.email || p?.nss || (j && j.length > 0)) {
          setFormCandidate(fc);
          setPerfil(p);
          setJobs(j);
        }
      } catch (e) {
        console.error("Error recuperando localStorage:", e);
      }
    }
    setHasAttemptedLocalStorage(true);
  }, [token]);

  // Guardar en localStorage cada vez que cambian los datos
  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => {
      localStorage.setItem(
        `self-service-${token}`,
        JSON.stringify({ formCandidate, perfil, jobs }),
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [formCandidate, perfil, jobs, token]);

  // Guardar en localStorage al cerrar/cambiar pestaña
  useEffect(() => {
    if (!token) return;

    const handleBeforeUnload = () => {
      localStorage.setItem(
        `self-service-${token}`,
        JSON.stringify({ formCandidate, perfil, jobs }),
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("visibilitychange", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("visibilitychange", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [formCandidate, perfil, jobs, token]);

  const { data, isLoading, isError, error } =
    trpc.candidateSelf.getByToken.useQuery(
      { token },
      { enabled: !!token },
    );

  const submitMutation = trpc.candidateSelf.submit.useMutation();
  const uploadDocMutation = trpc.candidateSelf.uploadDocument.useMutation();

  // Inicializar estado al cargar datos SOLO si no hay datos significativos en localStorage
  useEffect(() => {
    if (!data || !hasAttemptedLocalStorage) return;
    
    // Verificar si ya hay datos en localStorage o en estado
    const hasLocalData = formCandidate.email || perfil.nss || jobs.some(j => j.empresa.trim());
    
    // Si hay datos locales, NO sobrescribir (preservar ediciones del usuario)
    if (hasLocalData) return;
    
    // Si NO hay datos locales, cargar desde servidor
    setFormCandidate({
      email: data.candidate.email || "",
      telefono: data.candidate.telefono || "",
    });
    const detalle = (data.candidate as any).perfilDetalle || {};
    setPerfil((prev) => ({
      ...prev,
      fechaNacimiento: detalle.generales?.fechaNacimiento || "",
      nss: detalle.generales?.nss || "",
      curp: detalle.generales?.curp || "",
      rfc: detalle.generales?.rfc || "",
      ciudadResidencia: detalle.generales?.ciudadResidencia || "",
      lugarNacimiento: detalle.generales?.lugarNacimiento || "",
      puestoSolicitado: detalle.generales?.puestoSolicitado || "",
      plaza: detalle.generales?.plaza || "",
      telefonoCasa: detalle.generales?.telefonoCasa || "",
      telefonoRecados: detalle.generales?.telefonoRecados || "",
      calle: detalle.domicilio?.calle || "",
      numero: detalle.domicilio?.numero || "",
      interior: detalle.domicilio?.interior || "",
      colonia: detalle.domicilio?.colonia || "",
      municipio: detalle.domicilio?.municipio || "",
      estado: detalle.domicilio?.estado || "",
      cp: detalle.domicilio?.cp || "",
      mapLink: detalle.domicilio?.mapLink || "",
      facebook: detalle.redesSociales?.facebook || "",
      instagram: detalle.redesSociales?.instagram || "",
      twitterX: detalle.redesSociales?.twitterX || "",
      tiktok: detalle.redesSociales?.tiktok || "",
      estadoCivil: detalle.situacionFamiliar?.estadoCivil || "",
      fechaMatrimonioUnion:
        detalle.situacionFamiliar?.fechaMatrimonioUnion || "",
      parejaDeAcuerdoConTrabajo:
        detalle.situacionFamiliar?.parejaDeAcuerdoConTrabajo || "",
      esposaEmbarazada: detalle.situacionFamiliar?.esposaEmbarazada || "",
      hijosDescripcion: detalle.situacionFamiliar?.hijosDescripcion || "",
      quienCuidaHijos: detalle.situacionFamiliar?.quienCuidaHijos || "",
      dondeVivenCuidadores:
        detalle.situacionFamiliar?.dondeVivenCuidadores || "",
      pensionAlimenticia: detalle.situacionFamiliar?.pensionAlimenticia || "",
      vivienda: detalle.situacionFamiliar?.vivienda || "",
      tieneNovio: detalle.parejaNoviazgo?.tieneNovio || "",
      nombreNovio: detalle.parejaNoviazgo?.nombreNovio || "",
      ocupacionNovio: detalle.parejaNoviazgo?.ocupacionNovio || "",
      domicilioNovio: detalle.parejaNoviazgo?.domicilioNovio || "",
      apoyoEconomicoMutuo:
        detalle.parejaNoviazgo?.apoyoEconomicoMutuo || "",
      negocioEnConjunto: detalle.parejaNoviazgo?.negocioEnConjunto || "",
      tieneDeudas: detalle.financieroAntecedentes?.tieneDeudas || "",
      institucionDeuda:
        detalle.financieroAntecedentes?.institucionDeuda || "",
      buroCreditoDeclarado:
        detalle.financieroAntecedentes?.buroCreditoDeclarado || "",
      haSidoSindicalizado:
        detalle.financieroAntecedentes?.haSidoSindicalizado || "",
      haEstadoAfianzado:
        detalle.financieroAntecedentes?.haEstadoAfianzado || "",
      accidentesVialesPrevios:
        detalle.financieroAntecedentes?.accidentesVialesPrevios || "",
      accidentesTrabajoPrevios:
        detalle.financieroAntecedentes?.accidentesTrabajoPrevios || "",
      contactoNombre: detalle.contactoEmergencia?.nombre || "",
      contactoParentesco: detalle.contactoEmergencia?.parentesco || "",
      contactoTelefono: detalle.contactoEmergencia?.telefono || "",
    }));
    if (data.workHistory.length > 0) {
      setJobs(
        data.workHistory.map((h) => ({
          id: h.id,
          empresa: h.empresa,
          puesto: h.puesto || "",
          fechaInicio: h.fechaInicio || "",
          fechaFin: h.fechaFin || "",
          tiempoTrabajado:
            h.tiempoTrabajado || h.tiempoTrabajadoEmpresa || "",
          esActual: !h.fechaFin,
        })),
      );
    } else {
      setJobs([
        {
          empresa: "",
          puesto: "",
          fechaInicio: "",
          fechaFin: "",
          tiempoTrabajado: "",
          esActual: false,
        },
      ]);
    }
    setDocs(
      (data.documents || []).map((d: any) => ({
        id: d.id,
        tipoDocumento: d.tipoDocumento,
        nombreArchivo: d.nombreArchivo,
        url: d.url,
      })),
    );
  }, [data, hasAttemptedLocalStorage, formCandidate.email, perfil.nss, jobs]);

  // Cuenta regresiva simple
  const timeLeftLabel = useMemo(() => {
    if (!data?.expiresAt) return "";
    const expires = new Date(data.expiresAt);
    const diffMs = expires.getTime() - Date.now();
    if (diffMs <= 0) return "Este enlace ha expirado.";
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `Tienes ${hours} h ${minutes} min para completar tu registro.`;
  }, [data?.expiresAt]);

  // Calcular porcentaje de llenado del formulario
  const formFillPercentage = useMemo(() => {
    const fields: (string | number | boolean | undefined)[] = [
      formCandidate.email,
      formCandidate.telefono,
      perfil.nss,
      perfil.puestoSolicitado,
      perfil.nivelEstudios,
      perfil.estado,
      perfil.municipio,
      perfil.domicilio,
      perfil.telefonoAlternativo,
      perfil.esEstudiante,
      perfil.modalidadEstudios,
      perfil.carrera,
      perfil.estadoCarrera,
      perfil.licenciaConducir,
      perfil.claseLicencia,
      perfil.tieneVehiculo,
      perfil.tieneDeudas,
      perfil.buroCreditoDeclarado,
      perfil.haSidoSindicalizado,
      perfil.haEstadoAfianzado,
      jobs.length > 0,
    ];

    const filledCount = fields.filter((f) => {
      if (f === undefined || f === null || f === "") return false;
      if (f === false) return false;
      return true;
    }).length;

    return Math.round((filledCount / fields.length) * 100);
  }, [formCandidate, perfil, jobs]);

  const getDraftPayload = () => {
    const payload: any = {
      token,
      candidate: {},
      perfil: {},
      workHistory: jobs.filter((j) => j.empresa.trim() !== ""),
    };

    // Solo incluir campos con valores
    if (formCandidate.email) payload.candidate.email = formCandidate.email;
    if (formCandidate.telefono) payload.candidate.telefono = formCandidate.telefono;

    // Construir perfil con solo campos no vacíos
    const generales: any = {};
    if (perfil.puestoSolicitado) generales.puestoSolicitado = perfil.puestoSolicitado;
    if (perfil.plaza) generales.plaza = perfil.plaza;
    if (perfil.fechaNacimiento) generales.fechaNacimiento = perfil.fechaNacimiento;
    if (perfil.nss) generales.nss = perfil.nss;
    if (perfil.lugarNacimiento) generales.lugarNacimiento = perfil.lugarNacimiento;
    if (perfil.curp) generales.curp = perfil.curp;
    if (perfil.rfc) generales.rfc = perfil.rfc;
    if (perfil.ciudadResidencia) generales.ciudadResidencia = perfil.ciudadResidencia;
    if (perfil.telefonoCasa) generales.telefonoCasa = perfil.telefonoCasa;
    if (perfil.telefonoRecados) generales.telefonoRecados = perfil.telefonoRecados;
    if (Object.keys(generales).length > 0) payload.perfil.generales = generales;

    const domicilio: any = {};
    if (perfil.calle) domicilio.calle = perfil.calle;
    if (perfil.numero) domicilio.numero = perfil.numero;
    if (perfil.interior) domicilio.interior = perfil.interior;
    if (perfil.colonia) domicilio.colonia = perfil.colonia;
    if (perfil.municipio) domicilio.municipio = perfil.municipio;
    if (perfil.estado) domicilio.estado = perfil.estado;
    if (perfil.cp) domicilio.cp = perfil.cp;
    if (perfil.mapLink) domicilio.mapLink = perfil.mapLink;
    if (Object.keys(domicilio).length > 0) payload.perfil.domicilio = domicilio;

    const redesSociales: any = {};
    if (perfil.facebook) redesSociales.facebook = perfil.facebook;
    if (perfil.instagram) redesSociales.instagram = perfil.instagram;
    if (perfil.twitterX) redesSociales.twitterX = perfil.twitterX;
    if (perfil.tiktok) redesSociales.tiktok = perfil.tiktok;
    if (Object.keys(redesSociales).length > 0) payload.perfil.redesSociales = redesSociales;

    const situacionFamiliar: any = {};
    if (perfil.estadoCivil) situacionFamiliar.estadoCivil = perfil.estadoCivil;
    if (perfil.fechaMatrimonioUnion) situacionFamiliar.fechaMatrimonioUnion = perfil.fechaMatrimonioUnion;
    if (perfil.parejaDeAcuerdoConTrabajo) situacionFamiliar.parejaDeAcuerdoConTrabajo = perfil.parejaDeAcuerdoConTrabajo;
    if (perfil.esposaEmbarazada) situacionFamiliar.esposaEmbarazada = perfil.esposaEmbarazada;
    if (perfil.hijosDescripcion) situacionFamiliar.hijosDescripcion = perfil.hijosDescripcion;
    if (perfil.quienCuidaHijos) situacionFamiliar.quienCuidaHijos = perfil.quienCuidaHijos;
    if (perfil.dondeVivenCuidadores) situacionFamiliar.dondeVivenCuidadores = perfil.dondeVivenCuidadores;
    if (perfil.pensionAlimenticia) situacionFamiliar.pensionAlimenticia = perfil.pensionAlimenticia;
    if (perfil.vivienda) situacionFamiliar.vivienda = perfil.vivienda;
    if (Object.keys(situacionFamiliar).length > 0) payload.perfil.situacionFamiliar = situacionFamiliar;

    const parejaNoviazgo: any = {};
    if (perfil.tieneNovio) parejaNoviazgo.tieneNovio = perfil.tieneNovio;
    if (perfil.nombreNovio) parejaNoviazgo.nombreNovio = perfil.nombreNovio;
    if (perfil.ocupacionNovio) parejaNoviazgo.ocupacionNovio = perfil.ocupacionNovio;
    if (perfil.domicilioNovio) parejaNoviazgo.domicilioNovio = perfil.domicilioNovio;
    if (perfil.apoyoEconomicoMutuo) parejaNoviazgo.apoyoEconomicoMutuo = perfil.apoyoEconomicoMutuo;
    if (perfil.negocioEnConjunto) parejaNoviazgo.negocioEnConjunto = perfil.negocioEnConjunto;
    if (Object.keys(parejaNoviazgo).length > 0) payload.perfil.parejaNoviazgo = parejaNoviazgo;

    const financieroAntecedentes: any = {};
    if (perfil.tieneDeudas) financieroAntecedentes.tieneDeudas = perfil.tieneDeudas;
    if (perfil.institucionDeuda) financieroAntecedentes.institucionDeuda = perfil.institucionDeuda;
    if (perfil.buroCreditoDeclarado) financieroAntecedentes.buroCreditoDeclarado = perfil.buroCreditoDeclarado;
    if (perfil.haSidoSindicalizado) financieroAntecedentes.haSidoSindicalizado = perfil.haSidoSindicalizado;
    if (perfil.haEstadoAfianzado) financieroAntecedentes.haEstadoAfianzado = perfil.haEstadoAfianzado;
    if (perfil.accidentesVialesPrevios) financieroAntecedentes.accidentesVialesPrevios = perfil.accidentesVialesPrevios;
    if (perfil.accidentesTrabajoPrevios) financieroAntecedentes.accidentesTrabajoPrevios = perfil.accidentesTrabajoPrevios;
    if (Object.keys(financieroAntecedentes).length > 0) payload.perfil.financieroAntecedentes = financieroAntecedentes;

    const contactoEmergencia: any = {};
    if (perfil.contactoNombre) contactoEmergencia.nombre = perfil.contactoNombre;
    if (perfil.contactoParentesco) contactoEmergencia.parentesco = perfil.contactoParentesco;
    if (perfil.contactoTelefono) contactoEmergencia.telefono = perfil.contactoTelefono;
    if (Object.keys(contactoEmergencia).length > 0) payload.perfil.contactoEmergencia = contactoEmergencia;

    return payload;
  };

  const handleManualSave = async () => {
    try {
      // Guardar en localStorage inmediatamente (backup local)
      localStorage.setItem(
        `self-service-${token}`,
        JSON.stringify({ formCandidate, perfil, jobs }),
      );
      setLastSavedAt(new Date());
      
      // Guardar TODOS los datos en BD vía REST endpoint
      try {
        const payload = getDraftPayload();
        
        const response = await fetch("/api/candidate-save-full-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            candidate: payload.candidate,
            perfil: payload.perfil,
            workHistory: payload.workHistory,
            aceptoAvisoPrivacidad: aceptoAviso, // Agregar consentimiento
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Draft save failed:", errorData);
          toast.error("Error al guardar el borrador en la base de datos");
        } else {
          const result = await response.json();
          console.log("Draft saved to BD successfully:", result);
          toast.success("Borrador guardado correctamente en la base de datos");
        }
      } catch (syncErr) {
        console.error("Draft save network error:", syncErr);
        toast.error("Error al guardar el borrador");
      }
    } catch (err: any) {
      console.error("Error al guardar borrador:", err);
      toast.error("Error al guardar el borrador");
    }
  };

  // NO hay autosave automático: solo localStorage (local) y guardado manual opcional

  const handleJobChange = (index: number, patch: Partial<WorkHistoryDraft>) => {
    setJobs((prev) =>
      prev.map((j, i) => (i === index ? { ...j, ...patch } : j)),
    );
  };

  const handleAddJob = () => {
    setJobs((prev) => [
      ...prev,
      {
        empresa: "",
        puesto: "",
        fechaInicio: "",
        fechaFin: "",
        tiempoTrabajado: "",
        esActual: false,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aceptoAviso) {
      toast.error("Debes aceptar el aviso de privacidad.");
      return;
    }
    
    try {
      const payload = getDraftPayload();
      payload.aceptoAvisoPrivacidad = true;
      
      await submitMutation.mutateAsync(payload);
      toast.success(
        "Gracias. Tus datos se han enviado para revisión. Puedes cerrar esta ventana.",
      );
      // Limpiar localStorage tras envío exitoso
      localStorage.removeItem(`self-service-${token}`);
    } catch (err) {
      console.error("Error al enviar datos:", err);
      toast.error("Error al enviar los datos. Intenta de nuevo.");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600">
          Enlace no válido. Verifica que lo hayas copiado completo.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Problema con el enlace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>{error.message || "No se pudo validar el enlace."}</p>
            <p className="text-xs text-gray-500">
              Si el problema persiste, contacta a Integra RH para solicitar un
              nuevo enlace.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-3 py-6 pt-20">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2">
          <div className="text-sm font-medium text-gray-900">
            {data?.candidate.nombreCompleto}
          </div>
          {lastSavedAt && (
            <span className="text-xs text-gray-500">
              Guardado: {format(lastSavedAt, "HH:mm", { locale: es })}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleManualSave}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Guardar borrador
        </Button>
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="space-y-1">
            <div className="text-xs font-semibold text-sky-700 uppercase tracking-wide">
              Integra RH – Registro de candidato
            </div>
            <div className="text-xl">
              Hola, {data?.candidate.nombreCompleto || "candidato"}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {timeLeftLabel && (
            <p className="text-xs text-gray-500">{timeLeftLabel}</p>
          )}

          {/* Barra de progreso de llenado */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">
                Formulario completado
              </span>
              <span className="text-xs font-semibold text-sky-700">
                {formFillPercentage}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-600 transition-all duration-300"
                style={{ width: `${formFillPercentage}%` }}
              />
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">
                1. Datos personales y de contacto
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="puestoSolicitado">Puesto solicitado</Label>
                  <Input
                    id="puestoSolicitado"
                    value={perfil.puestoSolicitado}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        puestoSolicitado: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="plaza">CEDI / Plaza</Label>
                  <Input
                    id="plaza"
                    value={perfil.plaza}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        plaza: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
                  <Input
                    id="fechaNacimiento"
                    type="date"
                    value={perfil.fechaNacimiento}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        fechaNacimiento: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="lugarNacimiento">
                    Lugar de nacimiento
                  </Label>
                  <Input
                    id="lugarNacimiento"
                    value={perfil.lugarNacimiento}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        lugarNacimiento: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="ciudadResidencia">
                    Ciudad donde vives actualmente
                  </Label>
                  <Input
                    id="ciudadResidencia"
                    value={perfil.ciudadResidencia}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        ciudadResidencia: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="nss">NSS (IMSS)</Label>
                  <Input
                    id="nss"
                    value={perfil.nss}
                    onChange={(e) =>
                      setPerfil((p) => ({ ...p, nss: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="curp">CURP</Label>
                  <Input
                    id="curp"
                    value={perfil.curp}
                    onChange={(e) =>
                      setPerfil((p) => ({ ...p, curp: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="rfc">RFC</Label>
                  <Input
                    id="rfc"
                    value={perfil.rfc}
                    onChange={(e) =>
                      setPerfil((p) => ({ ...p, rfc: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formCandidate.email}
                    onChange={(e) =>
                      setFormCandidate((c) => ({
                        ...c,
                        email: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefono">Teléfono celular</Label>
                  <Input
                    id="telefono"
                    value={formCandidate.telefono}
                    onChange={(e) =>
                      setFormCandidate((c) => ({
                        ...c,
                        telefono: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefonoCasa">Teléfono casa</Label>
                  <Input
                    id="telefonoCasa"
                    value={perfil.telefonoCasa}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        telefonoCasa: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="telefonoRecados">
                    Teléfono recados
                  </Label>
                  <Input
                    id="telefonoRecados"
                    value={perfil.telefonoRecados}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        telefonoRecados: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">2. Domicilio</h2>
              <p className="text-xs text-gray-500">
                Indica el domicilio donde vives actualmente. Procura que coincida con el
                comprobante de domicilio que entregarás.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label htmlFor="calle">Calle y número</Label>
                  <Input
                    id="calle"
                    value={perfil.calle}
                    onChange={(e) =>
                      setPerfil((p) => ({ ...p, calle: e.target.value }))
                    }
                    placeholder="Ej. Av. Juárez 123"
                  />
                </div>
                <div>
                  <Label htmlFor="colonia">Colonia</Label>
                  <Input
                    id="colonia"
                    value={perfil.colonia}
                    onChange={(e) =>
                      setPerfil((p) => ({ ...p, colonia: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="municipio">Municipio / Ciudad</Label>
                  <Input
                    id="municipio"
                    value={perfil.municipio}
                    onChange={(e) =>
                      setPerfil((p) => ({ ...p, municipio: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={perfil.estado}
                    onChange={(e) =>
                      setPerfil((p) => ({ ...p, estado: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="cp">Código Postal</Label>
                  <Input
                    id="cp"
                    value={perfil.cp}
                    onChange={(e) =>
                      setPerfil((p) => ({ ...p, cp: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="mapLink">
                    Enlace de ubicación en mapa (Google Maps)
                  </Label>
                  <Input
                    id="mapLink"
                    value={perfil.mapLink}
                    onChange={(e) =>
                      setPerfil((p) => ({ ...p, mapLink: e.target.value }))
                    }
                    placeholder="Pega aquí el enlace de Google Maps de tu domicilio"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Puedes usar el botón “Abrir mapa” para buscar tu dirección y luego
                    copiar el enlace completo de Google Maps.
                  </p>
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const query = [perfil.calle, perfil.colonia, perfil.municipio, perfil.estado, perfil.cp]
                          .filter(Boolean)
                          .join(", ");
                        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          query || data?.candidate.nombreCompleto || "",
                        )}`;
                        try {
                          window.open(url, "_blank");
                        } catch {
                          // ignorar errores de ventana bloqueada
                        }
                      }}
                    >
                      Abrir mapa para localizar mi domicilio
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">
                3. Redes sociales
              </h2>
              <p className="text-xs text-gray-500">
                Si lo deseas, indica cómo apareces en tus redes sociales.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={perfil.facebook}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        facebook: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={perfil.instagram}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        instagram: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="twitterX">Twitter / X</Label>
                  <Input
                    id="twitterX"
                    value={perfil.twitterX}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        twitterX: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="tiktok">TikTok</Label>
                  <Input
                    id="tiktok"
                    value={perfil.tiktok}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        tiktok: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">
                4. Entorno familiar
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="estadoCivil">Estado civil</Label>
                  <Input
                    id="estadoCivil"
                    value={perfil.estadoCivil}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        estadoCivil: e.target.value,
                      }))
                    }
                    placeholder="Ej. Soltero, Casado..."
                  />
                </div>
                <div>
                  <Label htmlFor="fechaMatrimonioUnion">
                    Fecha matrimonio / unión (si aplica)
                  </Label>
                  <Input
                    id="fechaMatrimonioUnion"
                    type="date"
                    value={perfil.fechaMatrimonioUnion}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        fechaMatrimonioUnion: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="parejaDeAcuerdoConTrabajo">
                    ¿Tu pareja está de acuerdo con el trabajo?
                  </Label>
                  <Input
                    id="parejaDeAcuerdoConTrabajo"
                    value={perfil.parejaDeAcuerdoConTrabajo}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        parejaDeAcuerdoConTrabajo: e.target.value,
                      }))
                    }
                    placeholder="Sí / No / No aplica"
                  />
                </div>
                <div>
                  <Label htmlFor="esposaEmbarazada">
                    ¿Esposa embarazada?
                  </Label>
                  <Input
                    id="esposaEmbarazada"
                    value={perfil.esposaEmbarazada}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        esposaEmbarazada: e.target.value,
                      }))
                    }
                    placeholder="Sí / No / No aplica"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="hijosDescripcion">
                    Hijos (edades o comentario)
                  </Label>
                  <Textarea
                    id="hijosDescripcion"
                    value={perfil.hijosDescripcion}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        hijosDescripcion: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="quienCuidaHijos">
                    ¿Quién cuida a los hijos?
                  </Label>
                  <Input
                    id="quienCuidaHijos"
                    value={perfil.quienCuidaHijos}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        quienCuidaHijos: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="dondeVivenCuidadores">
                    ¿Dónde viven los cuidadores?
                  </Label>
                  <Input
                    id="dondeVivenCuidadores"
                    value={perfil.dondeVivenCuidadores}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        dondeVivenCuidadores: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="pensionAlimenticia">
                    Pensión alimenticia (da o recibe)
                  </Label>
                  <Input
                    id="pensionAlimenticia"
                    value={perfil.pensionAlimenticia}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        pensionAlimenticia: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="vivienda">Vivienda</Label>
                  <Input
                    id="vivienda"
                    value={perfil.vivienda}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        vivienda: e.target.value,
                      }))
                    }
                    placeholder="Ej. Con padres, con pareja…"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">
                5. Pareja / noviazgo
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tieneNovio">¿Tienes novio(a)?</Label>
                  <Input
                    id="tieneNovio"
                    value={perfil.tieneNovio}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        tieneNovio: e.target.value,
                      }))
                    }
                    placeholder="Sí / No"
                  />
                </div>
                <div>
                  <Label htmlFor="nombreNovio">
                    Nombre de la pareja (si aplica)
                  </Label>
                  <Input
                    id="nombreNovio"
                    value={perfil.nombreNovio}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        nombreNovio: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="ocupacionNovio">
                    Ocupación de la pareja
                  </Label>
                  <Input
                    id="ocupacionNovio"
                    value={perfil.ocupacionNovio}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        ocupacionNovio: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="domicilioNovio">
                    Domicilio de la pareja
                  </Label>
                  <Input
                    id="domicilioNovio"
                    value={perfil.domicilioNovio}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        domicilioNovio: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="apoyoEconomicoMutuo">
                    ¿Apoyo económico mutuo?
                  </Label>
                  <Input
                    id="apoyoEconomicoMutuo"
                    value={perfil.apoyoEconomicoMutuo}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        apoyoEconomicoMutuo: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="negocioEnConjunto">
                    ¿Tienen negocio en conjunto?
                  </Label>
                  <Input
                    id="negocioEnConjunto"
                    value={perfil.negocioEnConjunto}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        negocioEnConjunto: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">
                6. Situación económica y antecedentes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tieneDeudas">¿Tienes deudas?</Label>
                  <Input
                    id="tieneDeudas"
                    value={perfil.tieneDeudas}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        tieneDeudas: e.target.value,
                      }))
                    }
                    placeholder="Sí / No"
                  />
                </div>
                <div>
                  <Label htmlFor="institucionDeuda">
                    Institución de la deuda (si aplica)
                  </Label>
                  <Input
                    id="institucionDeuda"
                    value={perfil.institucionDeuda}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        institucionDeuda: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="buroCreditoDeclarado">
                    ¿Te han dicho que estás en buró de crédito?
                  </Label>
                  <Input
                    id="buroCreditoDeclarado"
                    value={perfil.buroCreditoDeclarado}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        buroCreditoDeclarado: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="haSidoSindicalizado">
                    ¿Has sido sindicalizado?
                  </Label>
                  <Input
                    id="haSidoSindicalizado"
                    value={perfil.haSidoSindicalizado}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        haSidoSindicalizado: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="haEstadoAfianzado">
                    ¿Has estado afianzado?
                  </Label>
                  <Input
                    id="haEstadoAfianzado"
                    value={perfil.haEstadoAfianzado}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        haEstadoAfianzado: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="accidentesVialesPrevios">
                    Accidentes viales previos
                  </Label>
                  <Textarea
                    id="accidentesVialesPrevios"
                    value={perfil.accidentesVialesPrevios}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        accidentesVialesPrevios: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="accidentesTrabajoPrevios">
                    Accidentes de trabajo previos
                  </Label>
                  <Textarea
                    id="accidentesTrabajoPrevios"
                    value={perfil.accidentesTrabajoPrevios}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        accidentesTrabajoPrevios: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">
                7. Contacto de emergencia
              </h2>
              <p className="text-xs text-gray-500">
                Esta persona será contactada solo en caso de emergencia
                relacionada con tu proceso.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="contactoNombre">Nombre completo</Label>
                  <Input
                    id="contactoNombre"
                    value={perfil.contactoNombre}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        contactoNombre: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="contactoParentesco">Parentesco</Label>
                  <Input
                    id="contactoParentesco"
                    value={perfil.contactoParentesco}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        contactoParentesco: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="contactoTelefono">Teléfono</Label>
                  <Input
                    id="contactoTelefono"
                    value={perfil.contactoTelefono}
                    onChange={(e) =>
                      setPerfil((p) => ({
                        ...p,
                        contactoTelefono: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">
                8. Documentos a preparar
              </h2>
              <p className="text-xs text-gray-500">
                Estos son los documentos que normalmente se solicitan durante el
                proceso. Revisa que los tengas listos en formato físico o
                digital.
              </p>
              <ul className="text-xs list-disc list-inside space-y-1 text-gray-700">
                <li>Identificación oficial (INE)</li>
                <li>Acta de nacimiento</li>
                <li>CURP</li>
                <li>RFC</li>
                <li>Comprobante de domicilio reciente</li>
                <li>Comprobante de estudios (si aplica)</li>
                <li>Currículum actualizado (CV)</li>
              </ul>
              <div className="mt-3 space-y-2 border-t pt-3">
                <p className="text-xs text-gray-500">
                  Si ya tienes alguno en formato digital, puedes subirlo aquí para
                  que quede asociado a tu expediente.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                  <div>
                    <Label htmlFor="tipoDocumento" className="text-xs">
                      Tipo de documento
                    </Label>
                    <select
                      id="tipoDocumento"
                      className="mt-1 block w-full border rounded-md h-9 px-2 text-xs"
                      value={docTipo}
                      onChange={(e) => setDocTipo(e.target.value)}
                    >
                      <option value="INE">INE</option>
                      <option value="ACTA_NACIMIENTO">Acta de nacimiento</option>
                      <option value="CURP">CURP</option>
                      <option value="RFC">RFC</option>
                      <option value="COMPROBANTE_DOMICILIO">
                        Comprobante de domicilio
                      </option>
                      <option value="COMPROBANTE_ESTUDIOS">
                        Comprobante de estudios
                      </option>
                      <option value="CV">CV</option>
                      <option value="BURO_DE_CREDITO">Buró de Crédito</option>
                      <option value="ANTECEDENTES_PENALES">
                        Antecedentes Penales
                      </option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="archivo" className="text-xs">
                      Archivo
                    </Label>
                    <input
                      id="archivo"
                      type="file"
                      className="mt-1 block w-full text-xs"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setDocFile(file);
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploadDocMutation.isPending}
                    onClick={async () => {
                      if (!docFile) {
                        toast.error("Selecciona un archivo para subir.");
                        return;
                      }
                      try {
                        const arrayBuf = await docFile.arrayBuffer();
                        let binary = "";
                        const bytes = new Uint8Array(arrayBuf);
                        for (let i = 0; i < bytes.byteLength; i++) {
                          binary += String.fromCharCode(bytes[i]);
                        }
                        const base64 = btoa(binary);
                        const res = await uploadDocMutation.mutateAsync({
                          token,
                          tipoDocumento: docTipo,
                          fileName: docFile.name,
                          contentType:
                            docFile.type || "application/octet-stream",
                          base64,
                        });
                        setDocs((prev) => [
                          ...prev,
                          {
                            id: res.id,
                            tipoDocumento: docTipo,
                            nombreArchivo: docFile.name,
                            url: res.url,
                          },
                        ]);
                        setDocFile(null);
                        const inputEl = document.getElementById(
                          "archivo",
                        ) as HTMLInputElement | null;
                        if (inputEl) {
                          inputEl.value = "";
                        }
                        toast.success("Documento subido correctamente.");
                      } catch (err: any) {
                        toast.error(
                          err?.message ||
                            "No se pudo subir el documento. Inténtalo de nuevo.",
                        );
                      }
                    }}
                  >
                    {uploadDocMutation.isPending ? "Subiendo..." : "Subir archivo"}
                  </Button>
                </div>
                <div className="border-t pt-2">
                  {docs.length === 0 ? (
                    <p className="text-[11px] text-gray-500">
                      Aún no has subido documentos desde este enlace.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-xs">
                      {docs.map((d) => (
                        <li key={d.id} className="flex items-center justify-between">
                          <span>
                            {d.tipoDocumento} — {d.nombreArchivo}
                          </span>
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                          >
                            Ver
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">
                9. Historial laboral (básico)
              </h2>
              <p className="text-xs text-gray-500">
                Captura todos los empleos que recuerdes, empezando por el más
                reciente. Más tarde el equipo de Integra RH complementará la
                información con cada empresa.
              </p>
              <div className="space-y-3">
                {jobs.map((job, index) => (
                  <div
                    key={index}
                    className="border rounded-md p-3 bg-white space-y-2"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <Label>Empresa *</Label>
                        <Input
                          value={job.empresa}
                          onChange={(e) =>
                            handleJobChange(index, { empresa: e.target.value })
                          }
                          required={index === 0}
                        />
                      </div>
                      <div>
                        <Label>Puesto</Label>
                        <Input
                          value={job.puesto || ""}
                          onChange={(e) =>
                            handleJobChange(index, { puesto: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Fecha inicio</Label>
                        <MonthYearInput
                          value={job.fechaInicio || ""}
                          onChange={(val) =>
                            handleJobChange(index, {
                              fechaInicio: val,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Fecha fin</Label>
                        <MonthYearInput
                          value={job.fechaFin || ""}
                          onChange={(val) =>
                            handleJobChange(index, {
                              fechaFin: val,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id={`empleo-actual-${index}`}
                        type="checkbox"
                        className="h-4 w-4"
                        checked={job.esActual || false}
                        onChange={(e) =>
                          handleJobChange(index, {
                            esActual: e.target.checked,
                            fechaFin: e.target.checked ? "" : job.fechaFin,
                          })
                        }
                      />
                      <Label
                        htmlFor={`empleo-actual-${index}`}
                        className="text-xs"
                      >
                        Este es mi empleo actual
                      </Label>
                    </div>
                    <div>
                      <Label>Tiempo trabajado (ej. 2 años 3 meses)</Label>
                      <Input
                        value={job.tiempoTrabajado || ""}
                        onChange={(e) =>
                          handleJobChange(index, {
                            tiempoTrabajado: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddJob}
              >
                Agregar otro empleo
              </Button>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold">
                10. Aviso de privacidad
              </h2>
              <p className="text-xs text-gray-500 max-h-32 overflow-y-auto border rounded-md p-2 bg-slate-50">
                Integra RH utilizará la información que proporcionas únicamente
                para fines de evaluación laboral y validación de referencias,
                de acuerdo con la normativa aplicable en materia de protección
                de datos personales. Al marcar la casilla de aceptación, declaras
                que la información es veraz y autorizas a Integra RH a
                contactar a tus referencias laborales y a utilizar tus datos
                para los procesos de evaluación relacionados con la vacante a la
                que aplicas.
              </p>
              <div className="flex items-start gap-2">
                <input
                  id="acepto"
                  type="checkbox"
                  className="mt-1"
                  checked={aceptoAviso}
                  onChange={(e) => setAceptoAviso(e.target.checked)}
                />
                <Label htmlFor="acepto" className="text-xs">
                  He leído y acepto el aviso de privacidad y autorizo a Integra
                  RH a usar mis datos para fines de evaluación laboral.
                </Label>
              </div>
            </section>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitMutation.isPending || !aceptoAviso}
              >
                {submitMutation.isPending ? "Enviando..." : "Enviar datos"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
