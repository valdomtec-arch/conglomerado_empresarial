// js/rbac.js
import { auth, db, doc, getDoc, collection, onSnapshot, onAuthStateChanged } from "./firebase-config.js";

// Escucha reactiva de la colección de módulos dados de alta en el sistema
export function escucharModulosSistema(callback) {
  return onSnapshot(collection(db, "modulos"), (snap) => {
    const lista = [];
    snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
    callback(lista);
  });
}

// Obtiene el perfil de gobernanza del usuario
export async function obtenerPerfilUsuario(uid) {
  try {
    const snap = await getDoc(doc(db, "usuarios", uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("Error RBAC al obtener perfil:", err);
    return null;
  }
}

// Evalúa si tiene permiso para cualquier módulo (sea cual sea su nombre)
export function tienePermiso(perfil, moduloId, accion = "r", proyectoId = null) {
  if (!perfil || !perfil.activo) return false;
  if (perfil.is_superadmin === true || perfil.rol === "superadmin") return true;

  // Validación de alcance territorial / por proyecto
  if (proyectoId && perfil.alcance === "asignado") {
    if (!perfil.proyectos_asignados?.includes(proyectoId)) {
      return false;
    }
  }

  // Validación dinámica sobre la matriz guardada en Firestore
  return !!perfil.matriz_efectiva?.[moduloId]?.[accion];
}

// Guardia de seguridad para colocar al inicio de cualquier HTML
export function protegerVista(moduloId, accion = "r") {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "./index.html";
        return;
      }

      const perfil = await obtenerPerfilUsuario(user.uid);
      if (!perfil || !perfil.activo) {
        alert("Acceso denegado: Usuario inactivo o sin perfil.");
        window.location.href = "./index.html";
        return;
      }

      // Bypass Superadmin
      if (perfil.is_superadmin === true || perfil.rol === "superadmin") {
        resolve({ user, perfil });
        return;
      }

      // Comprobación de regla dinámica
      if (!tienePermiso(perfil, moduloId, accion)) {
        alert(`No tienes privilegios para el módulo: [${moduloId}]`);
        window.location.href = "./control_obra.html";
        return;
      }

      resolve({ user, perfil });
    });
  });
}

// Oculta botones o vistas que tengan data-rbac="c|u|d"
export function aplicarSeguridadUI(perfil, moduloActual) {
  if (!perfil || perfil.is_superadmin === true || perfil.rol === "superadmin") return;

  document.querySelectorAll("[data-rbac]").forEach((el) => {
    const accion = el.getAttribute("data-rbac");
    if (!tienePermiso(perfil, moduloActual, accion)) {
      el.style.display = "none";
    }
  });
}
