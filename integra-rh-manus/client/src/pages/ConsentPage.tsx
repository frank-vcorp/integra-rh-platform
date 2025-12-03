import { useRef, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import SignatureCanvas from "react-signature-canvas";

export function ConsentPage() {
  const params = useParams();
  const token = params.token;
  const sigPad = useRef<SignatureCanvas>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPolicyChecked, setIsPolicyChecked] = useState(false);

  const { data, isLoading, error } = trpc.candidateConsent.getConsentDataByToken.useQuery(
    { token: token! },
    { enabled: !!token,
      retry: false,
    }
  );

  const submitConsent = trpc.candidateConsent.submitConsent.useMutation({
    onSuccess: () => {
      alert("¡Gracias! Tu consentimiento ha sido registrado correctamente.");
    },
    onError: (err: any) => {
      alert(`Error al registrar el consentimiento: ${err.message}`);
    },
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setIsScrolled(true);
    }
  };

  const handleClear = () => {
    sigPad.current?.clear();
  };

  const handleSubmit = () => {
    if (sigPad.current?.isEmpty()) {
      alert("Por favor, proporciona tu firma.");
      return;
    }
    const signature = sigPad.current?.getTrimmedCanvas().toDataURL("image/png").split(',')[1];
    
    if (token && signature) {
      submitConsent.mutate({ token, signature });
    }
  };

  if (isLoading) {
    return <div className="p-4">Cargando...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <h1>Error</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  if (submitConsent.isSuccess) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-green-600">Consentimiento Enviado</h1>
        <p className="mt-4">Gracias por completar el proceso. Puedes cerrar esta ventana.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Consentimiento de Uso de Datos Personales</h1>
        <p className="mb-4">Hola, <strong>{data?.candidateName}</strong>.</p>
        <p className="mb-4">Por favor, lee nuestro aviso de privacidad a continuación. Para aceptar, deberás marcar la casilla de verificación y firmar en el recuadro al final del documento.</p>

        <div 
          className="prose max-w-none h-96 overflow-y-auto border border-gray-300 p-4 rounded-md bg-gray-50"
          onScroll={handleScroll}
          dangerouslySetInnerHTML={{ __html: data?.privacyPolicyText || "" }}
        >
        </div>

        <div className="mt-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-5 w-5"
              disabled={!isScrolled}
              checked={isPolicyChecked}
              onChange={(e) => setIsPolicyChecked(e.target.checked)}
            />
            <span className={`ml-2 ${!isScrolled ? 'text-gray-500' : ''}`}>
              He leído y acepto los términos del Aviso de Privacidad (versión {data?.privacyPolicyVersion}).
            </span>
          </label>
        </div>

        <div className="mt-6">
          <p className="font-semibold">Firma de conformidad:</p>
          <div className="border border-gray-400 rounded-md mt-2">
            <SignatureCanvas
              ref={sigPad}
              penColor="black"
              canvasProps={{ className: "w-full h-40" }}
            />
          </div>
          <button
            onClick={handleClear}
            className="text-sm text-blue-600 hover:underline mt-2"
          >
            Limpiar firma
          </button>
        </div>

        <div className="mt-8 text-right">
          <button
            onClick={handleSubmit}
            disabled={!isPolicyChecked || submitConsent.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400"
          >
            {submitConsent.isPending ? "Enviando..." : "Enviar Consentimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}
