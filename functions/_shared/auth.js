// Genera un token firmado HMAC-SHA256
export async function createToken(username, secret) {
  const encoder = new TextEncoder();
  const payload = JSON.stringify({
    sub: username,
    exp: Date.now() + 8 * 60 * 60 * 1000 // Expira en 8 horas
  });

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const b64Payload = btoa(payload);
  const b64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${b64Payload}.${b64Signature}`;
}

// Verifica el token firmado
export async function verifyToken(token, secret) {
  if (!token || !token.includes('.')) return false;

  try {
    const [b64Payload, b64Signature] = token.split('.');
    const payloadText = atob(b64Payload);
    const payload = JSON.parse(payloadText);

    if (Date.now() > payload.exp) return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = Uint8Array.from(atob(b64Signature), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(payloadText));
  } catch (err) {
    return false;
  }
}