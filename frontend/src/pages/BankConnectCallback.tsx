import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { accountsApi } from "../services/api";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type Status = "loading" | "success" | "error";

export default function BankConnectCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const itemUuid = searchParams.get("item_uuid") ?? searchParams.get("item_id");

    if (!itemUuid) {
      setStatus("error");
      setMessage("Paramètre item_uuid manquant dans l'URL de retour.");
      return;
    }

    accountsApi
      .connectCallback(itemUuid)
      .then(({ data }) => {
        setStatus("success");
        setMessage(
          `${data.accounts_count} compte(s) importé(s) depuis ${data.bank_name}.`
        );
        setTimeout(() => navigate("/transactions"), 2500);
      })
      .catch((err) => {
        setStatus("error");
        const detail = err?.response?.data?.detail ?? "Erreur lors de la finalisation de la connexion.";
        setMessage(detail);
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 max-w-sm w-full text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 size={40} className="animate-spin text-primary-400 mx-auto" />
            <p className="text-white font-medium">Connexion en cours…</p>
            <p className="text-sm text-gray-400">Importation de vos comptes bancaires.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle size={40} className="text-green-400 mx-auto" />
            <p className="text-white font-medium">Connexion réussie !</p>
            <p className="text-sm text-gray-400">{message}</p>
            <p className="text-xs text-gray-500">Redirection automatique…</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle size={40} className="text-red-400 mx-auto" />
            <p className="text-white font-medium">Échec de la connexion</p>
            <p className="text-sm text-gray-400">{message}</p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700 transition-colors"
            >
              Retour au tableau de bord
            </button>
          </>
        )}
      </div>
    </div>
  );
}
