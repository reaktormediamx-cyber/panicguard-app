import React, { useState } from "react";
import {
  ShieldAlert,
  Shield,
  Store,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  Smartphone,
  Zap,
} from "lucide-react";
import { useAuth, SUPER_ADMIN_EMAILS } from "../../context/AuthContext.js";

export const AuthModal: React.FC = () => {
  const { 
    loginWithMasterPassword, 
    loginWithCentralPassword,
    loginWithEmail, 
    loginAsGuard,
    centrales
  } = useAuth();

  const [isAdminRoute] = useState<boolean>(() => {
    return window.location.pathname.includes("/admin") || window.location.search.includes("admin") || window.location.hash.includes("admin");
  });

  const [activeTab, setActiveTab] = useState<"MASTER" | "CENTRAL" | "EMAIL">(() => {
    const isAd = window.location.pathname.includes("/admin") || window.location.search.includes("admin") || window.location.hash.includes("admin");
    if (isAd) return "MASTER";
    return "CENTRAL";
  });
  
  // Super Admin state
  const [masterEmail, setMasterEmail] = useState<string>("");
  const [masterPassword, setMasterPassword] = useState<string>("");
  const [showMasterPassword, setShowMasterPassword] = useState<boolean>(false);

  // Central state
  const [centralEmail, setCentralEmail] = useState<string>("");
  const [centralId, setCentralId] = useState<string>(centrales[0]?.id || "CEN-CDMX-01");
  const [centralPassword, setCentralPassword] = useState<string>("");
  const [showCentralPassword, setShowCentralPassword] = useState<boolean>(false);

  // Terminal state
  const [emailInput, setEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showTerminalPassword, setShowTerminalPassword] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Master Login execution
  const handleMasterLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (!masterPassword) {
        throw new Error("Por favor introduce la contraseña de seguridad.");
      }
      await loginWithMasterPassword(masterPassword, masterEmail);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al autenticar cuenta maestra.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Central Login execution
  const handleCentralLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (!centralPassword) {
        throw new Error("Por favor introduce la clave de acceso de la Central.");
      }
      await loginWithCentralPassword(centralPassword, centralEmail, centralId);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al autenticar operador de Central.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Email / Password Login or Auto-register
  const handleEmailSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (!emailInput || !passwordInput) {
        throw new Error("Por favor completa todos los campos.");
      }
      await loginWithEmail(emailInput, passwordInput);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#121215] flex flex-col items-center justify-center p-4 selection:bg-[#dc2626] selection:text-white overflow-hidden">
      {/* Pure Diffused 2-Color Pulsing Glow Lights (No Circular Lines / Banding) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#121215]">
        {/* Color 1: #DC2626 (Rojo Primario) - Soft Pulsing Glow Top */}
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-[#dc2626]/20 to-transparent opacity-70 animate-pulse-rhythm-1 blur-[110px]" />
        {/* Color 2: #BE123C (Rojo Carmesí) - Soft Pulsing Glow Bottom */}
        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-[#be123c]/25 to-transparent opacity-70 animate-pulse-rhythm-2 blur-[110px]" />
        {/* Central Ambient Pulsing Glow Wave */}
        <div className="absolute inset-x-10 top-1/4 bottom-1/4 bg-gradient-to-r from-[#dc2626]/10 via-[#be123c]/15 to-[#dc2626]/10 blur-[130px] animate-pulse-heartbeat" />
      </div>

      {/* Ambient Gradient Glow Directly Behind Central Panel */}
      <div className="absolute w-full max-w-lg h-[520px] bg-gradient-to-r from-[#dc2626]/15 via-[#be123c]/20 to-[#dc2626]/15 blur-[100px] animate-pulse-heartbeat pointer-events-none" />

      <div className="relative w-full max-w-lg bg-[#18181b]/95 backdrop-blur-xl border border-[#27272a] hover:border-[#881337]/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/95 space-y-5 transition-all duration-500">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#dc2626] to-[#be123c] border border-[#881337] mx-auto flex items-center justify-center text-white shadow-xl shadow-[#4c0519]/60">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            PANIC<span className="text-[#dc2626]">GUARD</span>
          </h1>
          <p className="text-xs text-[#a1a1aa] max-w-sm mx-auto">
            Plataforma de video vigilancia y alertas de pánico por Rol
          </p>
        </div>

        {/* Tab Selection */}
        {!isAdminRoute && (
          <div className="grid grid-cols-2 gap-1.5 bg-[#121215] p-1.5 rounded-2xl border border-[#27272a] text-xs">
            <button
              type="button"
              onClick={() => { setActiveTab("CENTRAL"); setErrorMsg(null); }}
              className={`py-2 px-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "CENTRAL"
                  ? "bg-gradient-to-r from-[#dc2626] to-[#be123c] text-white shadow-md shadow-[#4c0519]/60"
                  : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0 text-white" />
              <span className="truncate">Central</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("EMAIL"); setErrorMsg(null); }}
              className={`py-2 px-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "EMAIL"
                  ? "bg-gradient-to-r from-[#dc2626] to-[#be123c] text-white shadow-md shadow-[#4c0519]/60"
                  : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              <Store className="w-3.5 h-3.5 shrink-0 text-white" />
              <span className="truncate">Terminal Tienda</span>
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#4c0519] border border-[#9f1239] text-[#fda4af] text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#fb7185]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: Super Admin Master Login */}
        {activeTab === "MASTER" && (
          <form onSubmit={handleMasterLogin} className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#121215] border border-[#27272a]">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#ef4444]" />
                Acceso a Comando Matriz
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg bg-[#4c0519] text-[#fda4af] font-bold border border-[#9f1239]">
                ROL: SUPER_ADMIN
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Cuenta de Super Admin:
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={masterEmail}
                  onChange={(e) => setMasterEmail(e.target.value)}
                  placeholder="panicguardmx@gmail.com"
                  className="w-full bg-[#121215] border border-[#27272a] rounded-xl pl-9 pr-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-[#dc2626] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Clave de Seguridad:
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showMasterPassword ? "text" : "password"}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#121215] border border-[#27272a] rounded-xl pl-9 pr-10 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-[#dc2626] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowMasterPassword(!showMasterPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-slate-300 cursor-pointer transition-colors"
                >
                  {showMasterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#dc2626] to-[#be123c] hover:from-[#ef4444] hover:to-[#dc2626] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#4c0519]/60 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Verificando Credenciales...</span>
              ) : (
                <>
                  <span>Ingresar a Super Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Central de Monitoreo Login */}
        {activeTab === "CENTRAL" && (
          <form onSubmit={handleCentralLogin} className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#121215] border border-[#27272a]">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#ef4444]" />
                Acceso a Consola de Central
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg bg-[#4c0519] text-[#fda4af] font-bold border border-[#9f1239]">
                ROL: CENTRAL
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Usuario / Correo de Despachador:
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={centralEmail}
                  onChange={(e) => setCentralEmail(e.target.value)}
                  placeholder="operador.c4@cdmx.gob.mx"
                  className="w-full bg-[#121215] border border-[#27272a] rounded-xl pl-9 pr-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#dc2626] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Clave de Despacho / Contraseña:
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showCentralPassword ? "text" : "password"}
                  value={centralPassword}
                  onChange={(e) => setCentralPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#121215] border border-[#27272a] rounded-xl pl-9 pr-10 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-[#dc2626] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCentralPassword(!showCentralPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-slate-300 cursor-pointer transition-colors"
                >
                  {showCentralPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#dc2626] to-[#be123c] hover:from-[#ef4444] hover:to-[#dc2626] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#4c0519]/60 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Validando Operador...</span>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  <span>Ingresar a Central de Monitoreo</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 4: Terminal Email / Password Login */}
        {activeTab === "EMAIL" && (
          <form onSubmit={handleEmailSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Correo Registrado:
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="tienda@comercio.com"
                  required
                  className="w-full bg-[#121215] border border-[#27272a] rounded-xl pl-9 pr-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#dc2626]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Clave / PIN de Comercio:
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showTerminalPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#121215] border border-[#27272a] rounded-xl pl-9 pr-10 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-[#dc2626]"
                />
                <button
                  type="button"
                  onClick={() => setShowTerminalPassword(!showTerminalPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-slate-300 cursor-pointer transition-colors"
                >
                  {showTerminalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#dc2626] to-[#be123c] hover:from-[#ef4444] hover:to-[#dc2626] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#4c0519]/60 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Ingresando..." : "Acceder a Terminal de Comercio"}
            </button>
          </form>
        )}

        {/* Footer Role Segregation Guarantee */}
        <div className="pt-2 border-t border-[#27272a] flex items-center justify-center gap-3 text-[10px] text-[#a1a1aa] font-mono flex-wrap">
          {isAdminRoute ? (
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-[#ef4444]" />
              Consola Exclusiva: Comando Matriz & Super Admin
            </span>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-[#ef4444]" />
                Central
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Store className="w-3 h-3 text-[#a1a1aa]" />
                Terminal Comercial
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
