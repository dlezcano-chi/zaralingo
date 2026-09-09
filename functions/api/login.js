import { createToken, json } from '../_shared/auth.js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json().catch(() => ({}));
    
    // Admite tanto 'user'/'password' como 'username'/'pass' por si app.js los manda así
    const inputUser = (body.user || body.username || '').toString().trim();
    const inputPass = (body.password || body.pass || '').toString().trim();

    // Obtener variables de entorno
    const adminUser = (env.ADMIN_USER || '').toString().trim();
    const adminPass = (env.ADMIN_PASS || '').toString().trim();
    const adminSecret = env.ADMIN_SECRET;

    // Validación de variables en el servidor
    if (!adminUser || !adminPass || !adminSecret) {
      return json({ 
        error: 'Las variables ADMIN_USER, ADMIN_PASS o ADMIN_SECRET no están definidas en Cloudflare.' 
      }, 500);
    }

    // Comprobación de credenciales
    if (inputUser === adminUser && inputPass === adminPass) {
      const token = await createToken(inputUser, adminSecret);
      return json({ success: true, token });
    }

    // Si falla, devuelve un mensaje claro para diagnóstico
    return json({ 
      error: 'Credenciales no coinciden con las variables de Cloudflare.',
      receivedUser: inputUser 
    }, 401);

  } catch (err) {
    return json({ error: 'Error interno en el servidor de autenticación.' }, 500);
  }
}