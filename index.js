import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ====== CESTA K SOUBORU S ID ZPRÁV ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, 'calendar.json');

// ====== ENV PROMĚNNÉ ======
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN) {
  throw new Error('Chybí DISCORD_TOKEN v env proměnných.');
}
if (!CLIENT_ID || !GUILD_ID) {
  console.warn(
    '⚠️ CLIENT_ID nebo GUILD_ID chybí – slash command /setup se nemusí zaregistrovat.'
  );
}

// ====== ADVENTNÍ DATA ======
// TADY si doplň 24 dní – ukázka pro den 1 a 2:
const YEAR = new Date().getFullYear();

const ROUTES = [
  {
    day: 1,
    mapUrl: 'https://example.com/mapa-den-1', // odkaz na mapu (třeba Imgur/TruckersMP map)
    teaserImage: 'https://example.com/den1-teaser.png',   // otazník
    activeImage: 'https://example.com/den1-aktivni.png',  // detail karty
    expiredImage: 'https://example.com/den1-expired.png', // po termínu
    from: 'TruckersMP HQ',
    to: 'Brno',
    distance: '500 km',
  },
  {
    day: 2,
    mapUrl: 'https://example.com/mapa-den-2',
    teaserImage: 'https://example.com/den2-teaser.png',
    activeImage: 'https://example.com/den2-aktivni.png',
    expiredImage: 'https://example.com/den2-expired.png',
    from: 'Praha',
    to: 'Berlin',
    distance: '650 km',
  },
  // → ZKOPÍRUJ A UPRAV PRO DNY 3–24
];

// 10:00 CET = 09:00 UTC (Railway běží v UTC)
function getWindow(day) {
  const start = Date.UTC(YEAR, 11, day, 9, 0, 0);      // 1.12. = month 11
  const end = Date.UTC(YEAR, 11, day + 1, 9, 0, 0);    // další den 09:00 UTC
  return { start, end };
}

// phase = 'TEASER' | 'ACTIVE' | 'EXPIRED'
function getPhaseForRoute(route, nowMs) {
  const { start, end } = getWindow(route.day);

  if (nowMs < start) return 'TEASER';
  if (nowMs >= start && nowMs < end) return 'ACTIVE';
  return 'EXPIRED';
}

// Hezký embed podle dne a fáze
function buildEmbed(route, phase) {
  const { start, end } = getWindow(route.day);
  const startDate = new Date(start);
  const endDate = new Date(end);

  // prostý čas: 1.12. 10:00 – 2.12. 10:00 (Praha)
  const timeText = `${startDate.getUTCDate()}.12. ${String(
    startDate.getUTCHours() + 1
  ).padStart(2, '0')}:00 – ${endDate.getUTCDate()}.12. ${String(
    endDate.getUTCHours() + 1
  ).padStart(2, '0')}:00`;

  let description = '';
  let imageUrl = '';
  let color = 0xffc04d; // zlatá

  if (phase === 'TEASER') {
    description =
      `🔒 Adventní trasa **#${route.day}** je zatím skrytá.\n` +
      `Odemkne se v čase **${timeText}**.\n\n` +
      `Připrav se – za odjetí získáš TICKET do tomboly! 🎟️`;
    imageUrl = route.teaserImage;
    color = 0xffc04d;
  } else if (phase === 'ACTIVE') {
    description =
      `🟢 **Trasa je právě AKTIVNÍ!**\n\n` +
      `**Start:** ${route.from}\n` +
      `**Cíl:** ${route.to}\n` +
      `**Délka:** ${route.distance}\n` +
      `**Čas:** ${timeText}\n\n` +
      `Použij tlačítko níže a otevři si mapu trasy 👇`;
    imageUrl = route.activeImage;
    color = 0x4caf50; // zelená
  } else if (phase === 'EXPIRED') {
    description =
      `⛔ Adventní trasa **#${route.day}** už skončila.\n` +
      `Sleduj další okénka, ať ti nic neuteče!`;
    imageUrl = route.expiredImage;
    color = 0xaa0000; // tmavě červená
  }

  const embed = {
    title: `🎄 Adventní trasa #${route.day}`,
    description,
    url: route.mapUrl || null,
    color,
    footer: {
      text: `Merry Christmas from LTR • Den ${route.day}`,
    },
  };

  if (imageUrl) {
    embed.image = { url: imageUrl };
  }

  return embed;
}

// URL tlačítko na mapu trasy
function buildComponents(route) {
  if (!route.mapUrl) return [];

  const button = new ButtonBuilder()
    .setLabel('Klikni pro mapu trasy')
    .setStyle(ButtonStyle.Link)
    .setURL(route.mapUrl);

  const row = new ActionRowBuilder().addComponents(button);
  return [row];
}

// ====== PRÁCE S calendar.json ======
// Struktura: { messages: [ { day, channelId, messageId }, ... ] }

function loadCalendarConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.messages || !Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch (err) {
    console.error('Chyba při čtení calendar.json:', err);
    return null;
  }
}

function saveCalendarConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    console.log('calendar.json uložen.');
  } catch (err) {
    console.error('Chyba při zápisu calendar.json:', err);
  }
}

// ====== DISCORD BOT ======
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Vytvoří 24 adventních okének v tomto kanálu.'),
].map((c) => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
  if (!CLIENT_ID || !GUILD_ID) {
    console.warn(
      'Přeskakuji registraci příkazů – chybí CLIENT_ID nebo GUILD_ID.'
    );
    return;
  }

  try {
    console.log('Registruji slash commandy...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('Slash commandy zaregistrovány ✅');
  } catch (err) {
    console.error('Chyba při registraci commandů:', err);
  }
}

let calendarConfig = loadCalendarConfig();
// Mapování: day → lastKey (např. "1-ACTIVE")
const lastKeys = {};
// Cache kanálů a zpráv, ať to nemusíme furt fetchovat
const channelCache = new Map();

// ====== AUTO-UPDATE VŠECH OKÉNEK ======
async function updateAllWindows() {
  if (!calendarConfig || !calendarConfig.messages) return;
  const now = new Date();
  const nowMs = now.getTime();

  for (const entry of calendarConfig.messages) {
    const route = ROUTES.find((r) => r.day === entry.day);
    if (!route) continue;

    const phase = getPhaseForRoute(route, nowMs);
    const key = `${route.day}-${phase}`;
    if (lastKeys[route.day] === key) {
      continue; // nic nového pro tenhle den
    }

    // najdeme kanál (z cache nebo fetch)
    let channel = channelCache.get(entry.channelId);
    if (!channel) {
      try {
        channel = await client.channels.fetch(entry.channelId);
        if (!channel || !channel.isTextBased()) {
          console.warn('Kanál není textový nebo neexistuje:', entry.channelId);
          continue;
        }
        channelCache.set(entry.channelId, channel);
      } catch (err) {
        console.error('Chyba při fetchi kanálu:', err);
        continue;
      }
    }

    // načteme zprávu pro ten den
    let message;
    try {
      message = await channel.messages.fetch(entry.messageId);
    } catch (err) {
      console.error(
        `Chyba při načítání zprávy pro den ${route.day}:`,
        err.message
      );
      continue;
    }

    const embed = buildEmbed(route, phase);
    const components = buildComponents(route);

    try {
      await message.edit({ embeds: [embed], components });
      lastKeys[route.day] = key;
      console.log(
        `[${now.toISOString()}] Aktualizováno okénko den ${route.day}, fáze ${phase}`
      );
    } catch (err) {
      console.error(
        `Chyba při editaci zprávy pro den ${route.day}:`,
        err.message
      );
    }
  }
}

// ====== /setup – vytvoří 24 okének v kanálu ======
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'setup') return;

  if (!ROUTES.length) {
    await interaction.reply({
      content: 'Nemám žádné trasy v ROUTES – doplň je prosím do index.js.',
      ephemeral: true,
    });
    return;
  }

  const channel = interaction.channel;
  if (!channel || !channel.isTextBased()) {
    await interaction.reply({
      content: 'Tento typ kanálu nepodporuji pro kalendář.',
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: 'Vytvářím adventní kalendář… 🎄',
    ephemeral: true,
  });

  const nowMs = Date.now();
  const messages = [];

  // Chceme, aby ODSPODA bylo: Den 1, nad ním Den 2, ... až Den 24 nahoře.
  // Discord řadí starší zprávy nahoru, novější dolů.
  // Takže pošleme nejdřív den 24, pak 23,... až 1.
  const sortedRoutes = [...ROUTES].sort((a, b) => a.day - b.day);
  const reversed = sortedRoutes.slice().reverse();

  for (const route of reversed) {
    const phase = getPhaseForRoute(route, nowMs);
    const embed = buildEmbed(route, phase);
    const components = buildComponents(route);

    const msg = await channel.send({ embeds: [embed], components });
    messages.push({
      day: route.day,
      channelId: channel.id,
      messageId: msg.id,
    });
  }

  calendarConfig = { messages };
  saveCalendarConfig(calendarConfig);

  // po vytvoření rovnou uděláme update (pro jistotu)
  await updateAllWindows();

  await interaction.followUp({
    content:
      'Adventní kalendář byl vytvořen. Okénka se budou automaticky aktualizovat podle času. 🎁',
    ephemeral: true,
  });
});

// ====== START BOTA ======
client.once('ready', () => {
  console.log(`✅ Přihlášen jako ${client.user.tag}`);

  // Hned po startu se pokusíme vše aktualizovat
  updateAllWindows().catch(console.error);

  // Potom kontrola každou minutu
  setInterval(() => {
    updateAllWindows().catch(console.error);
  }, 60 * 1000);
});

registerCommands()
  .then(() => client.login(TOKEN))
  .catch((err) => {
    console.error('Chyba při startu bota:', err);
  });
