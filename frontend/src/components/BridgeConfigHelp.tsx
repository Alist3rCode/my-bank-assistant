import { X, ExternalLink, Terminal, AlertTriangle, CheckCircle } from "lucide-react";

interface Props {
  missingFields: string[];
  onClose: () => void;
}

export const STEPS = [
  {
    n: 1,
    title: "Créer un compte Bridge",
    body: "Rendez-vous sur bridgeapi.io et créez un compte développeur. Bridge est le service Open Banking (DSP2) utilisé pour connecter les comptes bancaires français.",
    link: { label: "Ouvrir bridgeapi.io", href: "https://bridgeapi.io" },
  },
  {
    n: 2,
    title: "Récupérer vos identifiants",
    body: "Dans le dashboard Bridge, accédez à « Applications » et notez votre Client ID et Client Secret.",
  },
  {
    n: 3,
    title: "Renseigner le fichier .env",
    body: "À la racine du projet, ouvrez le fichier .env et ajoutez ou mettez à jour les variables suivantes :",
    code: "BRIDGE_CLIENT_ID=votre-client-id\nBRIDGE_CLIENT_SECRET=votre-client-secret",
  },
  {
    n: 4,
    title: "Redémarrer le serveur",
    body: "Relancez le backend pour que les variables soient prises en compte :",
    code: "docker compose restart backend\n# ou en local :\nuvicorn app.main:app --reload",
  },
];

export default function BridgeConfigHelp({ missingFields, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={18} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Configuration Bridge API requise</h2>
              <p className="text-gray-400 text-sm mt-0.5">
                La connexion bancaire nécessite des identifiants Bridge.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors shrink-0 mt-0.5"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Missing fields badge */}
        {missingFields.length > 0 && (
          <div className="mx-5 mt-4 rounded-lg bg-red-500/10 border border-red-500/25 px-4 py-3 shrink-0">
            <p className="text-sm text-red-400 font-medium mb-1">Variables manquantes :</p>
            <div className="flex flex-wrap gap-2">
              {missingFields.map((f) => (
                <code key={f} className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-mono">
                  {f}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="overflow-y-auto px-5 py-4 space-y-5 flex-1">
          {STEPS.map((step) => (
            <div key={step.n} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-xs font-bold text-primary-400 shrink-0 mt-0.5">
                {step.n}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{step.title}</p>
                <p className="text-gray-400 text-sm mt-1 leading-relaxed">{step.body}</p>
                {step.code && (
                  <div className="mt-2 bg-gray-950 rounded-lg border border-gray-800 px-3 py-2.5 flex items-start gap-2">
                    <Terminal size={13} className="text-gray-500 mt-0.5 shrink-0" />
                    <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
                      {step.code}
                    </pre>
                  </div>
                )}
                {step.link && (
                  <a
                    href={step.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    {step.link.label}
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-start gap-3 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3">
            <CheckCircle size={16} className="text-green-400 shrink-0 mt-0.5" />
            <p className="text-sm text-green-300">
              Une fois le .env mis à jour et le serveur redémarré, le bouton « Connecter » sera opérationnel.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
