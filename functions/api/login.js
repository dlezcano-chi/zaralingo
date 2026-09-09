import { createToken, json } from '../_shared/auth.js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { user, password } = body;

    const adminUser = env.ADMIN_USER;
    const adminPass = env.ADMIN_PASS;
    const adminSecret = env.ADMIN_SECRET;

    if (!adminUser || !adminPass || !adminSecret) {
      return json({ error: 'Configuración de servidor incompleta en Cloudflare.' }, 500);
    }

    if (user === adminUser && password === adminPass) {
      const token = await createToken(user, adminSecret);
      return json({ success: true, token });
    }

    return json({ error: 'Usuario o contraseña incorrectos.' }, 401);
  } catch (err) {
    return json({ error: 'Error interno en el servidor.' }, 500);
  }
}