// js/rbac.js
import { auth, db, doc, getDoc, collection, onSnapshot, onAuthStateChanged } from "./firebase-config.js";

// Correo raíz intocable
export const ROOT_ADMIN = "valladarescid@gmail.com";

// Escucha reactiva de módulos en Firestore
export function escucharModulosSistema(callback) {
  return onSnapshot(collection(db, "modulos"), (snap) => {
    const lista = [];
    snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
    callback(lista);
  }, (err) => {
    console.warn("Aviso en modulos:", err.message);
    callback([]);
  });
}

// Obtener perfil
export async function obtenerPerfilUsuario(uid, userEmail = "") {
  // BYPASS MAESTRO: Si es tu correo, genera el perfil en memoria sin esperar a Firestore
  if (userEmail && userEmail.toLowerCase() === ROOT_ADMIN.toLowerCase()) {
    return {
      uid: uid,
      email: userEmail,
      nombre: "Jose Antonio Valladares Cid",
      rol: "superadmin",
      rol_id: "superadmin",
      is_superadmin: true,
      alcance: "global",
      proyectos_asignados: ["*"],
      activo: true
    };
  }

  try {
    const snap = await getDoc(doc(db, "usuarios", uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn("Error RBAC al consultar Firestore:", err.message);
    return null;
  }
}

// Validación de permisos
export function tienePermiso(perfil, moduloId, accion = "r", proyectoId = null) {
  if (!perfil) return false;
  if (perfil.email?.toLowerCase() === ROOT_ADMIN.toLowerCase()) return true;
  if (!perfil.activo) return false;
  if (perfil.is_superadmin === true || perfil.rol === "superadmin") return true;

  if (proyectoId && perfil.alcance === "asignado") {
    if (!perfil.proyectos_asignados?.includes(proyectoId)) return false;
  }

  return !!perfil.matriz_efectiva?.[moduloId]?.[accion];
}

// Guardia de seguridad
export function protegerVista(moduloId, accion = "r") {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "./index.html";
        return;
      }

      // Si es el correo maestro, se salta cualquier bloqueo de BD
      if (user.email.toLowerCase() === ROOT_ADMIN.toLowerCase()) {
        const superPerfil = await obtenerPerfilUsuario(user.uid, user.email);
        resolve({ user, perfil: superPerfil });
        return;
      }

      const perfil = await obtenerPerfilUsuario(user.uid, user.email);
      if (!perfil || !perfil.activo) {
        alert("Usuario inactivo o sin perfil.");
        window.location.href = "./index.html";
        return;
      }

      if (perfil.is_superadmin === true || perfil.rol === "superadmin") {
        resolve({ user, perfil });
        return;
      }

      if (!tienePermiso(perfil, moduloId, accion)) {
        alert(`Sin privilegios para el módulo: [${moduloId}]`);
        window.location.href = "./control_obra.html";
        return;
      }

      resolve({ user, perfil });
    });
  });
}

export function aplicarSeguridadUI(perfil, moduloActual) {
  if (!perfil) return;
  if (perfil.email?.toLowerCase() === ROOT_ADMIN.toLowerCase()) return;
  if (perfil.is_superadmin === true || perfil.rol === "superadmin") return;

  document.querySelectorAll("[data-rbac]").forEach((el) => {
    const accion = el.getAttribute("data-rbac");
    if (!tienePermiso(perfil, moduloActual, accion)) {
      el.style.display = "none";
    }
  });
}
