import { verifySessionToken, getBearerToken, json } from '../_shared/auth.js';

const KV_KEY = 'zaralingo_content';
// Límite generoso pero no infinito, para evitar que una subida de JSON
// mal formada o maliciosa haga crecer la clave de KV sin control.
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

// GET /api/content -> el contenido guardado en KV, o {} si aún no hay nada.
// Es una lectura pública (los alumnos necesitan poder cargar la app),
// no requiere token.
export async function onRequestGet({ env }) {
  if (!env.ZARALINGO_KV) {
    return json({ error: 'El servidor no está configurado (falta el KV namespace).' }, 500);
  }
  const data = await env.ZARALINGO_KV.get(KV_KEY);
  if (!data) return json({});
  return new Response(data, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

// POST /api/content  (Authorization: Bearer <token>)  body: el JSON completo de contenido
export async function onRequestPost({ request, env }) {
  if (!env.ZARALINGO_KV || !env.ADMIN_SECRET) {
    return json({ error: 'El servidor no está configurado.' }, 500);
  }

  const token = getBearerToken(request);
  const valid = await verifySessionToken(token, env.ADMIN_SECRET);
  if (!valid) return json({ error: 'No autorizado. Vuelve a iniciar sesión.' }, 401);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: 'El contenido enviado es demasiado grande.' }, 413);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: 'JSON inválido.' }, 400);
  }
  if (!parsed || !Array.isArray(parsed.temas)) {
    return json({ error: 'El JSON debe tener la forma {"temas": [...]}.' }, 400);
  }

  await env.ZARALINGO_KV.put(KV_KEY, JSON.stringify(parsed));
  return json({ ok: true });
}
