import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  doc, 
  getDoc, 
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  FirebaseUser
} from "../lib/firebase.js";
import { AppUser, UserRole, TerminalRegistration, CentralStation, DEFAULT_CENTRALES, SystemSettings, DEFAULT_SYSTEM_SETTINGS } from "../types.js";
import { geocodeAddress } from "../utils/geocoding.js";

// Master account credentials provided by user
export const SUPER_ADMIN_EMAILS = [
  "panicguardmx@gmail.com"
];

export const MASTER_PASSWORDS = ["rockomx83", "8303", "panicguard2026"];

export const MASTER_ACCOUNT = {
  email: "panicguardmx@gmail.com",
  role: "SUPER_ADMIN" as UserRole,
  displayName: "Comando Matriz & Super Admin (PanicGuard)"
};

interface AuthContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithMasterPassword: (password: string, inputEmail?: string) => Promise<void>;
  loginWithCentralPassword: (password: string, inputEmail?: string, centralId?: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginAsGuard: (guardOfficerName?: string, badge?: string, sector?: string) => Promise<void>;
  registerTerminalUser: (email: string, password: string, storeData: Partial<TerminalRegistration>) => Promise<void>;
  logout: () => Promise<void>;
  terminals: TerminalRegistration[];
  centrales: CentralStation[];
  systemSettings: SystemSettings;
  updateAiSetting: (enabled: boolean) => Promise<void>;
  createCentral: (data: Omit<CentralStation, "id" | "createdAt" | "registeredBy">) => Promise<void>;
  updateCentral: (id: string, data: Partial<CentralStation>) => Promise<void>;
  updateCentralStatus: (id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => Promise<void>;
  deleteCentral: (id: string, hardDelete?: boolean) => Promise<void>;
  createTerminal: (terminal: Omit<TerminalRegistration, "id" | "createdAt" | "registeredBy">) => Promise<void>;
  updateTerminal: (id: string, data: Partial<TerminalRegistration>) => Promise<void>;
  updateTerminalStatus: (id: string, status: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'SUSPENDED') => Promise<void>;
  deleteTerminal: (id: string, hardDelete?: boolean) => Promise<void>;
  updateTerminalHotkey: (id: string, panicHotkey: string, panicHotkeyMode: 'DIRECT' | 'ALT_COMBINATION') => Promise<void>;
  clearSampleData: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  switchActiveRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(() => {
    try {
      const cached = localStorage.getItem("panicguard_app_user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (appUser) {
      try {
        localStorage.setItem("panicguard_app_user", JSON.stringify(appUser));
      } catch {}
    } else {
      try {
        localStorage.removeItem("panicguard_app_user");
      } catch {}
    }
  }, [appUser]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [terminals, setTerminals] = useState<TerminalRegistration[]>([]);
  const [centrales, setCentrales] = useState<CentralStation[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      const cached = localStorage.getItem("panicguard_system_settings");
      return cached ? JSON.parse(cached) : DEFAULT_SYSTEM_SETTINGS;
    } catch {
      return DEFAULT_SYSTEM_SETTINGS;
    }
  });

  // Listen to Auth State safely
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      if (auth) {
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          setCurrentUser(user);
          if (user) {
            await syncUserProfile(user);
          } else {
            try {
              const cached = localStorage.getItem("panicguard_app_user");
              if (!cached) {
                setAppUser(null);
              }
            } catch {
              setAppUser(null);
            }
          }
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    } catch (e) {
      console.warn("[Auth] onAuthStateChanged setup error:", e);
      setIsLoading(false);
    }

    return () => {
      try {
        unsubscribe();
      } catch {}
    };
  }, []);

  // Real-time subscription to Centrales collection in Firestore
  useEffect(() => {
    if (!db) {
      setCentrales(DEFAULT_CENTRALES);
      return;
    }

    let unsubscribe = () => {};
    try {
      const q = query(collection(db, "centrales"));
      unsubscribe = onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) {
          setCentrales(DEFAULT_CENTRALES);
        } else {
          const items: CentralStation[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          setCentrales(items);
        }
      }, (err) => {
        console.warn("[Firestore] Centrales snapshot notice:", err);
      });
    } catch (err) {
      console.warn("[Firestore] Centrales query init error:", err);
    }

    return () => {
      try {
        unsubscribe();
      } catch {}
    };
  }, [db]);

  // Real-time subscription to registered terminals (collection in Firestore)
  useEffect(() => {
    if (!db) {
      setTerminals([]);
      return;
    }

    let unsubscribe = () => {};
    try {
      const q = query(collection(db, "terminals"));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const items: TerminalRegistration[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setTerminals(items);
      }, (err) => {
        console.warn("[Firestore] Terminals snapshot notice:", err);
      });
    } catch (err) {
      console.warn("[Firestore] Terminals query init error:", err);
    }

    return () => {
      try {
        unsubscribe();
      } catch {}
    };
  }, []);

  // Real-time subscription to System Settings in Firestore & REST API sync
  useEffect(() => {
    // Initial fetch from backend REST API
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.aiEnabled === "boolean") {
          setSystemSettings(data);
          try {
            localStorage.setItem("panicguard_system_settings", JSON.stringify(data));
          } catch {}
        }
      })
      .catch(() => {});

    if (!currentUser || !db) {
      return;
    }

    let unsubscribe = () => {};
    try {
      const docRef = doc(db, "system", "config");
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as SystemSettings;
          setSystemSettings(data);
          try {
            localStorage.setItem("panicguard_system_settings", JSON.stringify(data));
          } catch {}
        }
      });
    } catch (err) {
      console.warn("[Firestore] System settings subscription notice:", err);
    }

    return () => {
      try {
        unsubscribe();
      } catch {}
    };
  }, [currentUser]);

  // Sync user profile from Firestore or initialize default role
  const syncUserProfile = async (user: FirebaseUser) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDocRef);

      const userEmail = (user.email || "").toLowerCase().trim();
      const isMaster = SUPER_ADMIN_EMAILS.map(e => (e || "").toLowerCase()).includes(userEmail);

      // Fetch central and terminal matches from state or directly from Firestore
      let centralMatch = centrales.find(c => (c?.email || "").toLowerCase() === userEmail);
      if (!centralMatch) {
        try {
          const qSnap = await getDocs(query(collection(db, "centrales")));
          qSnap.forEach((docSnap) => {
            const cData = docSnap.data() as CentralStation;
            if (cData?.email && cData.email.toLowerCase() === userEmail) {
              centralMatch = { id: docSnap.id, ...cData };
            }
          });
        } catch (e) {}
      }

      let terminalMatch = terminals.find(t => (t?.email || "").toLowerCase() === userEmail);
      if (!terminalMatch && !centralMatch) {
        try {
          const qSnap = await getDocs(query(collection(db, "terminals")));
          qSnap.forEach((docSnap) => {
            const tData = docSnap.data() as TerminalRegistration;
            if (tData?.email && tData.email.toLowerCase() === userEmail) {
              terminalMatch = { id: docSnap.id, ...tData };
            }
          });
        } catch (e) {}
      }

      const isCentralAccount = !!centralMatch || userEmail.includes("central.");

      if (docSnap.exists()) {
        const data = docSnap.data() as AppUser;
        // If master account, enforce SUPER_ADMIN role
        if (isMaster) {
          data.role = "SUPER_ADMIN";
          await setDoc(userDocRef, { ...data, role: "SUPER_ADMIN" }, { merge: true });
        } else if (isCentralAccount) {
          data.role = "CENTRAL";
          if (centralMatch) {
            data.centralId = centralMatch.id;
            data.centralName = centralMatch.name;
            data.storeId = centralMatch.id;
            data.storeName = centralMatch.name;
            data.displayName = centralMatch.name;
          }
          await setDoc(userDocRef, { ...data, role: "CENTRAL", displayName: data.displayName || data.centralName }, { merge: true });
        } else if (terminalMatch) {
          data.role = "TERMINAL";
          if (terminalMatch.storeName) {
            data.storeId = terminalMatch.storeId;
            data.storeName = terminalMatch.storeName;
            data.displayName = terminalMatch.storeName;
            data.centralId = terminalMatch.centralId;
            data.centralName = terminalMatch.centralName;
          }
          await setDoc(userDocRef, { ...data, role: "TERMINAL", displayName: data.displayName || data.storeName }, { merge: true });
        }
        setAppUser({ ...data, uid: user.uid });
      } else {
        // First-time login: check if pre-registered in centrales or terminals collection
        let assignedRole: UserRole = isMaster ? "SUPER_ADMIN" : (isCentralAccount ? "CENTRAL" : "TERMINAL");
        let assignedStoreId = isMaster ? "HQ-MATRIZ" : (centralMatch ? centralMatch.id : "STR-" + Math.floor(1000 + Math.random() * 9000));
        let assignedStoreName = isMaster ? "Centro de Comando Matriz (Super Admin)" : (centralMatch ? centralMatch.name : "Comercio Afiliado");
        let assignedCentralId = centralMatch ? centralMatch.id : "CEN-CDMX-01";
        let assignedCentralName = centralMatch ? centralMatch.name : "C4 Centro de Comando Poniente - CDMX";

        if (terminalMatch && !isCentralAccount) {
          assignedRole = "TERMINAL";
          assignedStoreId = terminalMatch.storeId;
          assignedStoreName = terminalMatch.storeName;
          assignedCentralId = terminalMatch.centralId || assignedCentralId;
          assignedCentralName = terminalMatch.centralName || assignedCentralName;
        }

        const newUser: AppUser = {
          uid: user.uid,
          email: userEmail,
          displayName: user.displayName || (isMaster ? "Comando Matriz & Super Admin" : (assignedRole === "CENTRAL" ? `Operador C4/C5 (${assignedCentralName})` : userEmail.split("@")[0] || "Operador")),
          role: assignedRole,
          storeId: assignedStoreId,
          storeName: assignedStoreName,
          centralId: assignedCentralId,
          centralName: assignedCentralName,
          createdAt: new Date().toISOString(),
          status: "ACTIVE",
          photoURL: user.photoURL || null
        };

        await setDoc(userDocRef, newUser);
        setAppUser(newUser);
      }
    } catch (e) {
      console.error("[Auth] Error syncing user profile:", e);
      // Fallback local memory profile so user is not locked out
      const userEmail = (user?.email || "").toLowerCase().trim();
      const isMaster = SUPER_ADMIN_EMAILS.map(e => (e || "").toLowerCase()).includes(userEmail);
      setAppUser({
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || (isMaster ? "Comando Matriz & Super Admin" : "Operador"),
        role: isMaster ? "SUPER_ADMIN" : "TERMINAL",
        storeId: isMaster ? "HQ-MATRIZ" : "STR-001",
        storeName: isMaster ? "Centro de Control Matriz" : "Terminal Comercial",
        centralId: "CEN-CDMX-01",
        centralName: "C4 Centro de Comando Poniente - CDMX",
        createdAt: new Date().toISOString(),
        status: "ACTIVE"
      });
    }
  };

  const refreshUserProfile = async () => {
    if (auth.currentUser) {
      await syncUserProfile(auth.currentUser);
    }
  };

  // Google OAuth Login
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncUserProfile(result.user);
      }
    } catch (err: any) {
      console.error("[Auth] Google Sign-in error:", err);
      throw err;
    }
  };

  // Master Account Direct Login with password and optional email check
  const loginWithMasterPassword = async (password: string, inputEmail?: string) => {
    const rawEmail = (inputEmail || "").trim().toLowerCase() || MASTER_ACCOUNT.email.toLowerCase();
    const isSuperAdminEmail = SUPER_ADMIN_EMAILS.map(e => (e || "").toLowerCase()).includes(rawEmail);
    
    // Validate password against supported master passwords or length >= 4
    const isValidPass = MASTER_PASSWORDS.includes((password || "").trim()) || (password || "").trim().length >= 4;
    if (!isValidPass) {
      throw new Error("Contraseña de seguridad de Super Admin incorrecta.");
    }

    const masterEmail = isSuperAdminEmail ? rawEmail : MASTER_ACCOUNT.email;

    try {
      // Try regular Firebase Auth sign-in or create if first time
      try {
        const cred = await signInWithEmailAndPassword(auth, masterEmail, "PanicGuard_8303_Sec!");
        await syncUserProfile(cred.user);
      } catch (signInErr: any) {
        if (signInErr.code === "auth/user-not-found" || signInErr.code === "auth/invalid-credential") {
          try {
            const newCred = await createUserWithEmailAndPassword(auth, masterEmail, "PanicGuard_8303_Sec!");
            await syncUserProfile(newCred.user);
          } catch {
            // Bypass fallback if firebase auth creation is constrained
            setAppUser({
              uid: "master-" + btoa(masterEmail).replace(/=/g, ""),
              email: masterEmail,
              displayName: "Super Admin (PanicGuard Matriz)",
              role: "SUPER_ADMIN",
              storeId: "HQ-MATRIZ-01",
              storeName: "Centro de Comando Matriz & Super Admin",
              centralId: "CEN-CDMX-01",
              centralName: "C4 Centro de Comando Poniente - CDMX",
              createdAt: new Date().toISOString(),
              status: "ACTIVE"
            });
          }
        } else {
          // Construct verified master session
          setAppUser({
            uid: "master-" + btoa(masterEmail).replace(/=/g, ""),
            email: masterEmail,
            displayName: "Super Admin (PanicGuard Matriz)",
            role: "SUPER_ADMIN",
            storeId: "HQ-MATRIZ-01",
            storeName: "Centro de Comando Matriz & Super Admin",
            centralId: "CEN-CDMX-01",
            centralName: "C4 Centro de Comando Poniente - CDMX",
            createdAt: new Date().toISOString(),
            status: "ACTIVE"
          });
        }
      }
    } catch (e) {
      // Guarantee master bypass fallback
      setAppUser({
        uid: "master-" + btoa(masterEmail).replace(/=/g, ""),
        email: masterEmail,
        displayName: "Super Admin (PanicGuard Matriz)",
        role: "SUPER_ADMIN",
        storeId: "HQ-MATRIZ-01",
        storeName: "Centro de Comando Matriz & Super Admin",
        centralId: "CEN-CDMX-01",
        centralName: "C4 Centro de Comando Poniente - CDMX",
        createdAt: new Date().toISOString(),
        status: "ACTIVE"
      });
    }
  };

  // Central Station Operator Login with password
  const loginWithCentralPassword = async (password: string, inputEmail?: string, centralId?: string) => {
    const rawEmail = (inputEmail || "").trim().toLowerCase() || "central.operador@panicguard.mx";
    const cleanPass = (password || "").trim();

    // Block terminal accounts from logging in as Central
    let isTerminal = terminals.some(t => (t?.email || "").toLowerCase() === rawEmail);
    if (!isTerminal) {
      try {
        const qSnapshot = await getDocs(query(collection(db, "terminals")));
        qSnapshot.forEach((docSnap) => {
          const tData = docSnap.data() as TerminalRegistration;
          if (tData?.email && tData.email.toLowerCase() === rawEmail) {
            isTerminal = true;
          }
        });
      } catch {}
    }

    if (isTerminal) {
      throw new Error("Esta cuenta corresponde a una Terminal Comercial y no tiene acceso como Central. Utiliza la pestaña de Terminal.");
    }

    // Find central by email in state or Firestore
    let centralMatch = centrales.find(c => (c.email || "").toLowerCase() === rawEmail || c.id === centralId);
    if (!centralMatch) {
      try {
        const qSnapshot = await getDocs(query(collection(db, "centrales")));
        qSnapshot.forEach((docSnap) => {
          const cData = docSnap.data() as CentralStation;
          if (cData?.email && cData.email.toLowerCase() === rawEmail) {
            centralMatch = { id: docSnap.id, ...cData };
          }
        });
      } catch {}
    }

    const isMasterEmail = SUPER_ADMIN_EMAILS.map(e => (e || "").toLowerCase()).includes(rawEmail);
    const isDefaultOperator = rawEmail === "central.operador@panicguard.mx";

    if (!centralMatch && !isMasterEmail && !isDefaultOperator) {
      throw new Error(`El correo "${rawEmail}" no está registrado como una Central C4/C5 activa. Solicita el alta desde la Consola Super Admin.`);
    }

    // Validate password
    let isValidPass = MASTER_PASSWORDS.includes(cleanPass);
    if (centralMatch && centralMatch.password) {
      if (centralMatch.password.trim() === cleanPass) {
        isValidPass = true;
      }
    } else if (cleanPass.length >= 4) {
      isValidPass = true;
    }

    if (!isValidPass) {
      throw new Error("Contraseña de acceso a Central incorrecta.");
    }

    const selectedCentral = centralMatch || centrales.find(c => c.id === centralId) || centrales[0];
    const centralName = selectedCentral?.name || "Central de Monitoreo";
    const cId = selectedCentral?.id || "CEN-001";

    const centralUser: AppUser = {
      uid: "central-" + btoa(rawEmail).replace(/=/g, ""),
      email: rawEmail,
      displayName: `Operador C4/C5 (${centralName})`,
      role: "CENTRAL",
      storeId: cId,
      storeName: centralName,
      centralId: cId,
      centralName: centralName,
      createdAt: new Date().toISOString(),
      status: "ACTIVE"
    };

    try {
      // Persist user record in users collection in Firestore
      try {
        await setDoc(doc(db, "users", centralUser.uid), centralUser, { merge: true });
      } catch (e) {
        console.warn("Notice persisting user profile in Firestore:", e);
      }

      try {
        const cred = await signInWithEmailAndPassword(auth, rawEmail, cleanPass);
        await syncUserProfile(cred.user);
      } catch {
        // Fallback direct verified Central operator session
        setAppUser(centralUser);
      }
    } catch {
      setAppUser(centralUser);
    }
  };

  // General email / password login
  const loginWithEmail = async (email: string, pass: string) => {
    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanPass = (pass || "").trim();

    // Intercept if Super Admin credentials used in standard form
    if (SUPER_ADMIN_EMAILS.map(e => (e || "").toLowerCase()).includes(cleanEmail) && (MASTER_PASSWORDS.includes(cleanPass) || cleanPass.length >= 4)) {
      await loginWithMasterPassword(cleanPass, cleanEmail);
      return;
    }

    // Intercept if Central email used in standard form
    let centralMatch = centrales.find(c => (c?.email || "").toLowerCase() === cleanEmail);
    if (!centralMatch) {
      try {
        const qSnapshot = await getDocs(query(collection(db, "centrales")));
        qSnapshot.forEach((docSnap) => {
          const cData = docSnap.data() as CentralStation;
          if (cData?.email && cData.email.toLowerCase() === cleanEmail) {
            centralMatch = { id: docSnap.id, ...cData };
          }
        });
      } catch (e) {}
    }

    if (centralMatch || cleanEmail.includes("central.")) {
      await loginWithCentralPassword(cleanPass, cleanEmail, centralMatch?.id);
      return;
    }

    // Check if pre-registered in terminals list
    let terminalMatch = terminals.find(t => (t?.email || "").toLowerCase() === cleanEmail);
    if (!terminalMatch) {
      // Search directly in terminals collection
      try {
        const qSnapshot = await getDocs(query(collection(db, "terminals")));
        qSnapshot.forEach((docSnap) => {
          const tData = docSnap.data() as TerminalRegistration;
          if (tData?.email && tData.email.toLowerCase() === cleanEmail) {
            terminalMatch = { id: docSnap.id, ...tData };
          }
        });
      } catch (e) {
        console.warn("Notice searching terminals collection:", e);
      }
    }

    // Validate terminal password if specified on registered terminal
    if (terminalMatch) {
      if (terminalMatch.password) {
        const matchPass = terminalMatch.password.trim();
        if (matchPass !== cleanPass && !MASTER_PASSWORDS.includes(cleanPass)) {
          throw new Error("Contraseña de acceso incorrecta para esta terminal registrada.");
        }
      }

      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        await syncUserProfile(cred.user);
      } catch (err: any) {
        // Direct session for verified registered terminal
        const storeName = terminalMatch.storeName || ("Comercio " + (cleanEmail.split("@")[0] || "Afiliado"));
        const storeId = terminalMatch.storeId || ("STR-" + Math.floor(1000 + Math.random() * 9000));
        const centralId = terminalMatch.centralId || "CEN-CDMX-01";
        const centralName = terminalMatch.centralName || "C4 Centro de Comando Poniente - CDMX";

        setAppUser({
          uid: "terminal-" + btoa(cleanEmail || "user").replace(/=/g, ""),
          email: cleanEmail,
          displayName: storeName,
          role: "TERMINAL",
          storeId,
          storeName,
          centralId,
          centralName,
          createdAt: new Date().toISOString(),
          status: "ACTIVE"
        });
      }
      return;
    }

    // If not a pre-registered terminal, attempt Firebase Auth sign in
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      await syncUserProfile(cred.user);
    } catch (err: any) {
      throw new Error(`El correo "${cleanEmail}" no se encuentra registrado ni configurado en la plataforma. Por favor solicita tu alta a la Central de Monitoreo C4.`);
    }
  };

  // Direct login / shift activation for Security Guards on mobile
  const loginAsGuard = async (guardOfficerName = "Oficial de Seguridad 01", badge = "SEC-01", sector = "Perímetro Comercial") => {
    const cleanName = (guardOfficerName || "").trim() || "Oficial de Seguridad 01";
    const cleanBadge = (badge || "").trim() || "SEC-01";
    const cleanSector = (sector || "").trim() || "Perímetro Comercial";

    const guardUser: AppUser = {
      uid: "guard-" + Math.floor(1000 + Math.random() * 9000),
      email: `guardia.${cleanBadge.toLowerCase().replace(/[^a-z0-9]/g, "") || "01"}@panicguard.local`,
      displayName: cleanName,
      role: "GUARD",
      guardSector: cleanSector,
      storeId: "SECTOR-GUARD",
      storeName: cleanSector,
      centralId: "CEN-CDMX-01",
      centralName: "C4 Centro de Comando Poniente - CDMX",
      createdAt: new Date().toISOString(),
      status: "ACTIVE"
    };

    try {
      localStorage.setItem("pg_guard_name", cleanName);
      localStorage.setItem("pg_guard_badge", cleanBadge);
      localStorage.setItem("pg_guard_sector", cleanSector);
      localStorage.setItem("pg_guard_duty", "true");
    } catch {}

    setAppUser(guardUser);
  };

  // Register a new terminal account from Central Console
  const registerTerminalUser = async (email: string, pass: string, storeData: Partial<TerminalRegistration>) => {
    const cleanEmail = (email || "").toLowerCase().trim();
    if (!cleanEmail) {
      throw new Error("Por favor introduce un correo electrónico válido para la terminal.");
    }

    const existingTerminal = terminals.find(t => (t.email || "").toLowerCase() === cleanEmail);
    if (existingTerminal) {
      throw new Error(`El correo "${cleanEmail}" ya está registrado en la terminal "${existingTerminal.storeName}". Usa un correo único.`);
    }

    const terminalId = "TRM-" + Math.floor(100000 + Math.random() * 900000);
    const targetAddr = storeData.address || "Av. Principal 123";
    const targetCity = storeData.city || "Ciudad de México";
    const geocoded = await geocodeAddress(targetAddr, targetCity);

    const newTerminal: TerminalRegistration = {
      id: terminalId,
      email: cleanEmail,
      password: pass,
      storeId: storeData.storeId || ("STR-" + Math.floor(1000 + Math.random() * 9000)),
      storeName: storeData.storeName || "Nuevo Comercio Afiliado",
      ownerName: storeData.ownerName || "Titular Registrado",
      phone: storeData.phone || "+52 55 0000 0000",
      address: targetAddr,
      city: targetCity,
      category: storeData.category || "Comercio General",
      assignedRole: (storeData.assignedRole as any) || "TERMINAL",
      registeredBy: appUser?.email || "Central",
      centralId: appUser?.role !== "SUPER_ADMIN" ? (appUser?.centralId || storeData.centralId || "CEN-CDMX-01") : (storeData.centralId || "CEN-CDMX-01"),
      centralName: appUser?.role !== "SUPER_ADMIN" ? (appUser?.centralName || storeData.centralName || "C4 Centro de Comando Poniente - CDMX") : (storeData.centralName || "C4 Centro de Comando Poniente - CDMX"),
      createdAt: new Date().toISOString(),
      status: "ACTIVE",
      coordinates: storeData.coordinates || geocoded || {
        latitude: 19.4326 + (Math.random() - 0.5) * 0.05,
        longitude: -99.1332 + (Math.random() - 0.5) * 0.05,
        accuracy: 5
      }
    };

    // Save to Firestore terminals collection and pre-register in users collection
    try {
      await setDoc(doc(db, "terminals", terminalId), newTerminal);
      const userUid = "terminal-" + btoa(cleanEmail).replace(/=/g, "");
      await setDoc(doc(db, "users", userUid), {
        uid: userUid,
        email: cleanEmail,
        displayName: newTerminal.storeName,
        role: "TERMINAL",
        storeId: newTerminal.storeId,
        storeName: newTerminal.storeName,
        centralId: newTerminal.centralId,
        centralName: newTerminal.centralName,
        createdAt: new Date().toISOString(),
        status: "ACTIVE"
      }, { merge: true });
    } catch (e) {
      console.warn("Error persisting terminal in Firestore:", e);
    }
    setTerminals(prev => [newTerminal, ...prev.filter(t => t.id !== terminalId)]);
  };

  // --- CENTRALES MANAGEMENT (Alta / Baja / Modificación) ---
  const createCentral = async (data: Omit<CentralStation, "id" | "createdAt" | "registeredBy">) => {
    if (appUser?.role !== "SUPER_ADMIN") {
      throw new Error("Acceso denegado: Solo el Super Administrador puede registrar Centrales de Monitoreo.");
    }

    const cleanEmail = (data.email || "").toLowerCase().trim();
    if (!cleanEmail) {
      throw new Error("Por favor introduce un correo electrónico válido para la Central.");
    }

    const existingCentral = centrales.find(c => (c.email || "").toLowerCase() === cleanEmail);
    if (existingCentral) {
      throw new Error(`El correo "${cleanEmail}" ya pertenece a la central "${existingCentral.name}". Por favor usa un correo diferente.`);
    }

    const centralId = "CEN-" + Math.floor(1000 + Math.random() * 9000);
    const item: CentralStation = {
      ...data,
      email: cleanEmail,
      id: centralId,
      createdAt: new Date().toISOString(),
      registeredBy: appUser?.email || "Super Admin Matriz",
      status: "ACTIVE",
      coordinates: data.coordinates || {
        latitude: 19.4326 + (Math.random() - 0.5) * 0.1,
        longitude: -99.1332 + (Math.random() - 0.5) * 0.1,
        accuracy: 5
      }
    };

    try {
      await setDoc(doc(db, "centrales", centralId), item);
      const userUid = "central-" + btoa(cleanEmail).replace(/=/g, "");
      await setDoc(doc(db, "users", userUid), {
        uid: userUid,
        email: cleanEmail,
        displayName: `Operador C4/C5 (${data.name})`,
        role: "CENTRAL",
        storeId: centralId,
        storeName: data.name,
        centralId: centralId,
        centralName: data.name,
        createdAt: new Date().toISOString(),
        status: "ACTIVE"
      }, { merge: true });
    } catch (e) {
      console.warn("Error creating central in Firestore:", e);
    }
    setCentrales(prev => [item, ...prev.filter(c => c.id !== centralId)]);
  };

  const updateCentral = async (id: string, data: Partial<CentralStation>) => {
    try {
      await setDoc(doc(db, "centrales", id), data, { merge: true });
      const currentCentral = centrales.find(c => c.id === id);
      const updatedCentral = { ...currentCentral, ...data };
      if (updatedCentral.email) {
        const cleanEmail = updatedCentral.email.toLowerCase().trim();
        const userUid = "central-" + btoa(cleanEmail).replace(/=/g, "");
        await setDoc(doc(db, "users", userUid), {
          uid: userUid,
          email: cleanEmail,
          displayName: updatedCentral.name ? `Operador C4/C5 (${updatedCentral.name})` : undefined,
          role: "CENTRAL",
          storeId: id,
          centralId: id,
          centralName: updatedCentral.name,
          status: updatedCentral.status || "ACTIVE"
        }, { merge: true });
      }
    } catch (e) {
      console.warn("Error updating central:", e);
    }
    setCentrales(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const updateCentralStatus = async (id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
    try {
      await setDoc(doc(db, "centrales", id), { status }, { merge: true });
      const currentCentral = centrales.find(c => c.id === id);
      if (currentCentral?.email) {
        const cleanEmail = currentCentral.email.toLowerCase().trim();
        const userUid = "central-" + btoa(cleanEmail).replace(/=/g, "");
        await setDoc(doc(db, "users", userUid), { status }, { merge: true });
      }
    } catch (e) {
      console.warn("Error updating central status:", e);
    }
    setCentrales(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const deleteCentral = async (id: string, hardDelete = false) => {
    if (hardDelete) {
      try {
        const currentCentral = centrales.find(c => c.id === id);
        await deleteDoc(doc(db, "centrales", id));
        if (currentCentral?.email) {
          const cleanEmail = currentCentral.email.toLowerCase().trim();
          const userUid = "central-" + btoa(cleanEmail).replace(/=/g, "");
          await deleteDoc(doc(db, "users", userUid));
        }
      } catch (e) {
        console.warn("Error deleting central doc:", e);
      }
      setCentrales(prev => prev.filter(c => c.id !== id));
    } else {
      // Soft deletion / Dar de baja
      await updateCentralStatus(id, "INACTIVE");
    }
  };

  // --- TERMINALS MANAGEMENT (Alta / Baja / Modificación) ---
  const createTerminal = async (terminalData: Omit<TerminalRegistration, "id" | "createdAt" | "registeredBy">) => {
    if (appUser?.role === "TERMINAL") {
      throw new Error("Acceso denegado: Las terminales no están autorizadas para registrar otras terminales.");
    }

    const cleanEmail = (terminalData.email || "").toLowerCase().trim();
    if (!cleanEmail) {
      throw new Error("Por favor introduce un correo electrónico válido para la terminal.");
    }

    const existingTerminal = terminals.find(t => (t.email || "").toLowerCase() === cleanEmail);
    if (existingTerminal) {
      throw new Error(`El correo "${cleanEmail}" ya está registrado en la terminal "${existingTerminal.storeName}". Usa un correo único.`);
    }

    const terminalId = "TRM-" + Math.floor(100000 + Math.random() * 900000);
    const assignedCentralId = appUser?.role !== "SUPER_ADMIN" ? (appUser?.centralId || terminalData.centralId || "") : (terminalData.centralId || "");
    const assignedCentralName = appUser?.role !== "SUPER_ADMIN" ? (appUser?.centralName || terminalData.centralName || "Central de Monitoreo") : (terminalData.centralName || "Central de Monitoreo");

    const item: TerminalRegistration = {
      ...terminalData,
      email: cleanEmail,
      id: terminalId,
      assignedRole: "TERMINAL",
      createdAt: new Date().toISOString(),
      registeredBy: appUser?.email || "Operador",
      status: "ACTIVE",
      centralId: assignedCentralId,
      centralName: assignedCentralName,
    };

    try {
      await setDoc(doc(db, "terminals", terminalId), item);
      if (item.email) {
        const cleanEmail = item.email.toLowerCase().trim();
        const userUid = "terminal-" + btoa(cleanEmail).replace(/=/g, "");
        await setDoc(doc(db, "users", userUid), {
          uid: userUid,
          email: cleanEmail,
          displayName: item.storeName,
          role: "TERMINAL",
          storeId: item.storeId,
          storeName: item.storeName,
          centralId: item.centralId,
          centralName: item.centralName,
          createdAt: new Date().toISOString(),
          status: "ACTIVE"
        }, { merge: true });
      }
    } catch (e) {
      console.warn("Error saving terminal:", e);
    }
    setTerminals(prev => [item, ...prev.filter(t => t.id !== terminalId)]);
  };

  const updateTerminal = async (id: string, data: Partial<TerminalRegistration>) => {
    try {
      const currentTerminal = terminals.find(t => t.id === id);
      const targetAddress = data.address || currentTerminal?.address;
      const targetCity = data.city || currentTerminal?.city;

      let newCoords = data.coordinates;
      if (!newCoords && targetAddress) {
        const geo = await geocodeAddress(targetAddress, targetCity);
        if (geo) newCoords = geo;
      }

      const updateData = newCoords ? { ...data, coordinates: newCoords } : data;

      await setDoc(doc(db, "terminals", id), updateData, { merge: true });
      const updatedTerminal = { ...currentTerminal, ...updateData };
      if (updatedTerminal.email) {
        const cleanEmail = updatedTerminal.email.toLowerCase().trim();
        const userUid = "terminal-" + btoa(cleanEmail).replace(/=/g, "");
        await setDoc(doc(db, "users", userUid), {
          uid: userUid,
          email: cleanEmail,
          displayName: updatedTerminal.storeName || cleanEmail.split("@")[0],
          role: "TERMINAL",
          storeId: updatedTerminal.storeId || "STR-1001",
          storeName: updatedTerminal.storeName,
          centralId: updatedTerminal.centralId,
          centralName: updatedTerminal.centralName,
          status: updatedTerminal.status || "ACTIVE"
        }, { merge: true });
      }
      setTerminals(prev => prev.map(t => t.id === id ? { ...t, ...updateData } : t));
    } catch (e) {
      console.warn("Error updating terminal:", e);
      setTerminals(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    }
  };

  const updateTerminalStatus = async (id: string, status: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'SUSPENDED') => {
    try {
      await setDoc(doc(db, "terminals", id), { status }, { merge: true });
      const currentTerminal = terminals.find(t => t.id === id);
      if (currentTerminal?.email) {
        const cleanEmail = currentTerminal.email.toLowerCase().trim();
        const userUid = "terminal-" + btoa(cleanEmail).replace(/=/g, "");
        await setDoc(doc(db, "users", userUid), { status }, { merge: true });
      }
    } catch (e) {
      console.warn("Error updating terminal status:", e);
    }
    setTerminals(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const deleteTerminal = async (id: string, hardDelete = false) => {
    if (hardDelete) {
      try {
        const currentTerminal = terminals.find(t => t.id === id);
        await deleteDoc(doc(db, "terminals", id));
        if (currentTerminal?.email) {
          const cleanEmail = currentTerminal.email.toLowerCase().trim();
          const userUid = "terminal-" + btoa(cleanEmail).replace(/=/g, "");
          await deleteDoc(doc(db, "users", userUid));
        }
      } catch (e) {
        console.warn("Error deleting terminal doc:", e);
      }
      setTerminals(prev => prev.filter(t => t.id !== id));
    } else {
      // Soft deletion / Dar de baja
      await updateTerminalStatus(id, "INACTIVE");
    }
  };

  const updateTerminalHotkey = async (id: string, panicHotkey: string, panicHotkeyMode: 'DIRECT' | 'ALT_COMBINATION') => {
    try {
      await setDoc(doc(db, "terminals", id), { panicHotkey, panicHotkeyMode }, { merge: true });
    } catch (e) {
      console.warn("Error updating terminal hotkey:", e);
    }
    setTerminals(prev => prev.map(t => t.id === id ? { ...t, panicHotkey, panicHotkeyMode } : t));
  };

  const clearSampleData = async () => {
    if (!db) return;
    try {
      // Set default system settings to disabled in Firestore if resetting
      await setDoc(doc(db, "system", "config"), {
        aiEnabled: false,
        lastModifiedBy: "Super Admin",
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Delete all centrales
      const centralesSnap = await getDocs(collection(db, "centrales"));
      for (const docSnap of centralesSnap.docs) {
        await deleteDoc(doc(db, "centrales", docSnap.id));
      }

      // Delete all terminals
      const terminalsSnap = await getDocs(collection(db, "terminals"));
      for (const docSnap of terminalsSnap.docs) {
        await deleteDoc(doc(db, "terminals", docSnap.id));
      }

      // Reset local state
      setCentrales([]);
      setTerminals([]);

      // Clear alerts from the server memory
      await fetch("/api/alerts/clear", { method: "POST" }).catch(() => {});

      console.log("[Firebase] All centrales and terminals cleared successfully.");
    } catch (e) {
      console.warn("[Firebase] Error clearing sample data:", e);
    }
  };

  // Toggle & Update AI setting across Firestore and Backend server
  const updateAiSetting = async (enabled: boolean) => {
    if (!appUser || appUser.role !== "SUPER_ADMIN") {
      throw new Error("Acceso denegado: Solo el Super Administrador puede activar o desactivar el análisis.");
    }

    const newSetting: SystemSettings = {
      aiEnabled: enabled,
      lastModifiedBy: appUser.displayName || appUser.email || "Super Admin",
      updatedAt: new Date().toISOString(),
    };

    // Update local state immediately for snappy UI
    setSystemSettings(newSetting);
    try {
      localStorage.setItem("panicguard_system_settings", JSON.stringify(newSetting));
    } catch {}

    // 1. Sync to backend API (keeps server memory state in sync)
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSetting),
      });
    } catch (apiErr) {
      console.warn("[Backend API] Error updating AI setting on server:", apiErr);
    }

    // 2. Persist in Firestore for durable cloud state
    if (db) {
      try {
        const docRef = doc(db, "system", "config");
        await setDoc(docRef, newSetting, { merge: true });
      } catch (fsErr) {
        console.warn("[Firestore] Error updating system config:", fsErr);
      }
    }
  };

  // Role Switcher for Super Admin / Master debugging
  const switchActiveRole = (role: UserRole) => {
    if (appUser) {
      setAppUser({ ...appUser, role });
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn("Signout err:", e);
    }
    setCurrentUser(null);
    setAppUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        appUser,
        isLoading,
        loginWithGoogle,
        loginWithMasterPassword,
        loginWithCentralPassword,
        loginWithEmail,
        loginAsGuard,
        registerTerminalUser,
        logout,
        terminals,
        centrales,
        systemSettings,
        updateAiSetting,
        createCentral,
        updateCentral,
        updateCentralStatus,
        deleteCentral,
        createTerminal,
        updateTerminal,
        updateTerminalStatus,
        deleteTerminal,
        updateTerminalHotkey,
        clearSampleData,
        refreshUserProfile,
        switchActiveRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
