import React, { useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Store,
  Mail,
  Phone,
  MapPin,
  Building,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Search,
  Sparkles,
  ExternalLink,
  Lock,
  Globe,
  Radio
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { TerminalRegistration } from "../../types.js";

export const TerminalManagerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { terminals, createTerminal, updateTerminalStatus, deleteTerminal, updateTerminalHotkey, appUser } = useAuth();

  const [searchFilter, setSearchFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [googleEmail, setGoogleEmail] = useState("");
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Ciudad de México, CDMX");
  const [category, setCategory] = useState("Joyería y Artículos de Lujo");
  const [assignedRole, setAssignedRole] = useState<"TERMINAL" | "CENTRAL">("TERMINAL");
  const [panicHotkey, setPanicHotkey] = useState("p");
  const [panicHotkeyMode, setPanicHotkeyMode] = useState<'DIRECT' | 'ALT_COMBINATION'>("ALT_COMBINATION");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail) return;

    setIsSubmitting(true);
    try {
      const cleanEmail = googleEmail.trim().toLowerCase();

      // Enforce gmail email addresses
      if (!cleanEmail.endsWith("@gmail.com")) {
        alert("Error: Las cuentas de terminal se deben crear utilizando un correo con terminación @gmail.com.");
        setIsSubmitting(false);
        return;
      }

      // Generate random 8-character password excluding lookalike characters
      const generateRandomPassword = () => {
        const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let pass = "";
        for (let i = 0; i < 8; i++) {
          pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return pass;
      };
      const randomPassword = generateRandomPassword();
      const generatedStoreId = "STR-" + Math.floor(1000 + Math.random() * 9000);

      await createTerminal({
        email: cleanEmail,
        password: randomPassword,
        storeId: generatedStoreId,
        storeName: storeName || `Comercio ${cleanEmail.split("@")[0]}`,
        ownerName: ownerName || "Titular de Sucursal",
        phone: phone || "+52 55 1234 5678",
        address: address || "Av. Insurgentes Sur #100",
        city: city || "CDMX",
        category: category,
        assignedRole: assignedRole,
        status: "ACTIVE",
        coordinates: {
          latitude: 19.4326 + (Math.random() - 0.5) * 0.08,
          longitude: -99.1332 + (Math.random() - 0.5) * 0.08,
          accuracy: 5,
        },
        panicHotkey: panicHotkey || "p",
        panicHotkeyMode: panicHotkeyMode || "ALT_COMBINATION",
      });

      setCreatedCredentials({ email: cleanEmail, pass: randomPassword });
      setSuccessNotice(`Terminal vinculada exitosamente con ${cleanEmail}. Cuenta de acceso generada con contraseña aleatoria.`);
      setGoogleEmail("");
      setStoreName("");
      setOwnerName("");
      setPhone("");
      setAddress("");
      setShowAddForm(false);
      // Keep success notice visible or rely on createdCredentials display
    } catch (err: any) {
      alert("Error al registrar terminal: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTerminals = terminals.filter((t) => {
    // Restrict Central to only see their own terminals
    if (appUser && appUser.role !== "SUPER_ADMIN" && t.centralId !== appUser.centralId) {
      return false;
    }
    const q = (searchFilter || "").toLowerCase();
    return (
      (t.email || "").toLowerCase().includes(q) ||
      (t.storeName || "").toLowerCase().includes(q) ||
      (t.storeId || "").toLowerCase().includes(q) ||
      (t.ownerName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Panel de Control de Roles & Terminales
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-mono">
                  EXCLUSIVO CENTRAL
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Alta y administración de terminales de monitoreo mediante correos de Google (Firestore)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Success Banner */}
        {successNotice && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-5 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Created Credentials Visual Card */}
          {createdCredentials && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 text-xs space-y-3 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-emerald-400">CUENTA DE ACCESO GENERADA</span>
                </div>
                <button
                  onClick={() => setCreatedCredentials(null)}
                  className="text-slate-400 hover:text-white font-mono text-[10px] cursor-pointer"
                >
                  ✕ Cerrar aviso
                </button>
              </div>
              <p className="text-slate-400">
                La terminal ha sido registrada. Comparte estos datos de acceso con el operador de la sucursal comercio:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Correo de Acceso (Gmail):</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="font-mono text-white select-all font-semibold break-all">{createdCredentials.email}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdCredentials.email);
                        alert("Correo copiado al portapapeles");
                      }}
                      className="text-blue-400 hover:text-blue-300 font-bold text-[10px] underline cursor-pointer shrink-0"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Contraseña de Acceso:</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="font-mono text-emerald-400 select-all font-black tracking-wider text-sm">{createdCredentials.pass}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdCredentials.pass);
                        alert("Contraseña copiada al portapapeles");
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-bold text-[10px] underline cursor-pointer shrink-0"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3 text-red-500" />
                <span>Esta contraseña permite el acceso seguro a través del formulario de inicio de sesión.</span>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por correo, tienda o ID..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow cursor-pointer transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showAddForm ? "Cerrar Formulario" : "Dar de Alta Nueva Terminal con Google"}</span>
            </button>
          </div>

          {/* New Terminal Form */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Registrar Autorización de Google para Terminal</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Correo de Google Autorizado <span className="text-red-400">*</span>:
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      placeholder="ejemplo@gmail.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Rol en la Plataforma:
                  </label>
                  <select
                    value={assignedRole}
                    onChange={(e) => setAssignedRole(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="TERMINAL">Terminal (Exclusivo Botón de Pánico)</option>
                    <option value="CENTRAL">Central (Exclusivo Consola de Monitoreo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nombre del Comercio / Sucursal:
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ej: Joyería París Polanco"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Titular o Encargado:
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Ej: Lic. Roberto Gómez"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Teléfono de Contacto:
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+52 55 1234 5678"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Dirección Física:
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Av. Masaryk 310, Col. Polanco"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Modo de Tecla de Pánico:
                  </label>
                  <select
                    value={panicHotkeyMode}
                    onChange={(e) => setPanicHotkeyMode(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="ALT_COMBINATION">Alt + Letra</option>
                    <option value="DIRECT">Letra Directa (Kiosk)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Tecla de Activación:
                  </label>
                  <select
                    value={panicHotkey}
                    onChange={(e) => setPanicHotkey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500 uppercase font-mono"
                  >
                    {"abcdefghijklmnopqrstuvwxyz".split("").map((char) => (
                      <option key={char} value={char}>
                        {char.toUpperCase()}
                      </option>
                    ))}
                    <option value="space">Espacio (Space)</option>
                    <option value="enter">Enter</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Guardando en Firebase..." : "Guardar y Habilitar Acceso"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Terminals Table / Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>LISTADO DE TERMINALES Y CUENTAS VINCULADAS ({filteredTerminals.length})</span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <Radio className="w-3 h-3 animate-pulse" /> Sincronizado en tiempo real con Firestore
              </span>
            </div>

            {filteredTerminals.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                <Store className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400 font-semibold">No hay terminales registradas aún</p>
                <p className="text-xs text-slate-500">
                  Usa el botón superior para dar de alta el primer correo de Google para una terminal.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTerminals.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                            t.assignedRole === "CENTRAL"
                              ? "bg-red-600/20 text-red-400 border border-red-500/30"
                              : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          {t.assignedRole === "CENTRAL" ? <Shield className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white truncate max-w-[180px]">
                            {t.storeName}
                          </h3>
                          <span className="font-mono text-[10px] text-slate-500">ID: {t.storeId}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold font-mono ${
                          t.assignedRole === "CENTRAL"
                            ? "bg-red-950 text-red-400 border border-red-800"
                            : "bg-blue-950 text-blue-400 border border-blue-800"
                        }`}
                      >
                        {t.assignedRole}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-white font-semibold">{t.email}</span>
                      </div>
                      {t.password && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-slate-500 font-mono font-bold">Contraseña:</span>
                          <span className="font-mono text-emerald-400 bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded font-bold select-all text-[11px]">
                            {t.password}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-[11px] truncate">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{t.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{t.phone}</span>
                      </div>
                    </div>

                    {t.assignedRole === "TERMINAL" && (
                      <div className="pt-2 border-t border-slate-900 flex flex-col gap-1 text-[11px]">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Atajo Pánico:</span>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={t.panicHotkeyMode || "ALT_COMBINATION"}
                            onChange={(e) => updateTerminalHotkey(t.id, t.panicHotkey || "p", e.target.value as any)}
                            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-slate-300 focus:outline-none"
                          >
                            <option value="ALT_COMBINATION">Alt + Letra</option>
                            <option value="DIRECT">Letra Directa</option>
                          </select>
                          <select
                            value={t.panicHotkey || "p"}
                            onChange={(e) => updateTerminalHotkey(t.id, e.target.value, t.panicHotkeyMode || "ALT_COMBINATION")}
                            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-slate-300 focus:outline-none uppercase font-mono"
                          >
                            {"abcdefghijklmnopqrstuvwxyz".split("").map((char) => (
                              <option key={char} value={char}>
                                {char.toUpperCase()}
                              </option>
                            ))}
                            <option value="space">Espacio</option>
                            <option value="enter">Enter</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-mono">
                        Reg: {new Date(t.createdAt).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateTerminalStatus(t.id, t.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                          className={`px-2 py-0.5 rounded font-mono font-bold cursor-pointer ${
                            t.status === "ACTIVE"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {t.status === "ACTIVE" ? "HABILITADO" : "SUSPENDIDO"}
                        </button>

                        <button
                          onClick={() => deleteTerminal(t.id)}
                          title="Eliminar terminal"
                          className="p-1 text-slate-500 hover:text-red-400 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-red-400" />
            <span>Las terminales dadas de alta solo acceden a la vista de botón de pánico de su sucursal.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
          >
            Cerrar Panel
          </button>
        </div>
      </div>
    </div>
  );
};
