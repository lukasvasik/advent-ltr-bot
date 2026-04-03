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
  AttachmentBuilder,
  PermissionFlagsBits
} from 'discord.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─────────────────────────────────────────────
// Cesty k souborům
// ─────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, 'easter_config.json');
const EGGS_PATH = path.join(__dirname, 'easter_eggs.json');

// ─────────────────────────────────────────────
// ENV VARS
// ─────────────────────────────────────────────
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const JOBS_CHANNEL_ID = process.env.JOBS_CHANNEL_ID || '1149900706543833208';
const BRAND_COLOR = 0x34EB52; // Velikonoční zelená

if (!TOKEN) throw new Error('❌ DISCORD_TOKEN chybí.');

// ─────────────────────────────────────────────
// VELIKONOČNÍ TRASY 2026 (Z OBRÁZKŮ)
// ─────────────────────────────────────────────
const YEAR = 2026;
const START_HOUR_UTC = 14; // 16:00 SEČ (v dubnu je letní čas UTC+2)

const getWindow = (dayNum) => ({
  start: Date.UTC(YEAR, 3, dayNum, START_HOUR_UTC, 0, 0), // 3 = Duben
  end:   Date.UTC(YEAR, 3, dayNum + 1, START_HOUR_UTC, 0, 0)
});

const ROUTES = [
  { day: 1, from: "Bratislava", to: "Poznan", dist: "564 km", activeImage: "https://i.imgur.com/eHOjNyE.png", expiredImage: "https://i.imgur.com/xzwO9q9.png", mapUrl: "https://i.imgur.com/dcvVqLD.png", ...getWindow(3) },
  { day: 2, from: "Poznan", to: "Hannover", dist: "474 km", activeImage: "https://i.imgur.com/iEUKh0A.png", expiredImage: "https://i.imgur.com/T8U1jEY.png", mapUrl: "https://i.imgur.com/858PSoN.png", ...getWindow(4) },
  { day: 3, from: "Hannover", to: "Calais", dist: "643 km", activeImage: "https://i.imgur.com/Ik9h5vG.png", expiredImage: "https://i.imgur.com/5lWHhpu.png", mapUrl: "https://i.imgur.com/LjVD8E0.png", ...getWindow(5) },
  { day: 4, from: "Calais", to: "Zeneva", dist: "872 km", activeImage: "https://i.imgur.com/4KIK4PI.png", expiredImage: "https://i.imgur.com/QJif9vR.png", mapUrl: "https://i.imgur.com/qrSrbx4.png", ...getWindow(6) },
  { day: 5, from: "Zeneva", to: "Verona", dist: "662 km", activeImage: "https://i.imgur.com/6CiJqB0.png", expiredImage: "https://i.imgur.com/UMw6XG8.png", mapUrl: "https://i.imgur.com/2myq0xw.png", ...getWindow(7) },
  { day: 6, from: "Verona", to: "Stuttgart", dist: "613 km", activeImage: "https://i.imgur.com/bYVAnmS.png", expiredImage: "https://i.imgur.com/YmiTkuG.png", mapUrl: "https://i.imgur.com/MfLXGcD.png", ...getWindow(8) },
  { day: 7, from: "Stuttgart", to: "Praha", dist: "509 km", activeImage: "https://i.imgur.com/mQQVYNr.png", expiredImage: "https://i.imgur.com/nicqzyT.png", mapUrl: "https://i.imgur.com/MfLXGcD.png", ...getWindow(9) }
];

// ─────────────────────────────────────────────
// NORMALIZACE MĚST & SYNONMA
// ─────────────────────────────────────────────
const CITY_SYNONYMS = {
  'praha': 'praha', 'prague': 'praha', 'prag': 'praha',
  'bratislava': 'bratislava', 'pressburg': 'bratislava',
  'poznan': 'poznan', 'poznaň': 'poznan',
  'hannover': 'hannover', 'hanover': 'hannover',
  'calais': 'calais',
  'zeneva': 'zeneva', 'geneve': 'zeneva', 'ženeva': 'zeneva', 'geneva': 'zeneva',
  'verona': 'verona',
  'stuttgart': 'stuttgart',
  'viden': 'viden', 'vienna': 'viden', 'vídeň': 'viden',
  'brno': 'brno', 'berlin': 'berlin', 'berlín': 'berlin'
};

function normalizeCity(text) {
  if (!text) return '';
  const base = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  for (const [key, val] of Object.entries(CITY_SYNONYMS)) {
    if (base.includes(key)) return val;
  }
  return base;
}

// ─────────────────────────────────────────────
// DATABÁZE VAJÍČEK A KONFIGURACE
// ─────────────────────────────────────────────
let eggsData = fs.existsSync(EGGS_PATH) ? JSON.parse(fs.readFileSync(EGGS_PATH, 'utf8')) : {};
let config = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) : { channelId: null, lastPublishedDay: 0, messages: {} };

function saveEggs() {
  fs.writeFileSync(EGGS_PATH, JSON.stringify(eggsData, null, 2), 'utf8');
}

function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

// ─────────────────────────────────────────────
// POMOCNÉ FUNKCE PRO EMBEDY A TLAČÍTKA
// ─────────────────────────────────────────────
function buildEmbed(route, state) {
  const st = new Date(route.start);
  const en = new Date(route.end);
  const timeText = `${st.getUTCDate()}.4. ${String(st.getUTCHours() + 2).padStart(2, '0')}:00 – ${en.getUTCDate()}.4. ${String(en.getUTCHours() + 2).padStart(2, '0')}:00`;

  if (state === "ACTIVE") {
    return {
      title: `🥚 Velikonoční jízda – Den #${route.day}`,
      description: `**Trasa je právě AKTIVNÍ!**\n\n**Start:** ${route.from}\n**Cíl:** ${route.to}\n**Délka:** ${route.dist}\n**Čas:** ${timeText}\n\nOdvez tuto trasu a získej velikonoční vajíčko! 🥚\n\nKlikni na tlačítko níže pro zobrazení mapy 👇`,
      color: BRAND_COLOR,
      image: { url: route.activeImage },
      footer: { text: `Luky Transport • Velikonoce 2026` }
    };
  } else {
    return {
      title: `🥚 Velikonoční jízda – Den #${route.day}`,
      description: `**Tato etapa už skončila.**\nSleduj aktuální trasu dne!`,
      color: 0x99aab5, // Zašedlá barva pro prošlé dny
      image: { url: route.expiredImage },
      footer: { text: `Luky Transport • Velikonoce 2026` }
    };
  }
}

function buildButton(route) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Zobrazit mapu trasy")
        .setStyle(ButtonStyle.Link)
        .setURL(route.mapUrl)
    )
  ];
}

// ─────────────────────────────────────────────
// LOGIKA PŘIPSÁNÍ VAJÍČKA
// ─────────────────────────────────────────────
async function processJob(tbName, fromRaw, toRaw) {
  const from = normalizeCity(fromRaw);
  const to = normalizeCity(toRaw);
  const now = Date.now();

  const route = ROUTES.find(r => 
    now >= r.start && now < r.end && 
    ((from === normalizeCity(r.from) && to === normalizeCity(r.to)) || 
     (from === normalizeCity(r.to) && to === normalizeCity(r.from)))
  );

  if (!route) return;

  if (!eggsData[tbName]) {
    eggsData[tbName] = { tbName, discordId: null, completedDays: [], totalEggs: 0, bonusClaimed: false };
  }
  
  const user = eggsData[tbName];

  if (!user.completedDays.includes(route.day)) {
    user.completedDays.push(route.day);
    user.totalEggs += 1;
    
    // Logika BONUSU: 7 tras = +3 vajíčka
    if (user.completedDays.length === 7 && !user.bonusClaimed) {
      user.totalEggs += 3;
      user.bonusClaimed = true;
    }
    saveEggs();
    console.log(`🥚 [EGG] Připsáno vajíčko: ${tbName} (Den ${route.day})`);
  }
}

// ─────────────────────────────────────────────
// SLASH COMMANDY – DEFINICE
// ─────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName("vajicka").setDescription("Ukáže tvůj stav velikonočních vajíček."),
  new SlashCommandBuilder().setName("leaderboard").setDescription("Zobrazí žebříček sběratelů vajíček.")
    .addIntegerOption(o => o.setName("strana").setDescription("Strana žebříčku").setMinValue(1)),
  new SlashCommandBuilder().setName("link").setDescription("Propojí tvůj Discord s TrucksBook nickem.")
    .addStringOption(o => o.setName("tb_nick").setDescription("Tvůj přesný nick na TrucksBooku").setRequired(true)),
  new SlashCommandBuilder().setName("velikonoce").setDescription("Zobrazí aktuální trasu pro dnešní den."),
  new SlashCommandBuilder().setName("setup").setDescription("Nastaví tento kanál pro publikování velikonočních dnů.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-egg-dump").setDescription("Exportuje soubor s vajíčky (Admin).")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(c => c.toJSON());

// ─────────────────────────────────────────────
// BOT EVENTY
// ─────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers]
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "setup") {
    config.channelId = interaction.channel.id;
    saveConfig();
    return interaction.reply({ content: "📌 Kanál pro velikonoční event byl úspěšně nastaven. Bot zde bude publikovat nové etapy každý den v 16:00.", ephemeral: true });
  }

  if (interaction.commandName === "vajicka") {
    const user = Object.values(eggsData).find(e => e.discordId === interaction.user.id);
    if (!user) return interaction.reply({ content: "Zatím nemáš žádná vajíčka. Nejdřív se propoj přes `/link`!", ephemeral: true });

    const embed = {
      title: "🥚 Tvůj velikonoční košík",
      fields: [
        { name: "Počet vajíček", value: `**${user.totalEggs}** 🥚`, inline: true },
        { name: "Splněné etapy", value: `**${user.completedDays.length} / 7**`, inline: true },
        { name: "Bonus za komplet (+3)", value: user.bonusClaimed ? "✅ Připsáno" : "❌ Chybí", inline: false }
      ],
      color: BRAND_COLOR,
      footer: { text: `Propojeno s TB: ${user.tbName}` }
    };
    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "link") {
    const nick = interaction.options.getString("tb_nick").trim();
    if (!eggsData[nick]) eggsData[nick] = { tbName: nick, discordId: interaction.user.id, completedDays: [], totalEggs: 0, bonusClaimed: false };
    else eggsData[nick].discordId = interaction.user.id;
    saveEggs();
    return interaction.reply({ content: `✅ Úspěšně propojeno! Tvůj Discord je spojen s TB: **${nick}**`, ephemeral: true });
  }

  if (interaction.commandName === "velikonoce") {
    const now = Date.now();
    const route = ROUTES.find(r => now >= r.start && now < r.end);
    if (!route) return interaction.reply("Momentálně neběží žádná velikonoční etapa.");
    return interaction.reply({ embeds: [buildEmbed(route, "ACTIVE")], components: buildButton(route) });
  }

  if (interaction.commandName === "leaderboard") {
    const page = interaction.options.getInteger("strana") ?? 1;
    const sorted = Object.values(eggsData).sort((a, b) => b.totalEggs - a.totalEggs || b.completedDays.length - a.completedDays.length);
    if (!sorted.length) return interaction.reply("Zatím nikdo nesbírá.");

    const start = (page - 1) * 10;
    const top = sorted.slice(start, start + 10);
    const lines = top.map((d, i) => `**${start + i + 1}.** ${d.discordId ? `<@${d.discordId}>` : d.tbName} — 🥚 **${d.totalEggs}** (Dny: ${d.completedDays.length}/7)`);

    return interaction.reply({
      embeds: [{
        title: "🏆 Žebříček Velikonoc 2026",
        description: lines.join("\n"),
        color: 0xFFCC00,
        footer: { text: `Strana ${page} | Celkem: ${sorted.length}` }
      }]
    });
  }

  if (interaction.commandName === "admin-egg-dump") {
    const file = new AttachmentBuilder(Buffer.from(JSON.stringify(eggsData, null, 2)), { name: 'eggs.json' });
    return interaction.reply({ files: [file], ephemeral: true });
  }
});

// Listener na TrucksBook webhooky (zprávy v kanálu)
client.on('messageCreate', async (message) => {
  if (message.channel.id !== JOBS_CHANNEL_ID || !message.embeds.length) return;
  const embed = message.embeds[0];
  const from = embed.fields?.find(f => f.name.toLowerCase().includes('odkud'))?.value;
  const to = embed.fields?.find(f => f.name.toLowerCase().includes('kam'))?.value;
  const tbName = embed.author?.name || embed.fields?.find(f => f.name.toLowerCase().includes('řidič'))?.value;
  if (from && to && tbName) processJob(tbName.trim(), from, to);
});

// Automatické publikování v 16:00
async function autoUpdate() {
  if (!config.channelId) return;
  const now = Date.now();
  const route = ROUTES.find(r => now >= r.start && now < r.end);
  
  if (!route || config.lastPublishedDay === route.day) return;

  const channel = await client.channels.fetch(config.channelId).catch(() => null);
  if (channel) {
    // 1. Změníme předchozí den na EXPIRED, pokud existuje
    const yesterday = route.day - 1;
    if (config.messages && config.messages[yesterday]) {
      try {
        const oldMsg = await channel.messages.fetch(config.messages[yesterday]);
        const expiredRoute = ROUTES.find(r => r.day === yesterday);
        if (expiredRoute) {
          await oldMsg.edit({ embeds: [buildEmbed(expiredRoute, "EXPIRED")], components: [] });
          console.log(`✅ Den ${yesterday} byl úspěšně označen jako ukončený.`);
        }
      } catch (err) {
        console.warn(`⚠️ Nemohl jsem aktualizovat zprávu pro den ${yesterday}:`, err.message);
      }
    }

    // 2. Publikujeme nový den a uložíme jeho ID zprávy
    const msg = await channel.send({ content: "@everyone", embeds: [buildEmbed(route, "ACTIVE")], components: buildButton(route) });
    
    if (!config.messages) config.messages = {};
    config.messages[route.day] = msg.id;
    config.lastPublishedDay = route.day;
    saveConfig();
    
    console.log(`🔔 Publikován velikonoční den ${route.day}.`);
  }
}

client.once("ready", () => {
  console.log(`Bot Velikonoce přihlášen jako ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  
  // Spouští autoUpdate každou minutu
  setInterval(autoUpdate, 60000);
});

client.login(TOKEN);
