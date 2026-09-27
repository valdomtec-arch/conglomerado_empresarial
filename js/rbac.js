// js/rbac.js
import { auth, db, doc, getDoc, onSnapshot, collection } from "./firebase-config.js";

/**
 * Normaliza las acciones operativas a español.
 */
function normalizarAccion(accion) {
  const mapa = {
    c: 'crear',
    r: 'ver',
    u: 'editar',
    d: 'eliminar',
    crear: 'crear',
    ver: 'ver',
    editar: 'editar',
    eliminar: 'eliminar'
  };
  return mapa[accion] || accion;
}

/**
 * Valida si un perfil cuenta con la autorización requerida.
 */
export function tienePermiso(perfil, moduloId, accionRequerida) {
  if (!perfil) return false;
  if (perfil.is_superadmin) return true;

  const accion = normalizarAccion(accionRequerida);
  const permisosModulo = perfil.matriz_efectiva?.[moduloId];
  
  if (!permisosModulo) return false;
  return !!(permisosModulo[accion] || permisosModulo[accionRequerida]);
}

/**
 * Obtiene el perfil del usuario autenticado desde Firestore.
 */
export function obtenerPerfilActual() {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        return reject("No autenticado");
      }
      try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (!snap.exists()) {
          return reject("Perfil no encontrado en Firestore");
        }
        const perfil = snap.data();
        if (perfil.activo === false) {
          return reject("Usuario inactivo");
        }
        resolve({ user, perfil });
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Protege vistas completas redirigiendo si no cumple con la regla RBAC.
 */
export async function protegerVista(moduloId, accionRequerida = "ver") {
  try {
    const { user, perfil } = await obtenerPerfilActual();
    if (!tienePermiso(perfil, moduloId, accionRequerida)) {
      alert("Acceso denegado: No cuentas con privilegios para " + accionRequerida + " en " + moduloId);
      window.location.href = "./control_obra.html";
      return Promise.reject("Sin permisos");
    }
    return { user, perfil };
  } catch (err) {
    window.location.href = "./index.html";
    return Promise.reject(err);
  }
}

/**
 * Escucha reactivamente los módulos activos registrados en el sistema.
 */
export function escucharModulosSistema(callback) {
  return onSnapshot(collection(db, "modulos"), (snap) => {
    const modulos = [];
    snap.forEach((d) => modulos.push({ id: d.id, ...d.data() }));
    callback(modulos);
  });
}
