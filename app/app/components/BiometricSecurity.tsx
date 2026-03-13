"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, Fingerprint, Lock, Unlock, AlertTriangle, Loader2, UserX, Plus, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";

type Phase = "locked" | "unlocking" | "unlocked" | "registering" | "registered" | "error" | "identity_mismatch";

export default function BiometricSecurity({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("unlocked");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [identityEmail, setIdentityEmail] = useState<string | null>(null);
  const [hasCredential, setHasCredential] = useState<boolean | null>(null);
  const { data: session } = useSession();

  // Detect device
  useEffect(() => {
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(!!standalone);
  }, []);

  // Identity binding check (PWA only)
  useEffect(() => {
    if (!isStandalone || !session?.user?.email) return;

    const saved = localStorage.getItem("ncfn_app_installer");
    if (!saved) {
      localStorage.setItem("ncfn_app_installer", session.user.email);
      fetch("/api/app-install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email }),
      }).catch(() => {});
    } else if (saved !== session.user.email) {
      setIdentityEmail(saved);
      setPhase("identity_mismatch");
      return;
    }

    // Check if there's a registered WebAuthn credential
    fetch("/api/webauthn/authenticate")
      .then(r => r.ok ? setHasCredential(true) : setHasCredential(false))
      .catch(() => setHasCredential(false));
  }, [isStandalone, session]);

  // Auto-lock on visibility change (mobile PWA only)
  useEffect(() => {
    if (!isMobile) return;

    const wasUnlocked = sessionStorage.getItem("ncfn_app_locked") === "false";
    if (wasUnlocked) {
      setPhase("unlocked");
    } else {
      setPhase("locked");
      sessionStorage.setItem("ncfn_app_locked", "true");
    }

    const handleVisibility = () => {
      if (document.hidden) {
        setPhase("locked");
        sessionStorage.removeItem("ncfn_app_locked");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isMobile]);

  const unlock = useCallback(async () => {
    setPhase("unlocking");
    setErrorMsg(null);

    try {
      // Try real WebAuthn if supported
      if (window.PublicKeyCredential) {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available && hasCredential) {
          // Get challenge from server
          const optionsRes = await fetch("/api/webauthn/authenticate");
          if (!optionsRes.ok) throw new Error("Sem credencial registrada");
          const options = await optionsRes.json();

          // Convert base64url to ArrayBuffer
          const credId = base64urlToBuffer(options.allowCredentials[0].id);
          const assertion = await navigator.credentials.get({
            publicKey: {
              challenge: base64urlToBuffer(options.challenge),
              allowCredentials: options.allowCredentials.map((c: any) => ({
                id: base64urlToBuffer(c.id),
                type: "public-key",
                transports: c.transports,
              })),
              userVerification: "required",
              rpId: options.rpId || window.location.hostname,
              timeout: 60000,
            },
          }) as PublicKeyCredential;

          if (!assertion) throw new Error("Biometria cancelada");

          const response = assertion.response as AuthenticatorAssertionResponse;

          // Verify on server
          const verifyRes = await fetch("/api/webauthn/authenticate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: assertion.id,
              rawId: bufferToBase64url(assertion.rawId),
              response: {
                clientDataJSON: bufferToBase64url(response.clientDataJSON),
                authenticatorData: bufferToBase64url(response.authenticatorData),
                signature: bufferToBase64url(response.signature),
                userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : null,
              },
              type: assertion.type,
            }),
          });

          if (!verifyRes.ok) throw new Error("Verificação biométrica falhou");

          setPhase("unlocked");
          sessionStorage.setItem("ncfn_app_locked", "false");
          return;
        }
      }

      // Fallback: simple unlock (no biometric available or not registered)
      setPhase("unlocked");
      sessionStorage.setItem("ncfn_app_locked", "false");
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setErrorMsg("Autenticação cancelada pelo usuário.");
      } else {
        setErrorMsg(err?.message || "Falha na verificação.");
      }
      setPhase("error");
    }
  }, [hasCredential]);

  const registerBiometric = useCallback(async () => {
    setPhase("registering");
    setErrorMsg(null);

    try {
      if (!window.PublicKeyCredential) throw new Error("WebAuthn não suportado neste dispositivo");

      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) throw new Error("Autenticação biométrica não disponível");

      // Get registration options from server
      const optRes = await fetch("/api/webauthn/register");
      if (!optRes.ok) throw new Error("Erro ao obter opções de registro");
      const options = await optRes.json();

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: base64urlToBuffer(options.challenge),
          rp: options.rp,
          user: {
            id: base64urlToBuffer(options.user.id),
            name: options.user.name,
            displayName: options.user.displayName || options.user.name,
          },
          pubKeyCredParams: options.pubKeyCredParams,
          authenticatorSelection: options.authenticatorSelection,
          timeout: options.timeout || 60000,
          attestation: options.attestation || "none",
          excludeCredentials: (options.excludeCredentials || []).map((c: any) => ({
            id: base64urlToBuffer(c.id),
            type: c.type,
          })),
        },
      }) as PublicKeyCredential;

      if (!credential) throw new Error("Registro cancelado");

      const response = credential.response as AuthenticatorAttestationResponse;

      const regRes = await fetch("/api/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceName: navigator.userAgent.includes("iPhone") ? "iPhone"
            : navigator.userAgent.includes("Android") ? "Android"
            : "Dispositivo",
          id: credential.id,
          rawId: bufferToBase64url(credential.rawId),
          response: {
            clientDataJSON: bufferToBase64url(response.clientDataJSON),
            attestationObject: bufferToBase64url(response.attestationObject),
            transports: response.getTransports?.() || [],
          },
          type: credential.type,
        }),
      });

      if (!regRes.ok) throw new Error("Falha ao registrar biometria");

      setHasCredential(true);
      setPhase("registered");
      setTimeout(() => {
        setPhase("unlocked");
        sessionStorage.setItem("ncfn_app_locked", "false");
      }, 2000);
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setErrorMsg("Registro cancelado pelo usuário.");
      } else {
        setErrorMsg(err?.message || "Falha no registro biométrico.");
      }
      setPhase("error");
    }
  }, []);

  // Only active on mobile devices
  if (!isMobile) return <>{children}</>;
  if (phase === "unlocked") return <>{children}</>;

  // Identity mismatch screen
  if (phase === "identity_mismatch") {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#1a0000] flex flex-col items-center justify-center p-6">
        <div className="glass-panel p-10 rounded-3xl border-red-500/40 flex flex-col items-center gap-8 max-w-sm w-full shadow-[0_0_100px_rgba(239,68,68,0.2)]">
          <UserX className="w-20 h-20 text-red-500 animate-pulse" />
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-red-500 uppercase tracking-widest">Identidade Inválida</h2>
            <p className="text-gray-400 text-xs uppercase tracking-tighter">
              Este dispositivo está vinculado a outro operador.
            </p>
          </div>
          <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-center">
            <p className="text-red-400 text-[10px] font-mono leading-tight">
              VIOLAÇÃO DE PROTOCOLO DETECTADA.<br />
              Vinculado: {identityEmail}<br />
              Tentativa: {session?.user?.email}
            </p>
          </div>
          <p className="text-gray-600 text-[8px] text-center uppercase">
            Contate o administrador para redefinir o vínculo do hardware.
          </p>
        </div>
      </div>
    );
  }

  // Registered success screen
  if (phase === "registered") {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6">
        <div className="glass-panel p-10 rounded-3xl border-[#00f3ff]/40 flex flex-col items-center gap-6 max-w-sm w-full shadow-[0_0_80px_rgba(0,243,255,0.2)]">
          <CheckCircle2 className="w-20 h-20 text-[#00f3ff]" />
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#00f3ff] uppercase tracking-widest">Biometria Registrada</h2>
            <p className="text-gray-400 text-xs mt-2">Dispositivo vinculado com sucesso.</p>
          </div>
        </div>
      </div>
    );
  }

  // Lock / unlock screen
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6">
      <div className="scanline-overlay absolute inset-0 z-0 pointer-events-none" />

      <div className="glass-panel p-10 rounded-3xl border-[#bc13fe]/40 flex flex-col items-center gap-8 max-w-sm w-full relative z-10 shadow-[0_0_100px_rgba(188,19,254,0.2)]">
        <div className="relative">
          <div className="absolute inset-0 bg-[#bc13fe]/20 blur-2xl rounded-full" />
          <Shield className="w-20 h-20 text-[#bc13fe] relative z-10 animate-pulse" />
          <Lock className="absolute -bottom-2 -right-2 w-9 h-9 text-white bg-[#bc13fe] p-2 rounded-full border-4 border-black" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-[#bc13fe] uppercase tracking-widest">Identidade Protegida</h2>
          <p className="text-gray-500 text-[10px] uppercase tracking-tighter">Nexus Cyber Forensic Network</p>
          <p className="text-gray-400 text-[10px] mt-3 px-2 leading-relaxed">
            Sessão ativa sob protocolo NCFN. Verifique sua identidade para continuar.
          </p>
        </div>

        {(phase === "error") && errorMsg && (
          <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl flex items-center gap-2 text-red-400 text-xs w-full">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Unlock button */}
        <button
          onClick={phase === "error" ? unlock : unlock}
          disabled={phase === "unlocking"}
          className="w-full flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-[#bc13fe]/20 border border-white/10 hover:border-[#bc13fe]/50 rounded-2xl transition-all duration-300"
        >
          {phase === "unlocking" ? (
            <Loader2 className="w-12 h-12 text-[#bc13fe] animate-spin" />
          ) : (hasCredential && isStandalone) ? (
            <Fingerprint className="w-12 h-12 text-[#bc13fe]" />
          ) : (
            <Unlock className="w-12 h-12 text-[#bc13fe]" />
          )}
          <span className="text-sm font-bold text-gray-300 uppercase tracking-widest">
            {phase === "unlocking"
              ? "Verificando..."
              : (hasCredential && isStandalone)
              ? "Desbloquear com Biometria"
              : "Desbloquear"}
          </span>
        </button>

        {/* Register biometric button (if no credential yet) */}
        {isStandalone && hasCredential === false && phase !== "unlocking" && (
          <button
            onClick={registerBiometric}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-[#00f3ff] bg-[#00f3ff]/5 border border-[#00f3ff]/20 hover:bg-[#00f3ff]/10 transition"
          >
            <Plus className="w-4 h-4" />
            Registrar biometria deste dispositivo
          </button>
        )}
      </div>

      <footer className="mt-8 text-[9px] text-gray-700 font-mono tracking-widest uppercase text-center max-w-xs">
        Acesso restrito · Tentativas registradas com IP e timestamp
      </footer>
    </div>
  );
}

// ─── Helpers WebAuthn ─────────────────────────────────────────────────────────
function base64urlToBuffer(b64url: string): ArrayBuffer {
  const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
  const binary = atob(padded);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return buffer.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
