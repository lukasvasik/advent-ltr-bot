import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─────────────────────────────────────────────
// Cesta k JSON konfiguraci
// ─────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, 'calendar.json');

// ─────────────────────────────────────────────
// ENV VARS
// ─────────────────────────────────────────────

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN) throw new Error('❌ DISCORD_TOKEN chybí.');
if (!CLIENT_ID) console.warn('⚠️ CLIENT_ID chybí (slash command možná nepojede).');
if (!GUILD_ID) console.warn('⚠️ GUILD_ID chybí (slash command možná nepojede).');

// ─────────────────────────────────────────────
// ROUTES — DOPLŇ 24 DNÍ
// ─────────────────────────────────────────────
//
// • activeImage → obrázek embed karty (tvůj design)
// • expiredImage → verze „po termínu“
// • mapUrl → kam vede tlačítko i title
//
const YEAR = new Date().getFullYear();

const ROUTES = [
  {
    day: 1,
    from: "TruckersMP HQ",
    to: "Brno",
    distance: "500 km",
    mapUrl: "https://example.com/map1",
    activeImage: "https://i.imgur.com/example-active1.png",
    expiredImage: "https://i.imgur.com/example-expired1.png"
  },

  {
    day: 2,
    from: "Praha",
    to: "Salzburg",
    distance: "620 km",
    mapUrl: "https://example.com/map2",
    activeImage: "https://i.imgur.com/example-active2.png",
    expiredImage: "https://i.imgur.com/example-expired2.png"
  }

  // ➜ doplň dny 3–24
];

// ─────────────────────────────────────────────
// Pomocné funkce
// ─────────────────────────────────────────────

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return null;
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

// Výpočet časového okna dne
function getWindow(day) {
  const start = Date.UTC(YEAR, 11, day, 9, 0, 0);  // 1.12. v 10:00 CET
  const end = Date.UTC(YEAR, 11, day + 1, 9, 0, 0);
  return { start, end };
}

// Zjištění dnešního adventního dne
function getTodaysDay(nowMs) {
  for (const r of ROUTES) {
    const { start, end } = getWindow(r.day);
    if (nowMs >= start && nowMs < end) return r.day;
  }
  return null;
}

// Postaví embed — ACTIVE nebo EXPIRED
function buildEmbed(route, state) {
  const { start, end } = getWindow(route.day);
  const st = new Date(start);
  const en = new Date(end);

  const timeText = `${st.getUTCDate()}.12. ${String(st.getUTCHours() + 1).padStart(2,'0')}:00 – ${en.getUTCDate()}.12. ${String(en.getUTCHours() + 1).padStart(2,'0')}:00`;

  let description = "";
  let imageUrl = "";
  let color = 16731212;  // tvá barva

  if (state === "ACTIVE") {
    description =
      `**Trasa je právě AKTIVNÍ!**\n\n` +
      `**Start:** ${route.from}\n` +
      `**Cíl:** ${route.to}\n` +
      `**Délka:** ${route.distance}\n` +
      `**Čas:** ${timeText}\n\n` +
      `Klikni na tlačítko níže a otevři si mapu trasy 👇`;

    imageUrl = route.activeImage;

  } else {
    description =
      `**Tato vánoční trasa už není dostupná.**\n` +
      `Podívej se na další okénka adventního kalendáře!`;

    imageUrl = route.expiredImage;
  }

  return {
    title: `🎄 Adventní kalendář – Den #${route.day}`,
    description,
    url: route.mapUrl,
    color,
    footer: {
      text: `LTR Adventní kalendář • Den ${route.day} z 24.`,
      icon_url: "https://message.style/cdn/images/95f08db2041f0316c4a860d6548f81f6895acdf01b4e3ecca8ba31ce5afb934e.png"
    },
    thumbnail: {
      url: "https://message.style/cdn/images/95f08db2041f0316c4a860d6548f81f6895acdf01b4e3ecca8ba31ce5afb934e.png"
    },
    image: {
      url: imageUrl
    }
  };
}

// Tlačítko
function buildButton(route) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Klikni pro mapu trasy")
        .setStyle(ButtonStyle.Link)
        .setURL(route.mapUrl)
    )
  ];
}

// ─────────────────────────────────────────────
// Discord bot
// ─────────────────────────────────────────────

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let config = loadConfig() || { channelId: null, lastPublishedDay: 0, messages: {} };

const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Nastaví kanál pro adventní kalendář.")
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Slash commandy registrovány.");
  } catch (e) {
    console.error(e);
  }
}

// ─────────────────────────────────────────────
// /setup
// ─────────────────────────────────────────────
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "setup") return;

  config.channelId = interaction.channel.id;
  
  saveConfig(config);

  await interaction.reply({
    content: "📌 Kanál pro adventní kalendář byl uložen.\nBot začne publikovat okénka každý den v 10:00.",
    ephemeral: true
  });
});

// ─────────────────────────────────────────────
// AUTO UPDATE — KAŽDOU MINUTU
// ─────────────────────────────────────────────
async function autoUpdate() {
  if (!config.channelId) return;

  const channel = await client.channels.fetch(config.channelId);
  const nowMs = Date.now();

  // Zjistíme dnešní den
  const todaysDay = getTodaysDay(nowMs);

  // Nic dnes ještě nezačalo
  if (!todaysDay) return;

  // Pokud už jsme dnešní publikovali, nic neděláme
  if (config.lastPublishedDay === todaysDay) return;

  // ──────────────────────────────
  // 1) Publikace dnešního ACTIVE okénka
  // ──────────────────────────────
  const route = ROUTES.find(r => r.day === todaysDay);
  const activeEmbed = buildEmbed(route, "ACTIVE");
  const activeButton = buildButton(route);

  const msg = await channel.send({
    embeds: [activeEmbed],
    components: activeButton
  });

  // uložíme ID nového ACTIVE dne
  config.messages[todaysDay] = msg.id;

  // ──────────────────────────────
  // 2) Přepis včerejšího dne na EXPIRED
  // ──────────────────────────────
  const yesterday = todaysDay - 1;
  if (config.messages[yesterday]) {
    const oldId = config.messages[yesterday];
    try {
      const oldMsg = await channel.messages.fetch(oldId);
      const expiredEmbed = buildEmbed(
        ROUTES.find(r => r.day === yesterday),
        "EXPIRED"
      );
      await oldMsg.edit({ embeds: [expiredEmbed], components: [] });
    } catch (e) {
      console.warn("nemohl jsem aktualizovat minulý den:", e.message);
    }
  }

  // Aktualizace uloženého stavu
  config.lastPublishedDay = todaysDay;
  saveConfig(config);

  console.log(`🔔 Publikován den ${todaysDay}.`);
}

// ─────────────────────────────────────────────
// Bot ready + interval
// ─────────────────────────────────────────────
client.once("ready", () => {
  console.log(`Bot je přihlášen jako ${client.user.tag}`);

  // Hned provedeme startovní update
  autoUpdate();

  // Každou minutu kontrolujeme čas
  setInterval(autoUpdate, 60 * 1000);
});

registerCommands();
client.login(TOKEN);
