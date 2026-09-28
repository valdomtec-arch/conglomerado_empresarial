// js/rbac.js
import { auth, db, doc, getDoc, onSnapshot, collection } from "./firebase-config.js";

/**
 * Mapeo integral para resolver equivalencias en español y claves internas.
 */
const DICCIONARIO_ACCIONES = {
  // Crear / Registrar
  c: "c", crear: "c", registrar: "c", alta: "c",
  // Ver / Consultar
  r: "r", leer: "r", ver: "r", consultar: "r",
  // Editar / Modificar
  u: "u", actualizar: "u", editar: "u", modificar: "u",
  // Eliminar / Suprimir
  d: "d", eliminar: "d", suprimir: "d", borrar: "d", baja: "d"
};

/**
 * Normaliza cualquier entrada de acción a su representación canónica.
 */
function normalizarAccion(accion) {
  if (!accion) return "r";
  const str = accion.toString().trim().toLowerCase();
  return DICCIONARIO_ACCIONES[str] || str;
}

/**
 * Valida si un perfil cuenta con la autorización requerida para un módulo.
 */
export function tienePermiso(perfil, moduloId, accionRequerida = "r") {
  if (!perfil) return false;

  // 1. Bypass total para Super Administradores
  const esSuperAdmin = perfil.is_superadmin === true || 
                       perfil.rol_id === "superadmin" || 
                       perfil.rol === "superadmin" ||
                       perfil.uid === "zeVjo7RcQqRKjq1T7goO22SMHip1" ||
                       (perfil.email && perfil.email.toLowerCase() === "valladarescid@gmail.com");

  if (esSuperAdmin) return true;

  // 2. Normalizar acción
  const accionClave = normalizarAccion(accionRequerida);

  // 3. Buscar en matriz (como está en tu Firestore) o matriz_efectiva por compatibilidad
  const permisosModulo = perfil.matriz?.[moduloId] || perfil.matriz_efectiva?.[moduloId];
  if (!permisosModulo) return false;

  return !!(permisosModulo[accionClave] || permisosModulo[accionRequerida]);
}

/**
 * Obtiene el usuario autenticado y su perfil en Firestore.
 */
export function obtenerPerfilActual() {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = "./index.html";
        return reject("No autenticado");
      }

      try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        let perfil = null;

        if (snap.exists()) {
          perfil = { uid: user.uid, ...snap.data() };
        } else if (user.email.toLowerCase() === "valladarescid@gmail.com" || user.uid === "zeVjo7RcQqRKjq1T7goO22SMHip1") {
          // Perfil de rescate para el Super Administrador raíz
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
          alert("Tu usuario no cuenta con un perfil asignado en la base de datos.");
          window.location.href = "./index.html";
          return reject("Perfil no encontrado en Firestore");
        }

        if (perfil.activo === false) {
          alert("Tu cuenta se encuentra inactiva. Contacta al administrador.");
          window.location.href = "./index.html";
          return reject("Usuario inactivo");
        }

        // Si el usuario no tiene matriz cargada pero tiene rol_id, traerla de la colección 'roles'
        if (!perfil.is_superadmin && perfil.rol_id && !perfil.matriz && !perfil.matriz_efectiva) {
          try {
            const snapRol = await getDoc(doc(db, "roles", perfil.rol_id));
            if (snapRol.exists()) {
              perfil.matriz = snapRol.data().matriz || {};
            }
          } catch (e) {
            console.warn("No se pudo cargar la matriz del rol:", e);
          }
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
 * Protege vistas completas redirigiendo si no cumple con la regla RBAC.
 */
export async function protegerVista(moduloId, accionRequerida = "r") {
  try {
    const { user, perfil } = await obtenerPerfilActual();

    // Bypass de sesión general
    if (moduloId === "general") {
      return { user, perfil };
    }

    if (!tienePermiso(perfil, moduloId, accionRequerida)) {
      alert(`Acceso denegado: No cuentas con privilegios para consultar o modificar el módulo "${moduloId}".`);
      window.location.href = "./control_obra.html";
      return Promise.reject("Sin permisos suficientes");
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
  }, (err) => console.warn("Error al escuchar módulos:", err));
}