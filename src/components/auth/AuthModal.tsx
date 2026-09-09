import React, { useState } from "react";
import {
  ShieldAlert,
  Shield,
  Store,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";

export const AuthModal: React.FC = () => {
  const { 
    loginWithMasterPassword, 
    loginWithCentralPassword,
    loginWithEmail, 
    centrales
  } = useAuth();

  const [isAdminRoute] = useState<boolean>(() => {
    return window.location.pathname.includes("/admin") || window.location.search.includes("admin") || window.location.hash.includes("admin");
  });

  const [activeTab, setActiveTab] = useState<"MASTER" | "CENTRAL" | "EMAIL">(() => {
    const isAd = window.location.pathname.includes("/admin") || window.location.search.includes("admin") || window.location.hash.includes("admin");
    return isAd ? "MASTER" : "CENTRAL";
  });
  
  // Super Admin state
  const [masterEmail, setMasterEmail] = useState<string>("panicguardmx@gmail.com");
  const [masterPassword, setMasterPassword] = useState<string>("");
  const [showMasterPassword, setShowMasterPassword] = useState<boolean>(false);

  // Central state
  const [centralEmail, setCentralEmail] = useState<string>("");
  const [centralId, setCentralId] = useState<string>(centrales[0]?.id || "");
  const [centralPassword, setCentralPassword] = useState<string>("");
  const [showCentralPassword, setShowCentralPassword] = useState<boolean>(false);

  // Terminal state
  const [emailInput, setEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showTerminalPassword, setShowTerminalPassword] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Master Login execution
  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
  const handleCentralLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-red-500 selection:text-white">
      {/* Dynamic Background Accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-red-900/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-10 w-[400px] h-[400px] bg-blue-900/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative w-full max-w-lg bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-slate-950 border border-red-500/40 mx-auto flex items-center justify-center text-white shadow-xl shadow-red-950/50">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            PANIC<span className="text-red-500">GUARD</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Plataforma de video vigilancia/accesos por Rol
          </p>
        </div>



        {/* Tab Selection: Central & Terminal for standard access; hidden on Super Admin panel */}
        {!isAdminRoute && (
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => { setActiveTab("CENTRAL"); setErrorMsg(null); }}
              className={`py-2 px-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "CENTRAL"
                  ? "bg-gradient-to-r from-red-700 to-slate-800 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0 text-red-400" />
              <span className="truncate">Central</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("EMAIL"); setErrorMsg(null); }}
              className={`py-2 px-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "EMAIL"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Store className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Terminal</span>
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: Super Admin Master Login */}
        {activeTab === "MASTER" && (
          <form onSubmit={handleMasterLogin} className="space-y-4 text-xs">
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-red-400" />
                Acceso a Comando Matriz
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-300 font-bold border border-red-900/60">
                ROL: SUPER_ADMIN
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Cuenta de Super Admin:
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={masterEmail}
                  onChange={(e) => setMasterEmail(e.target.value)}
                  placeholder="panicguardmx@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Clave de Seguridad:
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showMasterPassword ? "text" : "password"}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-red-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowMasterPassword(!showMasterPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                >
                  {showMasterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-950 transition-all cursor-pointer disabled:opacity-50"
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
          <form onSubmit={handleCentralLogin} className="space-y-4 text-xs">
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-red-400" />
                Acceso a Consola de Central
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-red-950/80 text-red-300 font-bold border border-red-900/50">
                ROL: CENTRAL / C4-C5
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Usuario / Correo de Despachador:
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={centralEmail}
                  onChange={(e) => setCentralEmail(e.target.value)}
                  placeholder="operador.c4@cdmx.gob.mx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Clave de Despacho / Contraseña:
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showCentralPassword ? "text" : "password"}
                  value={centralPassword}
                  onChange={(e) => setCentralPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-red-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCentralPassword(!showCentralPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                >
                  {showCentralPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-950 transition-all cursor-pointer disabled:opacity-50"
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
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="tienda@comercio.com"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Clave / PIN de Comercio:
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showTerminalPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowTerminalPassword(!showTerminalPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                >
                  {showTerminalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 shadow transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Ingresando..." : "Acceder a Terminal de Comercio"}
            </button>
          </form>
        )}

        {/* Footer Role Segregation Guarantee */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-3 text-[10px] text-slate-400 font-mono flex-wrap">
          {isAdminRoute ? (
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              Consola Exclusiva: Comando Matriz & Super Admin
            </span>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-red-400" />
                Central: Monitoreo & Despacho
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Store className="w-3 h-3 text-blue-400" />
                Terminal: Botón de Pánico
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
