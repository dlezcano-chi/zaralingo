import { json, getBearerToken, verifySessionToken } from '../../_shared/auth.js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const token = getBearerToken(request);

    // Validar token de sesión del alumno
    const isValid = await verifySessionToken(token, env.ADMIN_SECRET);
    if (!isValid) {
      return json({ error: 'Sesión no válida o expirada' }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const { userId, lessonId, score, totalQuestions, coinsEarned } = body;

    if (!userId || !lessonId || score === undefined || !totalQuestions) {
      return json({ error: 'Datos de la partida incompletos' }, 400);
    }

    // 1. Guardar el intento de la lección en la tabla user_progress
    await env.DB.prepare(
      'INSERT INTO user_progress (user_id, lesson_id, score, total_questions) VALUES (?, ?, ?, ?)'
    ).bind(userId, lessonId, score, totalQuestions).run();

    // 2. Sumar las monedas ganadas en esta partida al perfil del alumno
    if (coinsEarned && coinsEarned > 0) {
      await env.DB.prepare(
        'UPDATE users SET coins = coins + ? WHERE id = ?'
      ).bind(coinsEarned, userId).run();
    }

    // 3. Obtener el total actualizado de monedas
    const updatedUser = await env.DB.prepare(
      'SELECT coins FROM users WHERE id = ?'
    ).bind(userId).first();

    return json({ 
      success: true, 
      message: 'Partida registrada con éxito',
      newCoins: updatedUser ? updatedUser.coins : 0 
    });

  } catch (err) {
    return json({ error: 'Error al registrar el progreso' }, 500);
  }
}