// js/rbac.js
import { auth, db, doc, getDoc, onAuthStateChanged, collection, onSnapshot } from "./firebase-config.js";

/**
 * Evalúa si un perfil tiene permiso para una acción específica en un módulo.
 * @param {Object} perfil - Objeto del usuario en Firestore.
 * @param {string} moduloId - Identificador del módulo (ej. 'checador', 'bitacora').
 * @param {string} accion - Acción CRUD ('c', 'r', 'u', 'd').
 * @returns {boolean}
 */
export function tienePermiso(perfil, moduloId, accion = "r") {
  if (!perfil) return false;
  
  // Super Admin tiene bypass total
  if (perfil.is_superadmin === true || perfil.rol_id === "superadmin" || perfil.email === "valladarescid@gmail.com") {
    return true;
  }

  // Comprobar matriz efectiva guardada en el usuario
  const permisosModulo = perfil.matriz_efectiva?.[moduloId];
  if (!permisosModulo) return false;

  return !!permisosModulo[accion.toLowerCase()];
}

/**
 * Resuelve la sesión activa y devuelve el usuario y su documento de perfil.
 * Si no hay sesión o el perfil no existe, redirige a index.html.
 */
export function obtenerPerfilActual() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "./index.html";
        return reject("Sin sesión activa");
      }

      try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userDocRef);

        let perfil = null;
        if (userSnap.exists()) {
          perfil = userSnap.data();
        } else if (user.email === "valladarescid@gmail.com") {
          // Perfil de emergencia para el Super Admin si no se ha sembrado
          perfil = {
            uid: user.uid,
            email: user.email,
            nombre: "Jose Antonio Valladares Cid",
            rol: "Super Administrador",
            rol_id: "superadmin",
            is_superadmin: true,
            alcance: "global",
            proyectos_asignados: ["*"],
            activo: true
          };
        } else {
          alert("Tu usuario no tiene un perfil configurado en la base de datos.");
          window.location.href = "./index.html";
          return reject("Usuario sin perfil en Firestore");
        }

        if (perfil.activo === false) {
          alert("Tu cuenta ha sido desactivada temporalmente por el administrador.");
          window.location.href = "./index.html";
          return reject("Usuario inactivo");
        }

        resolve({ user, perfil });
      } catch (err) {
        console.error("Error al obtener perfil RBAC:", err);
        reject(err);
      }
    });
  });
}

/**
 * Protege una vista asegurando que el usuario tenga el permiso necesario.
 * @param {string} moduloId - Identificador del módulo a validar.
 * @param {string} accion - Acción requerida ('c', 'r', 'u', 'd').
 */
export async function protegerVista(moduloId, accion = "r") {
  const { user, perfil } = await obtenerPerfilActual();

  // Si se solicita validación general, solo basta con tener sesión válida
  if (moduloId === "general") {
    return { user, perfil };
  }

  if (!tienePermiso(perfil, moduloId, accion)) {
    alert(`Acceso denegado: No cuentas con privilegios de lectura/escritura en el módulo "${moduloId}".`);
    window.location.href = "./control_obra.html";
    throw new Error(`Permiso insuficiente para ${moduloId}:${accion}`);
  }

  return { user, perfil };
}

/**
 * Escucha en tiempo real el catálogo de módulos activos en Firestore.
 * @param {Function} callback - Función que recibe la lista de módulos.
 */
export function escucharModulosSistema(callback) {
  return onSnapshot(collection(db, "modulos"), (snap) => {
    const modulos = [];
    snap.forEach((d) => {
      modulos.push({ id: d.id, ...d.data() });
    });
    callback(modulos);
  }, (err) => console.warn("Error al escuchar módulos:", err));
}
