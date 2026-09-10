import { json, createToken } from '../../_shared/auth.js';

// Función para encriptar contraseñas usando la Web Crypto API nativa
async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json().catch(() => ({}));
    const { action, username, password } = body;

    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      return json({ error: 'Usuario y contraseña requeridos' }, 400);
    }

    const passHash = await hashPassword(cleanPass);

    // REGISTRO DE ALUMNO
    if (action === 'register') {
      try {
        const result = await env.DB.prepare(
          'INSERT INTO users (username, password_hash, coins) VALUES (?, ?, 10)'
        ).bind(cleanUser, passHash).run();

        const token = await createToken(cleanUser, env.ADMIN_SECRET);
        return json({ success: true, token, username: cleanUser, coins: 10 });
      } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
          return json({ error: 'El nombre de usuario ya está registrado' }, 400);
        }
        return json({ error: 'Error al registrar el alumno' }, 500);
      }
    }

    // LOGIN DE ALUMNO
    if (action === 'login') {
      const user = await env.DB.prepare(
        'SELECT id, username, coins FROM users WHERE username = ? AND password_hash = ?'
      ).bind(cleanUser, passHash).first();

      if (!user) {
        return json({ error: 'Usuario o contraseña incorrectos' }, 401);
      }

      const token = await createToken(cleanUser, env.ADMIN_SECRET);
      return json({ 
        success: true, 
        token, 
        userId: user.id, 
        username: user.username, 
        coins: user.coins 
      });
    }

    return json({ error: 'Acción no válida' }, 400);

  } catch (err) {
    return json({ error: 'Error interno de servidor' }, 500);
  }
}