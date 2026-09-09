import { createToken } from '../_shared/auth.js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { user, password } = body;

    // Lee las variables de entorno de Cloudflare
    const adminUser = env.ADMIN_USER;
    const adminPass = env.ADMIN_PASS;
    const adminSecret = env.ADMIN_SECRET;

    if (!adminUser || !adminPass || !adminSecret) {
      return new Response(
        JSON.stringify({ error: 'Configuración de servidor incompleta.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (user === adminUser && password === adminPass) {
      const token = await createToken(user, adminSecret);
      return new Response(
        JSON.stringify({ success: true, token }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Usuario o contraseña incorrectos.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Error interno en el servidor.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}