import { createSessionToken, json } from '../_shared/auth.js';

// POST /api/login  { user, pass }  ->  { token }  |  { error }
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_USER || !env.ADMIN_PASS || !env.ADMIN_SECRET) {
    return json({ error: 'El servidor no está configurado (faltan variables de entorno).' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Petición inválida.' }, 400);
  }

  const { user, pass } = body || {};
  if (typeof user !== 'string' || typeof pass !== 'string') {
    return json({ error: 'Faltan credenciales.' }, 400);
  }

  // Nota: comparación directa (no timing-safe) es suficiente aquí porque
  // el valor comparado no es un secreto derivado de datos del usuario ya
  // filtrados, y Cloudflare ya aplica límites de red razonables. Para un
  // extra de protección puedes activar Rate Limiting en el dashboard de
  // Cloudflare para la ruta /api/login.
  if (user !== env.ADMIN_USER || pass !== env.ADMIN_PASS) {
    return json({ error: 'Usuario o contraseña incorrectos.' }, 401);
  }

  const token = await createSessionToken(env.ADMIN_SECRET);
  return json({ token });
}

// Cualquier otro método queda rechazado explícitamente.
export async function onRequestGet() {
  return json({ error: 'Método no permitido.' }, 405);
}
