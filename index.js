import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ====== CESTA K SOUBORU S ID ZPRÁVY ======
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
    '⚠️ CLIENT_ID nebo GUILD_ID chybí – slash commandy se nemusí zaregistrovat.'
  );
}

// ====== ADVENTNÍ DATA ======

// TADY SI DOPLŇ TRASY PRO JEDNOTLIVÉ DNY.
// ZATÍM JE TAM JEN DEN 1 JAKO PŘÍKLAD.
const YEAR = new Date().getFullYear();

const ROUTES = [
  {
    day: 1,
    mapUrl: 'https://example.com/mapa-den-1', // odkaz na mapu trasy
    teaserImage: 'https://example.com/den1-teaser.png', // otazník
    activeImage: 'https://example.com/den1-aktivni.png', // aktivní karta
    expiredImage: 'https://example.com/den1-expired.png', // po termínu
    from: 'TruckersMP HQ',
    to: 'Brno',
    distance: '500 km',
  },
  // ZKOPÍRUJ A UPRAV PRO DNY 2–24
  // {
  //   day: 2,
  //   mapUrl: 'https://example.com/mapa-den-2',
  //   teaserImage: 'https://example.com/den2-teaser.png',
  //   activeImage: 'https://example.com/den2-aktivni.png',
  //   expiredImage: 'https://example.com/den2-expired.png',
  //   from: 'Místo A',
  //   to: 'Místo B',
  //   distance: 'xxx km',
  // },
];

// 10:00 CET (Praha) = 09:00 UTC → Railway běží v UTC
function getWindow(day) {
  const start = Date.UTC(YEAR, 11, day, 9, 0, 0); // 1-based měsíc prosinec = 11
  const end = Date.UTC(YEAR, 11, day + 1, 9, 0, 0);
  return { start, end };
}

// Vrací { route, phase } kde phase = 'TEASER' | 'ACTIVE' | 'EXPIRED'
function getCurrentState(now = new Date()) {
  if (!ROUTES.length) return null;

  const nowMs = now.getTime();
  const windows = ROUTES.map((route) => ({
    route,
    ...getWindow(route.day),
  }));

  // seřadíme podle dne (pro jistotu)
  windows.sort((a, b) => a.route.day - b.route.day);

  // před prvním dnem → teaser prvního
  if (nowMs < windows[0].start) {
    return { route: windows[0].route, phase: 'TEASER' };
  }

  for (let i = 0; i < windows.length; i++) {
    const { route, start, end } = windows[i];

    if (nowMs >= start && nowMs < end) {
      // přímo v okně dne → aktivní
      return { route, phase: 'ACTIVE' };
    }

    if (nowMs >= end) {
      const next = windows[i + 1];
      if (!next || nowMs < next.start) {
        // po skončení dne, ale před dalším začátkem → expired
        return { route, phase: 'EXPIRED' };
      }
    }
  }

  // po skončení všech dní → expired posledního
  const last = windows[windows.length - 1];
  return { route: last.route, phase: 'EXPIRED' };
}

function buildEmbed(state) {
  const { route, phase } = state;
  const { start, end } = getWindow(route.day);

  const startDate = new Date(start);
  const endDate = new Date(end);

  // jednoduchý formát času: 1.12. 10:00 – 2.12. 10:00 (pro Prahu)
  const timeText = `${startDate.getUTCDate()}.12. ${String(
    startDate.getUTCHours() + 1
  ).padStart(2, '0')}:00 – ${endDate.getUTCDate()}.12. ${String(
    endDate.getUTCHours() + 1
  ).padStart(2, '0')}:00`;

  let description = '';
  let imageUrl = '';
  let color = 0xffc04d; // zlatavá

  if (phase === 'TEASER') {
    description =
      `Adventní trasa **#${route.day}** je zatím skrytá.\n` +
      `Odemkne se v čase **${timeText}**.\n\n` +
      `Připrav se – za odjetí získáš TICKET do tomboly! 🎟️`;
    imageUrl = route.teaserImage;
  } else if (phase === 'ACTIVE') {
    description =
      `**Start:** ${route.from}\n` +
      `**Cíl:** ${route.to}\n` +
      `**Délka:** ${route.distance}\n` +
      `**Čas:** ${timeText}\n\n` +
      `Klikni na odkaz nahoře a otevři si mapu trasy 👇`;
    imageUrl = route.activeImage;
    color = 0x4caf50; // zelená pro aktivní
  } else if (phase === 'EXPIRED') {
    description =
      `Čas pro adventní trasu **#${route.day}** už vypršel ⏰\n` +
      `Sleduj další okénka, ať ti nic neuteče!`;
    imageUrl = route.expiredImage;
    color = 0xaa0000;
  }

  const embed = {
    title: `🎄 Adventní trasa #${route.day}`,
    description,
    url: route.mapUrl,
    color,
    footer: {
      text: 'Merry Christmas from LTR <3',
    },
  };

  if (imageUrl) {
    embed.image = { url: imageUrl };
  }

  return embed;
}

// ====== PRÁCE S calendar.json ======
function loadCalendarConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      if (!raw) return null;
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Chyba při čtení calendar.json:', err);
  }
  return null;
}

function saveCalendarConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    console.log('calendar.json uložen:', config);
  } catch (err) {
    console.error('Chyba při zápisu calendar.json:', err);
  }
}

// ====== DISCORD BOT A SLASH COMMAND /setup ======
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Vytvoří nebo obnoví adventní kalendář v tomto kanálu.'),
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
let lastKey = null;

async function getCalendarMessage() {
  if (!calendarConfig) return null;

  const { channelId, messageId } = calendarConfig;
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      console.warn('Kanál pro kalendář není textový nebo neexistuje.');
      return null;
    }

    const message = await channel.messages.fetch(messageId);
    return message;
  } catch (err) {
    console.error('Nepodařilo se načíst zprávu kalendáře:', err);
    return null;
  }
}

async function updateCalendarIfNeeded() {
  if (!calendarConfig) return;

  const now = new Date();
  const state = getCurrentState(now);
  if (!state) {
    // žádná trasa – nic neaktualizujeme
    return;
  }

  const key = `${state.route.day}-${state.phase}`;
  if (key === lastKey) {
    // Stav se nezměnil, není třeba spamovat edit
    return;
  }

  const message = await getCalendarMessage();
  if (!message) return;

  const embed = buildEmbed(state);

  await message.edit({ embeds: [embed] });
  lastKey = key;
  console.log(
    `[${now.toISOString()}] Aktualizován kalendář: den ${state.route.day}, fáze ${state.phase}`
  );
}

// ====== HANDLER SLASH COMMANDU /setup ======
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'setup') return;

  const state = getCurrentState(new Date());
  if (!state) {
    await interaction.reply({
      content: 'Momentálně není nastavena žádná adventní trasa.',
      ephemeral: true,
    });
    return;
  }

  const embed = buildEmbed(state);

  // Vytvoříme novou zprávu jako kalendář
  const reply = await interaction.reply({
    content: '🎄 Adventní kalendář LTR',
    embeds: [embed],
    fetchReply: true,
  });

  calendarConfig = {
    channelId: reply.channel.id,
    messageId: reply.id,
  };
  saveCalendarConfig(calendarConfig);
  lastKey = `${state.route.day}-${state.phase}`;

  console.log('Kalendář nastaven v kanálu', reply.channel.id);
});

// ====== START BOTA ======
client.once('ready', () => {
  console.log(`✅ Přihlášen jako ${client.user.tag}`);

  // hned po startu zkusíme aktualizovat
  updateCalendarIfNeeded().catch(console.error);

  // pak kontrola každou minutu
  setInterval(() => {
    updateCalendarIfNeeded().catch(console.error);
  }, 60 * 1000);
});

registerCommands()
  .then(() => client.login(TOKEN))
  .catch((err) => {
    console.error('Chyba při startu bota:', err);
  });
