// js/rbac.js - Núcleo de Gobernanza y Control de Acceso RBAC (Blindado)
import { auth, db, doc, getDoc, onSnapshot, collection } from "./firebase-config.js";

const SUPER_UID = "zeVjo7RcQqRKjq1T7goO22SMHip1";
const SUPER_EMAIL = "valladarescid@gmail.com";

// Diccionario de equivalencias canónicas
const DICCIONARIO_CANONICO = {
  // Verbos en español a siglas
  crear: "c",
  ver: "r",
  editar: "u",
  eliminar: "d",
  alta: "c",
  registrar: "c",
  leer: "r",
  consultar: "r",
  actualizar: "u",
  modificar: "u",
  baja: "d",
  borrar: "d",
  suprimir: "d",
  // Siglas a verbos en español
  c: "crear",
  r: "ver",
  u: "editar",
  d: "eliminar"
};

/**
 * Comprueba si un usuario cuenta con privilegios de Super Administrador
 */
export function esSuperAdmin(user, perfil = null) {
  if (!user && !perfil) return false;

  const uid = perfil?.uid || user?.uid;
  const email = (perfil?.email || user?.email || "").toLowerCase().trim();

  if (uid === SUPER_UID || email === SUPER_EMAIL.toLowerCase()) {
    return true;
  }

  if (perfil) {
    return (
      perfil.is_superadmin === true ||
      perfil.rol_id === "superadmin" ||
      perfil.rol === "superadmin" ||
      perfil.rol === "Super Administrador"
    );
  }

  return false;
}

/**
 * Obtiene el usuario autenticado y su perfil sincronizado en Firestore
 */
export function obtenerPerfilActual() {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();

      if (!user) {
        if (!window.location.pathname.endsWith("index.html") && !window.location.pathname.endsWith("/")) {
          window.location.href = "./index.html";
        }
        return reject(new Error("Sesión no iniciada."));
      }

      const esRaiz = esSuperAdmin(user);

      try {
        const userRef = doc(db, "usuarios", user.uid);
        const snap = await getDoc(userRef);
        let perfil = null;

        if (snap.exists()) {
          perfil = { uid: user.uid, ...snap.data() };
        } else if (esRaiz) {
          // Perfil de rescate autónomo para el Super Administrador
          perfil = {
            uid: user.uid,
            email: user.email,
            nombre: "Jose Antonio Valladares Cid",
            rol: "Super Administrador",
            rol_id: "superadmin",
            is_superadmin: true,
            alcance: "global",
            proyectos_asignados: ["*"],
            activo: true,
            creadoEn: new Date().toISOString()
          };
        } else {
          alert("Acceso denegado: Tu colaborador no tiene ficha asignada en Firestore.");
          await auth.signOut();
          window.location.href = "./index.html";
          return reject(new Error("Usuario sin ficha en Firestore"));
        }

        // Verificación de estatus activo
        if (perfil.activo === false && !esRaiz) {
          alert("Tu cuenta se encuentra pausada o dada de baja.");
          await auth.signOut();
          window.location.href = "./index.html";
          return reject(new Error("Usuario inactivo"));
        }

        if (esRaiz) {
          perfil.is_superadmin = true;
          return resolve({ user, perfil });
        }

        // Cargar matriz de la colección 'roles' si el usuario solo tiene rol_id
        if (perfil.rol_id && !perfil.matriz && !perfil.matriz_efectiva) {
          try {
            const snapRol = await getDoc(doc(db, "roles", perfil.rol_id));
            if (snapRol.exists()) {
              perfil.matriz = snapRol.data().matriz || {};
            }
          } catch (errRol) {
            console.warn("Advertencia: No se pudo enlazar la matriz de roles:", errRol);
          }
        }

        resolve({ user, perfil });
      } catch (err) {
        console.error("Error crítico al obtener perfil RBAC:", err);
        reject(err);
      }
    });
  });
}

/**
 * Valida un permiso de forma tolerante a español y siglas CRUD
 */
export function tienePermiso(perfil, moduloId, accionRequerida = "ver") {
  if (!perfil) return false;
  if (esSuperAdmin(null, perfil)) return true;

  const matriz = perfil.matriz || perfil.matriz_efectiva;
  if (!matriz) return false;

  const configModulo = matriz[moduloId];
  if (!configModulo) return false;

  const accionOriginal = accionRequerida.toString().trim().toLowerCase();
  const accionEquivalente = DICCIONARIO_CANONICO[accionOriginal];

  // Evaluación de 4 vías
  return (
    configModulo[accionOriginal] === true ||
    (accionEquivalente && configModulo[accionEquivalente] === true) ||
    configModulo[accionRequerida] === true
  );
}

/**
 * Blindaje y protección de vista completa con control de bucle de redirección
 */
export async function protegerVista(moduloId, accionRequerida = "ver") {
  try {
    const { user, perfil } = await obtenerPerfilActual();

    // Bypass para Super Admin o comprobación de sesión general
    if (moduloId === "general" || esSuperAdmin(user, perfil)) {
      return { user, perfil };
    }

    if (!tienePermiso(perfil, moduloId, accionRequerida)) {
      alert(`Acceso Restringido: No tienes privilegios para '${accionRequerida}' en el módulo '${moduloId}'.`);
      if (!window.location.pathname.endsWith("control_obra.html")) {
        window.location.href = "./control_obra.html";
      }
      return Promise.reject(new Error("Permisos insuficientes"));
    }

    return { user, perfil };
  } catch (err) {
    if (!window.location.pathname.endsWith("index.html")) {
      window.location.href = "./index.html";
    }
    return Promise.reject(err);
  }
}

/**
 * Escucha reactiva a la colección de módulos del sistema
 */
export function escucharModulosSistema(callback) {
  return onSnapshot(collection(db, "modulos"), (snap) => {
    const modulos = [];
    snap.forEach((d) => {
      modulos.push({ id: d.id, ...d.data() });
    });
    callback(modulos);
  }, (err) => {
    console.warn("Fallo reactivo al consultar modulos:", err);
  });
}