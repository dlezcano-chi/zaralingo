// Helpers de autenticación para el panel de administrador de Zaralingo.
// El "token" es un JSON con fecha de caducidad, codificado en base64 y firmado
// con HMAC-SHA256 usando un secreto (ADMIN_SECRET) que solo conoce el servidor.
// Así el navegador nunca necesita saber la contraseña ni el secreto: solo
// guarda el token que el servidor le entrega tras un login correcto.

const SESSION_HOURS = 8; // el admin tiene que volver a entrar cada 8 horas

function bufferToBase64Url(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function stringToBase64Url(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToString(b64) {
  const b64Std = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64Std + '==='.slice((b64Std.length + 3) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

async function hmacSign(data, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return bufferToBase64Url(sig);
}

export async function createSessionToken(secret) {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000 });
  const payloadB64 = stringToBase64Url(payload);
  const sig = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export async function verifySessionToken(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return false;
  const expectedSig = await hmacSign(payloadB64, secret);
  // Comparación en tiempo constante para evitar timing attacks triviales.
  if (sig.length !== expectedSig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const payload = JSON.parse(base64UrlToString(payloadB64));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function getBearerToken(request) {
  const header = request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
