// MC Status Bot
// Muestra el estado del servidor Minecraft en Discord y permite
// a los administradores encenderlo con un boton.
//
// Autor: murilllin - github.com/murilllin

require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { status } = require('minecraft-server-util');
const { spawn } = require('child_process');
const path = require('path');

// Configuracion desde variables de entorno
const MC_HOST       = process.env.MC_HOST;
const MC_PORT       = parseInt(process.env.MC_PORT) || 25565;
const CHANNEL_ID    = process.env.CHANNEL_ID;
const SERVER_BAT    = process.env.SERVER_BAT;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

// Intervalo de verificacion del servidor en milisegundos (60 segundos)
const CHECK_INTERVAL = 60_000;

// Estado interno del bot

// ID del mensaje de estado en Discord (para editarlo en vez de crear uno nuevo)
let statusMessageId = null;

// Referencia al proceso del servidor Minecraft si fue iniciado por el bot
let serverProcess = null;

// Indica si el servidor esta en proceso de arranque
let isStarting = false;

// Cliente de Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Consulta el estado del servidor Minecraft via protocolo nativo
// Retorna un objeto con online:true y datos del servidor,
// o online:false si no responde en el tiempo limite.
async function checkServer() {
  try {
    const result = await status(MC_HOST, MC_PORT, { timeout: 5000 });
    return {
      online:     true,
      players:    result.players.online,
      maxPlayers: result.players.max,
      motd:       result.motd?.clean || 'Servidor Minecraft',
      latency:    result.roundTripLatency,
    };
  } catch {
    return { online: false };
  }
}

// Construye el embed de Discord segun el estado del servidor
function buildEmbed(info) {
  const now = new Date().toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
  });

  // Estado: iniciando (el bat fue ejecutado pero el servidor aun no responde)
  if (isStarting) {
    return new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle('Iniciando servidor...')
      .setDescription('El servidor esta arrancando, espera un momento.')
      .setFooter({ text: `Ultima verificacion: ${now}` });
  }

  // Estado: en linea
  if (info.online) {
    return new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Servidor abierto')
      .setDescription(`**${info.motd}**`)
      .addFields(
        { name: 'Jugadores',  value: `${info.players} / ${info.maxPlayers}`, inline: true },
        { name: 'Latencia',   value: `${info.latency} ms`,                   inline: true },
        { name: 'Direccion',  value: `\`${MC_HOST}:${MC_PORT}\``,            inline: true },
      )
      .setFooter({ text: `Ultima verificacion: ${now}` });
  }

  // Estado: fuera de linea
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle('Servidor cerrado')
    .setDescription('El servidor no esta disponible en este momento.')
    .addFields(
      { name: 'Direccion', value: `\`${MC_HOST}:${MC_PORT}\``, inline: true },
    )
    .setFooter({ text: `Ultima verificacion: ${now}` });
}

// Construye la fila de botones para el mensaje de estado
// El boton se deshabilita si el servidor ya esta en linea
// o si esta en proceso de arranque.
function buildButton(serverOnline) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('start_server')
      .setLabel(isStarting ? 'Iniciando...' : 'Encender servidor')
      .setStyle(ButtonStyle.Success)
      .setDisabled(serverOnline || isStarting),
  );
}

// Actualiza (o crea) el mensaje de estado en el canal de Discord
async function updateStatus() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel) return;

  const info  = await checkServer();
  const embed = buildEmbed(info);
  const row   = buildButton(info.online);

  try {
    if (statusMessageId) {
      // Edita el mensaje existente para no llenar el canal de mensajes nuevos
      const msg = await channel.messages.fetch(statusMessageId);
      await msg.edit({ embeds: [embed], components: [row] });
    } else {
      // Primera ejecucion: crea el mensaje y guarda su ID
      const msg = await channel.send({ embeds: [embed], components: [row] });
      statusMessageId = msg.id;
    }
  } catch {
    // El mensaje fue borrado manualmente: crea uno nuevo
    const msg = await channel.send({ embeds: [embed], components: [row] });
    statusMessageId = msg.id;
  }

  // Si estabamos esperando el arranque y ya esta en linea, limpiamos el flag
  if (isStarting && info.online) {
    isStarting = false;
  }
}

// Ejecuta el run.bat del servidor Minecraft como proceso hijo
function startMinecraftServer() {
  // Evita lanzar el servidor si ya hay un proceso activo
  if (serverProcess) return;

  const batDir  = path.dirname(SERVER_BAT);
  const batFile = path.basename(SERVER_BAT);

  serverProcess = spawn('cmd.exe', ['/c', batFile], {
    cwd:      batDir,
    detached: false,
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[MC] ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[MC ERR] ${data}`);
  });

  // Cuando el servidor se cierra, limpiamos el proceso y actualizamos Discord
  serverProcess.on('close', (code) => {
    console.log(`Servidor cerrado con codigo de salida ${code}`);
    serverProcess = null;
    isStarting    = false;
    updateStatus();
  });
}

// Manejo de interacciones (clic en botones)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'start_server') return;

  // Verificacion de permisos: solo miembros con el rol admin pueden encenderlo
  const hasRole = interaction.member.roles.cache.has(ADMIN_ROLE_ID);

  if (!hasRole) {
    await interaction.reply({
      content:   'No tienes permiso para encender el servidor.',
      ephemeral: true,
    });
    return;
  }

  if (isStarting) {
    await interaction.reply({
      content:   'El servidor ya esta iniciando, espera un momento.',
      ephemeral: true,
    });
    return;
  }

  // Inicia el servidor y notifica al admin
  isStarting = true;

  await interaction.reply({
    content:   'Encendiendo el servidor... puede tardar hasta 1 minuto.',
    ephemeral: true,
  });

  startMinecraftServer();
  updateStatus(); // cambia el embed a "Iniciando..."

  // Verifica cada 15 segundos si el servidor ya esta en linea (maximo 3 minutos)
  let attempts = 0;

  const waitInterval = setInterval(async () => {
    attempts++;
    const info = await checkServer();

    if (info.online) {
      // Servidor en linea: detiene la espera y actualiza Discord
      isStarting = false;
      clearInterval(waitInterval);
      updateStatus();
    } else if (attempts >= 12) {
      // Tiempo de espera agotado (12 * 15s = 180s)
      isStarting = false;
      clearInterval(waitInterval);
      updateStatus();
    }
  }, 15_000);
});

// Evento de inicio del bot
client.once('clientReady', () => {
  console.log(`Bot conectado como ${client.user.tag}`);
  updateStatus();
  setInterval(updateStatus, CHECK_INTERVAL);
});

client.login(process.env.DISCORD_TOKEN);
