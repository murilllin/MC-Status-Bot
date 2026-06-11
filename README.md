# MC Status Bot

Bot de Discord que muestra en tiempo real el estado de un servidor Minecraft local expuesto a través de un túnel de [playit.gg](https://playit.gg). Los administradores pueden encender el servidor directamente desde Discord con un botón.

Desarrollado por [murilllin](https://github.com/murilllin).

---

## Funcionalidades

- Muestra si el servidor está abierto o cerrado en un canal de Discord
- Actualiza el estado automáticamente cada 60 segundos
- Muestra jugadores conectados, latencia y dirección del servidor
- Botón para encender el servidor disponible solo para administradores
- Edita un único mensaje fijo en lugar de enviar mensajes nuevos

---

## Requisitos

- [Node.js](https://nodejs.org) v18 o superior
- Un servidor de Minecraft Java en local con su `run.bat`
- Un túnel activo en [playit.gg](https://playit.gg)
- Un bot de Discord creado en el [portal de desarrolladores](https://discord.com/developers/applications)

---

## Instalación

**1. Clona el repositorio**

```bash
git clone https://github.com/murilllin/mc-status-bot.git
cd mc-status-bot
```

**2. Instala las dependencias**

```bash
npm install
```

**3. Configura las variables de entorno**

Copia el archivo de ejemplo y completa los valores:

```bash
cp .env.example .env
```

Edita `.env` con tus datos reales (ver sección de configuración abajo).

**4. Inicia el bot**

```bash
node index.js
```

---

## Configuración

| Variable | Descripcion |
|---|---|
| `DISCORD_TOKEN` | Token del bot obtenido en el portal de desarrolladores de Discord |
| `CHANNEL_ID` | ID del canal donde aparece el mensaje de estado |
| `ADMIN_ROLE_ID` | ID del rol de Discord que puede usar el botón de encender |
| `MC_HOST` | Dirección del túnel de playit.gg (ej: `algo.joinmc.link`) |
| `MC_PORT` | Puerto del túnel (por defecto `25565`) |
| `SERVER_BAT` | Ruta absoluta al `run.bat` del servidor Minecraft |

### Como obtener cada valor

**DISCORD_TOKEN**
1. Ve a [discord.com/developers/applications](https://discord.com/developers/applications)
2. Selecciona tu aplicación → sección **Bot**
3. Haz clic en **Reset Token** y copia el resultado

**CHANNEL_ID y ADMIN_ROLE_ID**
1. Activa el modo desarrollador en Discord: Ajustes → Avanzado → Modo desarrollador
2. Clic derecho en el canal → Copiar ID del canal
3. Ajustes del servidor → Roles → clic derecho en el rol → Copiar ID del rol

**MC_HOST y MC_PORT**
Se encuentran en el dashboard de playit.gg una vez que el túnel está activo.

---

## Invitar el bot al servidor de Discord

1. Ve a **OAuth2 → URL Generator** en el portal de desarrolladores
2. Marca el scope `bot`
3. Marca los permisos: `Send Messages`, `Read Message History`, `View Channels`
4. Copia la URL generada y ábrela en el navegador para invitar el bot

---

## Uso en producción

Para mantener el bot corriendo en segundo plano se recomienda usar [PM2](https://pm2.keymetrics.io):

```bash
npm install -g pm2
pm2 start index.js --name mc-status-bot
pm2 save
pm2 startup
```

---

## Notas importantes

- El bot debe correr en la misma PC donde está el servidor Minecraft, ya que ejecuta el `run.bat` localmente
- Si la PC se apaga, el botón de encender no funcionará hasta que el bot vuelva a estar activo

---

## Tecnologías utilizadas

- [discord.js](https://discord.js.org) v14
- [minecraft-server-util](https://www.npmjs.com/package/minecraft-server-util)
- [dotenv](https://www.npmjs.com/package/dotenv)
