"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShieldAlert, Flame } from "lucide-react";

function BurnViewerContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [meta, setMeta] = useState<any>({});
  const [systemMessage, setSystemMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Nenhum token fornecido.");
      setLoading(false);
      return;
    }

    fetch(`/api/vault/burn?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setContent(data.content);
        setMeta(data.data);
        setSystemMessage(data.message);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black font-mono text-orange-500">
        <Flame className="animate-pulse mr-2" size={24} /> Descriptografando Chave de Uso Único...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-black font-mono text-red-500 p-8 text-center">
        <ShieldAlert size={64} className="mb-4" />
        <h1 className="text-2xl font-bold mb-2">Acesso Negado ou Destruído</h1>
        <p className="max-w-md text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-emerald-500 font-mono p-4 md:p-8 selection:bg-orange-500/30">
      <div className="max-w-3xl mx-auto">
        <div className="border border-orange-500/50 bg-orange-950/20 p-4 rounded mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <Flame className="text-orange-500 flex-shrink-0 sm:mt-1 animate-pulse" size={32} />
          <div>
            <h2 className="text-orange-400 font-bold text-lg">PROTOCOLO BURN-AFTER-READING ATIVO</h2>
            <p className="text-orange-300/80 text-sm mt-1">{systemMessage}</p>
            <p className="text-red-400 font-bold text-xs mt-2 uppercase tracking-wide">
              Não feche ou atualize esta página. O acesso à leitura não poderá ser recuperado.
            </p>
          </div>
        </div>

        <div className="bg-black border border-emerald-900/50 p-6 sm:p-8 rounded shadow-2xl">
          <h1 className="text-3xl font-bold text-emerald-400 mb-6 border-b border-emerald-900/50 pb-4">
            {meta.title || "Documento Confidencial"}
          </h1>
          
          <div className="prose prose-invert prose-emerald max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BurnViewer() {
  return (
    <Suspense fallback={<div className="p-10 text-orange-500 bg-black min-h-screen font-mono flex items-center justify-center">Iniciando protocolo seguro...</div>}>
      <BurnViewerContent />
    </Suspense>
  );
}
