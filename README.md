# Votación en Tiempo Real

App web para votar en vivo: un voto por dispositivo, restricción opcional por ubicación (geolocalización) y resultados que se actualizan solos.

## Qué incluye

- `/` — página pública de votación (los votantes entran aquí). Interfaz en inglés con opción de cambiar a francés (botones EN/FR arriba). Muestra un aviso de cookies: si el votante no acepta, no puede votar.
- `/display.html` — pantalla de resultados en vivo para proyectar en una pantalla grande (TV, proyector). Muestra fotos, ranking en tiempo real y resalta con una corona 👑 quién va ganando. No requiere aceptar cookies, es solo para ver.
- `/admin.html` — panel de administración (candidatos, foto, ubicación, abrir/cerrar votación, reiniciar votos, enlaces directos a `/` y `/display.html`). No tiene contraseña: solo compártelo contigo mismo.
- Un voto por dispositivo mediante cookie (no requiere registro).
- Restricción por ubicación: si configuras latitud, longitud y un radio en el panel admin, solo se podrá votar dentro de ese radio. Si lo dejas en 0 o vacío, cualquiera con el enlace puede votar.
- Resultados en tiempo real vía WebSockets (Socket.io), tanto en la página de votación como en la pantalla de resultados.

## Probar en tu computadora (opcional)

```
npm install
npm start
```

Abre `http://localhost:3000` para votar y `http://localhost:3000/admin.html` para administrar.

## Desplegar gratis en Render (recomendado)

1. Crea una cuenta en https://render.com (gratis, puedes entrar con GitHub o email).
2. Sube esta carpeta a un repositorio de GitHub:
   - Crea un repo nuevo en https://github.com/new
   - Sube todos los archivos de esta carpeta (`server.js`, `package.json`, `public/`, etc.)
3. En Render, click en **New +** → **Web Service** → conecta tu repositorio de GitHub.
4. Configuración del servicio:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Click en **Create Web Service** y espera a que termine el despliegue (2-3 minutos).
6. Render te da una URL pública como `https://tu-app.onrender.com`. Esa es la que compartes con el público para votar.
7. Entra a `https://tu-app.onrender.com/admin.html` para:
   - Agregar los candidatos antes del evento.
   - (Opcional) Configurar latitud/longitud/radio del lugar del evento. El botón "Usar mi ubicación actual" llena esos campos automáticamente si abres el panel desde el lugar del evento.
   - Verificar que "Votación abierta" esté activado cuando quieras que empiece.

### Nota importante sobre el plan gratuito de Render

En el plan free, el servicio "duerme" tras ~15 minutos sin uso y tarda unos segundos en despertar con la primera visita. Para el día del evento, entra tú primero unos minutos antes para "despertarlo" antes de compartir el enlace. Además, los datos (votos y candidatos) se guardan en un archivo en el servidor; en el plan free ese archivo se reinicia si el servicio se redepliega, así que evita hacer cambios de código el mismo día del evento después de cargar los candidatos.

## Alternativas de hosting

Railway.app y Fly.io también soportan Node + WebSockets de forma similar a Render, con pasos casi idénticos (conectar repo de GitHub, build `npm install`, start `npm start`).

## Cómo funciona la restricción por ubicación

Cuando el radio es mayor a 0, el navegador del votante pide permiso de ubicación (GPS/WiFi) al momento de votar. El servidor calcula la distancia real (fórmula de Haversine) entre esa ubicación y el punto configurado. Si el votante está fuera del radio, el voto se rechaza con un mensaje claro. Si el votante no da permiso de ubicación, tampoco puede votar.

## Cómo funciona el voto único

Al entrar por primera vez, el servidor asigna una cookie única e invisible al navegador del votante. Esa cookie se guarda en la base de datos al votar, y cualquier intento posterior de votar desde el mismo navegador se bloquea. Esto es suficiente para eventos informales; alguien muy insistente podría intentar votar dos veces usando otro navegador o modo incógnito, pero cubre el caso normal de uso.
