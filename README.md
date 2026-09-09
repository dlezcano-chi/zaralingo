# Zaralingo · Backend real en Cloudflare Pages (persistencia + login seguro)

Esta versión sustituye el almacenamiento local del navegador por un backend real
usando **Cloudflare Pages Functions** + **Cloudflare KV**, para que:

- Los cambios que hagas en el panel de administrador se apliquen para **todos los alumnos**, en cualquier dispositivo.
- La contraseña de administrador **no viaje ni se guarde en el código del navegador**: la comprobación ocurre en el servidor.

## Qué se ha añadido

```
/functions
  /_shared/auth.js     ← firma y verifica el token de sesión del admin
  /api/login.js        ← POST /api/login  (usuario + contraseña → token)
  /api/content.js       ← GET /api/content (lectura pública)
                          POST /api/content (guardar, requiere token)
```

Cloudflare Pages detecta automáticamente la carpeta `/functions` y publica cada
archivo como una ruta de API (esto se conoce como *Pages Functions*), sin que
tengas que configurar nada de enrutado a mano.

`app.js` ahora, al cargar la página, pide el contenido a `/api/content`; si el
login es correcto, guarda un token de sesión (en `sessionStorage`, se borra al
cerrar la pestaña) y lo usa para autorizar los guardados en `/api/content`.

## Pasos de configuración en Cloudflare (una sola vez)

### 1. Crear el KV namespace
En el dashboard de Cloudflare: **Workers y Pages → KV → Crear un espacio de nombres**.
Ponle un nombre, por ejemplo `ZARALINGO_CONTENT`.

### 2. Enlazar el KV a tu proyecto Pages
Entra en tu proyecto Pages → **Settings → Functions → KV namespace bindings → Add binding**.
- **Variable name**: `ZARALINGO_KV` (tiene que llamarse exactamente así, es el nombre que usa el código).
- **KV namespace**: el que has creado en el paso 1.

Repite esto tanto para el entorno de **Production** como para **Preview** si usas ambos.

### 3. Configurar las variables de entorno (secretos)
En el mismo proyecto → **Settings → Environment variables**, añade estas tres, marcadas como *Secret* (no como texto plano), para Production (y Preview si lo usas):

| Variable | Valor |
|---|---|
| `ADMIN_USER` | `dani` (o el usuario que prefieras) |
| `ADMIN_PASS` | la contraseña que quieras usar |
| `ADMIN_SECRET` | una cadena aleatoria larga, solo la usa el servidor para firmar los tokens |

Para generar `ADMIN_SECRET` puedes usar, por ejemplo, este comando en una terminal (Mac/Linux, o Git Bash en Windows):
```
openssl rand -hex 32
```
o simplemente pegar cualquier frase larga y aleatoria — no hace falta recordarla, solo hace falta que sea difícil de adivinar y que no la compartas.

### 4. Volver a desplegar
Después de añadir el KV binding y las variables de entorno, tienes que hacer un
nuevo despliegue para que se apliquen (un simple *Retry deployment* desde el
dashboard, o subir cualquier cambio a GitHub, es suficiente).

### 5. Publicar el contenido inicial
La primera vez, `/api/content` estará vacío y la app seguirá funcionando con el
contenido incrustado en `app.js` (el banco de preguntas actual) como copia de
seguridad local. Para que ese contenido quede también guardado en el servidor
(y así lo vea todo el mundo y puedas empezar a editarlo desde cualquier
dispositivo):
1. Entra en `tu-url/#admin` con tus credenciales.
2. Pulsa **"Publicar contenido actual en el servidor"** en el panel principal.

A partir de ahí, cualquier edición, alta, baja o importación de JSON que hagas
en el panel se guarda directamente en Cloudflare KV y estará disponible para
todos los alumnos en cuanto recarguen la página.

## Qué mejora esto en seguridad

- La contraseña ya **no está en el código fuente** que ve el navegador: se
  compara en el servidor contra una variable de entorno.
- El acceso al panel se controla con un **token firmado** (HMAC-SHA256) que
  caduca a las 8 horas; sin el secreto del servidor (`ADMIN_SECRET`) no se
  puede falsificar un token válido.
- El endpoint de guardado (`POST /api/content`) rechaza cualquier petición sin
  un token válido, y valida que el JSON recibido tenga la forma esperada
  antes de guardarlo.

### Recomendaciones opcionales para reforzarlo aún más
- Activa una **regla de Rate Limiting** en Cloudflare para `/api/login`, para
  limitar los intentos de fuerza bruta contra la contraseña.
- Si en algún momento quieres una capa extra, puedes poner **Cloudflare
  Access** delante de `/#admin` (aunque con esto ya no haría falta el login
  propio de la app).
- Cambia `ADMIN_PASS` de vez en cuando, igual que harías con cualquier otra
  contraseña.

### Qué NO garantiza
Esto sigue siendo una autenticación sencilla de un único usuario, sin registro
de accesos ni recuperación de contraseña. Es apropiado para proteger un panel
de gestión de contenidos educativos frente a alumnos curiosos o visitantes
casuales; no lo trates como si protegiera datos sensibles o información
personal de terceros.

## Desarrollo local (opcional)
Si en algún momento quieres probar el backend en tu ordenador antes de subirlo,
puedes usar Wrangler (la CLI de Cloudflare):
```
npm install -g wrangler
wrangler pages dev . --kv ZARALINGO_KV
```
Wrangler te pedirá los mismos datos (KV namespace y variables de entorno) para
simular el entorno de producción localmente.

---

## Formato de cada sección (para el JSON del panel de administrador)

**Caracteres** — array de objetos:
```json
{"hanzi": "往", "pinyin": "wǎng"}
```

**Vocabulario** — array de objetos:
```json
{"hanzi": "足球", "pinyin": "zúqiú", "es": "fútbol", "frase_zh": "我喜欢踢足球。", "frase_es": "Me gusta jugar al fútbol.", "tokens": ["我", "喜欢", "踢", "足球", "。"]}
```

**Rellenar huecos** — array de objetos:
```json
{"target": "旁边", "frase_es": "La oficina de correos está al lado del banco.", "tokens": ["邮局", "在", "银行", "旁边", "。"], "distractores": ["前边", "后边", "中间"]}
```

**Gramática (ordenar palabras)** — array de objetos:
```json
{"es": "La biblioteca está al lado del banco.", "zh": "图书馆在银行的旁边。", "tokens": ["图书馆", "在", "银行", "的", "旁边", "。"]}
```

## Contenido incluido (banco de preguntas)

- Caracteres individuales: 84
- Vocabulario (pares para enlazar): 45
- Rellenar huecos: 37
- Ordenar palabras (gramática): 44

Variedad temática incluida: partículas **吧** y **过**, ubicaciones (前边/后边/左边/右边/中间), transporte (地铁站/火车站/飞机场/客运站), deportes (足球/网球/乒乓球/滑雪), tiempo y medidas (小时/左右/平方米), y más.
