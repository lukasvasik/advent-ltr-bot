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
const CONFIG_PATH = path.join(__dirname, 'calendar.json');
const TOKENS_PATH = path.join(__dirname, 'tokens.json');

// ─────────────────────────────────────────────
// ENV VARS
// ─────────────────────────────────────────────
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const JOBS_CHANNEL_ID = process.env.JOBS_CHANNEL_ID; // kanál s TrucksBook webhookem

if (!TOKEN) throw new Error('❌ DISCORD_TOKEN chybí.');
if (!CLIENT_ID) console.warn('⚠️ CLIENT_ID chybí (slash commandy se nemusí zaregistrovat).');
if (!GUILD_ID) console.warn('⚠️ GUILD_ID chybí (slash commandy se nemusí zaregistrovat).');
if (!JOBS_CHANNEL_ID) console.warn('⚠️ JOBS_CHANNEL_ID chybí – žetony se nebudou počítat.');

// ─────────────────────────────────────────────
// ADVENT: ROUTES – 21 dní
// ─────────────────────────────────────────────

// Fixnuto na rok 2025 dle tvého rozpisu
const YEAR = 2025;

// Začátek eventu – pro /analyzovat
const EVENT_START = Date.UTC(YEAR, 11, 2, 9, 0, 0); // 2.12. 10:00 CET

const ROUTES = [
  {
    day: 1,
    activeImage: "https://i.imgur.com/HPMLtys.png",
    expiredImage: "https://i.imgur.com/khFtCVK.png",
    mapUrl: "https://i.imgur.com/rk0hYlg.png",
    from: "Praha",
    to: "Berlín",
    distance: "513 km"
  },
  {
    day: 2,
    activeImage: "https://i.imgur.com/F42xYm8.png",
    expiredImage: "https://i.imgur.com/8MZchL2.png",
    mapUrl: "https://i.imgur.com/Vte3eqd.png",
    from: "Berlín",
    to: "Amsterdam",
    distance: "632 km"
  },
  {
    day: 3,
    activeImage: "https://i.imgur.com/UmaYyrl.png",
    expiredImage: "https://i.imgur.com/wwQLKHC.png",
    mapUrl: "https://i.imgur.com/ACIvvu2.png",
    from: "Amsterdam",
    to: "Paříž",
    distance: "534 km"
  },
  {
    day: 4,
    activeImage: "https://i.imgur.com/H6laRTj.png",
    expiredImage: "https://i.imgur.com/1VqFXCy.png",
    mapUrl: "https://i.imgur.com/rtzyTpt.png",
    from: "Paříž",
    to: "Štrasburk",
    distance: "621 km"
  },
  {
    day: 5,
    activeImage: "https://i.imgur.com/Xu5P2ZY.png",
    expiredImage: "https://i.imgur.com/NOTmajb.png",
    mapUrl: "https://your-cdn.com/advent/map05.png",
    from: "Štrasburk",
    to: "Kolín",
    distance: "306 km"
  },
  {
    day: 6,
    activeImage: "https://i.imgur.com/MJhu8Hr.png",
    expiredImage: "https://i.imgur.com/bRHJZGT.png",
    mapUrl: "https://i.imgur.com/mi4s5V9.png",
    from: "Kolín",
    to: "Lyon",
    distance: "699 km"
  },
  {
    day: 7,
    activeImage: "https://i.imgur.com/jZMBBLG.png",
    expiredImage: "https://i.imgur.com/2sVdU9S.png",
    mapUrl: "https://i.imgur.com/WCMIzc8.png",
    from: "Lyon",
    to: "Milán",
    distance: "522 km"
  },
  {
    day: 8,
    activeImage: "https://i.imgur.com/CPd8bx7.png",
    expiredImage: "https://i.imgur.com/iMgqrFQ.png",
    mapUrl: "https://your-cdn.com/advent/map08.png",
    from: "Milán",
    to: "Lublaň",
    distance: "627 km"
  },
  {
    day: 9,
    activeImage: "https://i.imgur.com/NJCEWIN.png",
    expiredImage: "https://i.imgur.com/XgUjvXJ.png",
    mapUrl: "https://your-cdn.com/advent/map09.png",
    from: "Lublaň",
    to: "Budapešť",
    distance: "447 km"
  },
  {
    day: 10,
    activeImage: "https://i.imgur.com/s7Qv0nR.png",
    expiredImage: "https://i.imgur.com/iY64co5.png",
    mapUrl: "https://your-cdn.com/advent/map10.png",
    from: "Budapešť",
    to: "TruckersMP HQ",
    distance: "658 km"
  },
  {
    day: 11,
    activeImage: "https://i.imgur.com/lICL8XB.png",
    expiredImage: "https://i.imgur.com/k5yywz7.png",
    mapUrl: "https://your-cdn.com/advent/map11.png",
    from: "TruckersMP HQ",
    to: "Brno",
    distance: "290 km"
  },
  {
    day: 12,
    activeImage: "https://i.imgur.com/4F9Uhla.png",
    expiredImage: "https://i.imgur.com/PMnCoiN.png",
    mapUrl: "https://your-cdn.com/advent/map12.png",
    from: "Vídeň",
    to: "Salzburg",
    distance: "313 km"
  },
  {
    day: 13,
    activeImage: "https://i.imgur.com/mzJgMie.png",
    expiredImage: "https://i.imgur.com/aFX9ooX.png",
    mapUrl: "https://your-cdn.com/advent/map13.png",
    from: "Salzburg",
    to: "Zürich",
    distance: "534 km"
  },
  {
    day: 14,
    activeImage: "https://i.imgur.com/RSMQ3ks.png",
    expiredImage: "https://i.imgur.com/pU3qOrR.png",
    mapUrl: "https://your-cdn.com/advent/map14.png",
    from: "Zürich",
    to: "Frankfurt",
    distance: "580 km"
  },
  {
    day: 15,
    activeImage: "https://i.imgur.com/KxdrtRw.png",
    expiredImage: "https://i.imgur.com/Gz3X9JY.png",
    mapUrl: "https://your-cdn.com/advent/map15.png",
    from: "Kodaň",
    to: "Duisburg",
    distance: "743 km"
  },
  {
    day: 16,
    activeImage: "https://i.imgur.com/Lc5WzMW.png",
    expiredImage: "https://i.imgur.com/A1KfHuP.png",
    mapUrl: "https://your-cdn.com/advent/map16.png",
    from: "Duisburg",
    to: "Calais",
    distance: "375 km"
  },
  {
    day: 17,
    activeImage: "https://i.imgur.com/mEO6zLj.png",
    expiredImage: "https://i.imgur.com/q8uPN07.png",
    mapUrl: "https://your-cdn.com/advent/map17.png",
    from: "Calais",
    to: "Londýn",
    distance: "266 km"
  },
  {
    day: 18,
    activeImage: "https://i.imgur.com/OwsdAOn.png",
    expiredImage: "https://i.imgur.com/uB0FHye.png",
    mapUrl: "https://your-cdn.com/advent/map18.png",
    from: "Londýn",
    to: "Varšava",
    distance: "1618 km"
  },
  {
    day: 19,
    activeImage: "https://i.imgur.com/FwWkUYu.png",
    expiredImage: "https://i.imgur.com/ocyDw42.png",
    mapUrl: "https://your-cdn.com/advent/map19.png",
    from: "Varšava",
    to: "Bratislava",
    distance: "374 km"
  },
  {
    day: 20,
    activeImage: "https://i.imgur.com/ze8qXT0.png",
    expiredImage: "https://i.imgur.com/9DDSvNw.png",
    mapUrl: "https://your-cdn.com/advent/map20.png",
    from: "Bratislava",
    to: "TruckersMP HQ",
    distance: "411 km"
  },
  {
    day: 21,
    activeImage: "https://i.imgur.com/ipFuQd0.png",
    expiredImage: "https://i.imgur.com/5UzWT4x.png",
    mapUrl: "https://your-cdn.com/advent/map21.png",
    from: "TruckersMP HQ",
    to: "Praha",
    distance: "308 km"
  }
];

// ─────────────────────────────────────────────
// ADVENT – pomocné funkce
// ─────────────────────────────────────────────

// Začínáme 2.12. → den 1 = 2.12. 10:00 CET
function getWindow(day) {
  const start = Date.UTC(YEAR, 11, day + 1, 9, 0, 0); // 10:00 CET = 09:00 UTC
  const end   = Date.UTC(YEAR, 11, day + 2, 9, 0, 0);
  return { start, end };
}

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function getTodaysDay(nowMs) {
  for (const r of ROUTES) {
    const { start, end } = getWindow(r.day);
    if (nowMs >= start && nowMs < end) return r.day;
  }
  return null;
}

function buildEmbed(route, state) {
  const { start, end } = getWindow(route.day);
  const st = new Date(start);
  const en = new Date(end);

  const timeText = `${st.getUTCDate()}.12. ${String(st.getUTCHours() + 1).padStart(2, '0')}:00 – ${en.getUTCDate()}.12. ${String(en.getUTCHours() + 1).padStart(2, '0')}:00`;

  let description = "";
  let imageUrl = "";
  const color = 16731212;

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
      text: `LTR Adventní kalendář • Den ${route.day} z 21.`,
      icon_url: "https://message.style/cdn/images/95f08db2041f0316c4a860d6548f81f6895acdf01b4e3ecca8ba31ce5afb934e.png"
    },
    thumbnail: {
      url: "https://message.style/cdn/images/95f08db2041f0316c4a860d6548f81f6895acdf01b4e3ecca8ba31ce5afb934e.png"
    },
    image: { url: imageUrl }
  };
}

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

function normalizeLocation(raw) {
  if (!raw) return '';
  return raw.replace(/^[^A-Za-zÀ-ž]+/, '').trim();
}

// ─────────────────────────────────────────────
// Normalizace měst + aliasy (Praha/Prague atd.)
// ─────────────────────────────────────────────
const CITY_SYNONYMS = {
  // Praha / Prague
  'praha': 'prague',
  'prague': 'prague',

  // Berlín / Berlin
  'berlin': 'berlin',
  'berlin germany': 'berlin',
  'berlin de': 'berlin',
  'berlín': 'berlin',

  // Amsterdam
  'amsterdam': 'amsterdam',

  // Paříž / Paris
  'pariz': 'paris',
  'paříž': 'paris',
  'paris': 'paris',

  // Štrasburk / Strasbourg
  'strasbourg': 'strasbourg',
  'strasburg': 'strasbourg',
  'štrasburk': 'strasbourg',

  // Kolín / Cologne
  'kolin': 'cologne',
  'kolín': 'cologne',
  'cologne': 'cologne',

  // Lyon
  'lyon': 'lyon',

  // Milán / Milan
  'milan': 'milan',
  'milán': 'milan',

  // Lublaň / Ljubljana
  'ljubljana': 'ljubljana',
  'lublan': 'ljubljana',
  'lublaň': 'ljubljana',

  // Budapešť / Budapest
  'budapest': 'budapest',
  'budapešť': 'budapest',

  // TruckersMP HQ
  'truckersmp hq': 'truckersmp hq',

  // Brno
  'brno': 'brno',

  // Vídeň / Vienna
  'wien': 'vienna',
  'vienna': 'vienna',
  'vídeň': 'vienna',

  // Salzburg
  'salzburg': 'salzburg',

  // Zürich / Zurich
  'zurich': 'zurich',
  'zuerich': 'zurich',
  'zürich': 'zurich',

  // Frankfurt
  'frankfurt': 'frankfurt',

  // Kodaň / Copenhagen
  'kodaň': 'copenhagen',
  'koda': 'copenhagen',
  'copenhagen': 'copenhagen',

  // Duisburg
  'duisburg': 'duisburg',

  // Calais
  'calais': 'calais',

  // Londýn / London
  'london': 'london',
  'londyn': 'london',
  'londýn': 'london',

  // Varšava / Warsaw
  'warsaw': 'warsaw',
  'varšava': 'warsaw',
  'varsava': 'warsaw',

  // Bratislava
  'bratislava': 'bratislava'
};

function normalizeCityName(raw) {
  if (!raw) return '';
  const base = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  return CITY_SYNONYMS[base] ?? base;
}

function cityMatches(tbValue, expected) {
  const a = normalizeCityName(tbValue);
  const b = normalizeCityName(expected);
  if (!a || !b) return false;
  return a === b;
}

// ─────────────────────────────────────────────
// ŽETONY – práce s tokens.json (TB nick based)
// ─────────────────────────────────────────────
//
// Struktura tokens:
// {
//   "Lukiten06": {
//     tbName: "Lukiten06",
//     discordId: "1234567890" | null,
//     silver: 0,
//     gold: 0
//   },
//   ...
// }

function loadTokens() {
  try {
    if (!fs.existsSync(TOKENS_PATH)) return {};
    return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
  } catch (err) {
    console.error('Chyba při čtení tokens.json:', err);
    return {};
  }
}

function saveTokens(tokensObj) {
  try {
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokensObj, null, 2), 'utf8');
  } catch (err) {
    console.error('Chyba při zápisu tokens.json:', err);
  }
}

let tokens = loadTokens();

function ensureTbEntry(tbName) {
  if (!tokens[tbName]) {
    tokens[tbName] = {
      tbName,
      discordId: null,
      silver: 0,
      gold: 0
    };
  }
  return tokens[tbName];
}

// 3 stříbrné -> 1 zlatý (automaticky)
function addTokens(tbName, silver, gold) {
  if (!tbName) return;
  const entry = ensureTbEntry(tbName);

  entry.silver += silver;
  entry.gold += gold;

  while (entry.silver >= 3) {
    entry.silver -= 3;
    entry.gold += 1;
  }

  saveTokens(tokens);
}

// pro leaderboard – skóre = zlaté*3 + stříbrné
function getUserScore(entry) {
  return entry.gold * 3 + entry.silver;
}

// sečte žetony pro daný Discord účet
function getTokensForDiscordUser(discordId) {
  let totalSilver = 0;
  let totalGold = 0;
  const details = [];

  for (const [tbName, data] of Object.entries(tokens)) {
    if (data.discordId === discordId) {
      totalSilver += data.silver;
      totalGold += data.gold;
      details.push({ tbName, silver: data.silver, gold: data.gold });
    }
  }

  return { totalSilver, totalGold, details };
}

// ─────────────────────────────────────────────
// REWARDS – tabulka odměn dle tras (2.12–22.12)
// ─────────────────────────────────────────────
const REWARDS = [
  {
    from: "Praha",
    to: "Berlín",
    silver: 2,
    gold: 0,
    start: Date.UTC(YEAR, 11, 2, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 3, 9, 0, 0)
  },
  {
    from: "Berlín",
    to: "Amsterdam",
    silver: 0,
    gold: 1,
    start: Date.UTC(YEAR, 11, 3, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 4, 9, 0, 0)
  },
  {
    from: "Amsterdam",
    to: "Paříž",
    silver: 2,
    gold: 0,
    start: Date.UTC(YEAR, 11, 4, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 5, 9, 0, 0)
  },
  {
    from: "Paříž",
    to: "Štrasburk",
    silver: 0,
    gold: 1,
    start: Date.UTC(YEAR, 11, 5, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 6, 9, 0, 0)
  },
  {
    from: "Štrasburk",
    to: "Kolín",
    silver: 1,
    gold: 0,
    start: Date.UTC(YEAR, 11, 6, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 7, 9, 0, 0)
  },
  {
    from: "Kolín",
    to: "Lyon",
    silver: 0,
    gold: 1,
    start: Date.UTC(YEAR, 11, 7, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 8, 9, 0, 0)
  },
  {
    from: "Lyon",
    to: "Milán",
    silver: 2,
    gold: 0,
    start: Date.UTC(YEAR, 11, 8, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 9, 9, 0, 0)
  },
  {
    from: "Milán",
    to: "Lublaň",
    silver: 0,
    gold: 1,
    start: Date.UTC(YEAR, 11, 9, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 10, 9, 0, 0)
  },
  {
    from: "Lublaň",
    to: "Budapešť",
    silver: 2,
    gold: 0,
    start: Date.UTC(YEAR, 11, 10, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 11, 9, 0, 0)
  },
  {
    from: "Budapešť",
    to: "TruckersMP HQ",
    silver: 0,
    gold: 1,
    start: Date.UTC(YEAR, 11, 11, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 12, 9, 0, 0)
  },
  {
    from: "TruckersMP HQ",
    to: "Brno",
    silver: 2,
    gold: 0,
    start: Date.UTC(YEAR, 11, 12, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 13, 9, 0, 0)
  },
  {
    from: "Vídeň",
    to: "Salzburg",
    silver: 2,
    gold: 0,
    start: Date.UTC(YEAR, 11, 13, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 14, 9, 0, 0)
  },
  {
    from: "Salzburg",
    to: "Zürich",
    silver: 0,
    gold: 1,
    start: Date.UTC(YEAR, 11, 14, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 15, 9, 0, 0)
  },
  {
    from: "Zürich",
    to: "Frankfurt",
    silver: 0,
    gold: 1,
    start: Date.UTC(YEAR, 11, 15, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 16, 9, 0, 0)
  },
  {
    from: "Kodaň",
    to: "Duisburg",
    silver: 1,
    gold: 1,
    start: Date.UTC(YEAR, 11, 16, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 17, 9, 0, 0)
  },
  {
    from: "Duisburg",
    to: "Calais",
    silver: 0,
    gold: 2,
    start: Date.UTC(YEAR, 11, 17, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 18, 9, 0, 0)
  },
  {
    from: "Calais",
    to: "Londýn",
    silver: 2,
    gold: 0,
    start: Date.UTC(YEAR, 11, 18, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 19, 9, 0, 0)
  },
  {
    from: "Londýn",
    to: "Varšava",
    silver: 1,
    gold: 2,
    start: Date.UTC(YEAR, 11, 19, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 20, 9, 0, 0)
  },
  {
    from: "Varšava",
    to: "Bratislava",
    silver: 2,
    gold: 0,
    start: Date.UTC(YEAR, 11, 20, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 21, 9, 0, 0)
  },
  {
    from: "Bratislava",
    to: "TruckersMP HQ",
    silver: 0,
    gold: 1,
    start: Date.UTC(YEAR, 11, 21, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 22, 9, 0, 0)
  },
  {
    from: "TruckersMP HQ",
    to: "Praha",
    silver: 2,
    gold: 0,
    start: Date.UTC(YEAR, 11, 22, 9, 0, 0),
    end:   Date.UTC(YEAR, 11, 23, 9, 0, 0)
  }
];

// ─────────────────────────────────────────────
// DISCORD BOT – setup
// ─────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

let config = loadConfig() || { channelId: null, lastPublishedDay: 0, messages: {} };

const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Nastaví kanál pro adventní kalendář."),
  new SlashCommandBuilder()
    .setName("zetony")
    .setDescription("Ukáže tvůj stav žetonů."),
  new SlashCommandBuilder()
    .setName("preview")
    .setDescription("Náhled adventní trasy pro konkrétní den.")
    .addIntegerOption(o =>
      o
        .setName("den")
        .setDescription("Číslo dne (1–21)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(21)
    ),
  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Zobrazí TOP 10 řidičů podle žetonů."),
  new SlashCommandBuilder()
    .setName("link")
    .setDescription("Propojí tvůj Discord účet s TB nickname.")
    .addStringOption(o =>
      o
        .setName("tb_nick")
        .setDescription("Tvůj nick na TrucksBooku")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("admin-link")
    .setDescription("ADMIN: ručně propojí Discord uživatele s TB nickname.")
    .addUserOption(o =>
      o
        .setName("uzivatel")
        .setDescription("Discord uživatel")
        .setRequired(true)
    )
    .addStringOption(o =>
      o
        .setName("tb_nick")
        .setDescription("TB nickname")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("publish_day")
    .setDescription("Ručně zveřejní vybraný adventní den v tomto kanálu.")
    .addIntegerOption(o =>
      o
        .setName("den")
        .setDescription("Číslo dne (1–21)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(21)
    ),
  new SlashCommandBuilder()
    .setName("analyzovat")
    .setDescription("ADMIN: projde historii zakázek a přepočítá žetony od začátku eventu.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("admin-dump")
    .setDescription("Exportuje tokens.json se žetony (jen admin).")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Slash commandy zaregistrovány.");
  } catch (e) {
    console.error("Chyba při registraci commandů:", e);
  }
}

// ─────────────────────────────────────────────
// Pomocná funkce – vytažení TB nicku z embedu
// ─────────────────────────────────────────────
function extractTbNameFromEmbed(embed) {
  if (!embed) return null;

  // 1) author.name – u TB webhooku to bývá nick
  if (embed.author && embed.author.name) {
    let v = String(embed.author.name).trim();
    v = v.replace(/[*_`~]/g, '');
    return v;
  }

  // 2) fallback – případné pole "Řidič" / "Driver"
  if (embed.fields && embed.fields.length > 0) {
    const driverField = embed.fields.find(f =>
      f.name &&
      typeof f.name === 'string' &&
      (f.name.toLowerCase().includes('řidič') ||
       f.name.toLowerCase().includes('ridic') ||
       f.name.toLowerCase().includes('driver'))
    );
    if (driverField && driverField.value) {
      let v = String(driverField.value).trim();
      v = v.replace(/[*_`~]/g, '');
      return v;
    }
  }

  return null;
}

// ─────────────────────────────────────────────
// Slash commandy handler
// ─────────────────────────────────────────────
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "setup") {
    config.channelId = interaction.channel.id;
    saveConfig(config);

    await interaction.reply({
      content: "📌 Kanál pro adventní kalendář byl uložen.\nBot bude od 2.12. publikovat okénka každý den v 10:00.",
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === "zetony") {
    const { totalSilver, totalGold, details } = getTokensForDiscordUser(interaction.user.id);

    if (totalSilver === 0 && totalGold === 0) {
      await interaction.reply({
        content: `${interaction.user}, zatím u tebe neeviduji žádné žetony.\nUjisti se, že máš přes /link propojený svůj TB nickname a že jsi jel adventní trasy.`
      });
      return;
    }

    const score = totalGold * 3 + totalSilver;
    const lines = details.map(d =>
      `• **${d.tbName}** — 🥇 ${d.gold}, 🥈 ${d.silver}`
    );

    await interaction.reply({
      content: `📣 ${interaction.user}, tady je tvůj aktuální stav žetonů:`,
      embeds: [
        {
          title: "💰 Stav žetonů",
          description:
            `🥇 Zlaté: **${totalGold}**\n` +
            `🥈 Stříbrné: **${totalSilver}**\n` +
            `📊 Body: **${score}** (1🥇 = 3 body, 1🥈 = 1 bod)\n\n` +
            (lines.length ? `Rozpis podle TB nicků:\n${lines.join('\n')}` : ""),
          color: 0xffc04d
        }
      ]
    });
    return;
  }

  if (interaction.commandName === "preview") {
    const day = interaction.options.getInteger("den");
    const route = ROUTES.find(r => r.day === day);

    if (!route) {
      await interaction.reply({
        content: `❌ Nemám žádná data pro den ${day}.`,
        ephemeral: true
      });
      return;
    }

    const embed = buildEmbed(route, "ACTIVE");
    const components = buildButton(route);

    await interaction.reply({
      content: `🧪 Náhled adventní trasy pro den ${day}:`,
      embeds: [embed],
      components,
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === "leaderboard") {
    const entries = Object.entries(tokens);
    if (entries.length === 0) {
      await interaction.reply({
        content: `📉 Zatím nikdo nezískal žádné žetony.`
      });
      return;
    }

    const sorted = entries.sort(([, a], [, b]) => {
      const scoreA = getUserScore(a);
      const scoreB = getUserScore(b);
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.gold !== a.gold) return b.gold - a.gold;
      return b.silver - a.silver;
    });

    const top = sorted.slice(0, 10);

    const lines = [];
    for (let i = 0; i < top.length; i++) {
      const [tbName, data] = top[i];
      let label;

      if (data.discordId) {
        label = `<@${data.discordId}> (${tbName})`;
      } else {
        label = `${tbName} (TB)`;
      }

      const score = getUserScore(data);
      lines.push(
        `**${i + 1}.** ${label} — 🥇 **${data.gold}** | 🥈 **${data.silver}** (📊 **${score}** bodů)`
      );
    }

    await interaction.reply({
      content: `🏁 Žebříček vyžádal: ${interaction.user}`,
      embeds: [
        {
          title: "🏆 TOP 10 řidičů podle žetonů",
          description: lines.join("\n"),
          color: 0xf1c40f
        }
      ]
    });
    return;
  }

  if (interaction.commandName === "link") {
    const tbNickRaw = interaction.options.getString("tb_nick");
    const tbNick = tbNickRaw.trim();

    const entry = ensureTbEntry(tbNick);
    entry.discordId = interaction.user.id;
    saveTokens(tokens);

    await interaction.reply({
      content: `✅ Propojil jsem tvůj Discord účet ${interaction.user} s TB nickem **${tbNick}**.\nVšechny žetony pod tímto TB nickem se ti nyní počítají do příkazu /zetony.`,
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === "admin-link") {
    if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "⛔ Tento příkaz je jen pro administrátory.",
        ephemeral: true
      });
      return;
    }

    const user = interaction.options.getUser("uzivatel");
    const tbNickRaw = interaction.options.getString("tb_nick");
    const tbNick = tbNickRaw.trim();

    const entry = ensureTbEntry(tbNick);
    entry.discordId = user.id;
    saveTokens(tokens);

    await interaction.reply({
      content: `✅ Propojil jsem uživatele ${user} s TB nickem **${tbNick}**.`
    });
    return;
  }

  if (interaction.commandName === "publish_day") {
    const day = interaction.options.getInteger("den");
    const route = ROUTES.find(r => r.day === day);

    if (!route) {
      await interaction.reply({
        content: `❌ Nemám žádná data pro den ${day}.`,
        ephemeral: true
      });
      return;
    }

    // nastavíme adventní kanál na aktuální
    config.channelId = interaction.channel.id;

    const activeEmbed = buildEmbed(route, "ACTIVE");
    const activeButton = buildButton(route);

    const msg = await interaction.reply({
      content: '@everyone',
      embeds: [activeEmbed],
      components: activeButton,
      allowedMentions: { parse: ['everyone'] },
      fetchReply: true
    });

    config.messages[day] = msg.id;
    config.lastPublishedDay = day;
    saveConfig(config);

    console.log(`🛠 Ručně publikován den ${day} v kanálu ${interaction.channel.id}.`);
    return;
  }

  if (interaction.commandName === "analyzovat") {
    if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "⛔ Tento příkaz je jen pro administrátory.",
        ephemeral: true
      });
      return;
    }

    if (!JOBS_CHANNEL_ID) {
      await interaction.reply({
        content: "❌ Není nastaven JOBS_CHANNEL_ID, nemohu analyzovat historii.",
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      content: "🔍 Začínám analyzovat historii zakázek... to může chvíli trvat.",
      ephemeral: true
    });

    try {
      const channel = await client.channels.fetch(JOBS_CHANNEL_ID);
      if (!channel || !channel.isTextBased()) {
        await interaction.followUp({
          content: "❌ Kanál zakázek není textový nebo neexistuje.",
          ephemeral: true
        });
        return;
      }

      // reset žetonů a přepočet od začátku eventu
      tokens = {};
      let lastId = null;
      let processed = 0;
      let rewarded = 0;
      let stop = false;

      while (!stop) {
        const fetched = await channel.messages.fetch({
          limit: 100,
          before: lastId ?? undefined
        });

        if (fetched.size === 0) break;

        const messages = Array.from(fetched.values());
        for (const message of messages) {
          if (message.createdTimestamp < EVENT_START) {
            stop = true;
            break;
          }

          if (!message.embeds || message.embeds.length === 0) continue;
          const embed = message.embeds[0];
          if (!embed.fields || embed.fields.length === 0) continue;

          const fromField = embed.fields.find(f => f.name.toLowerCase().includes('odkud'));
          const toField   = embed.fields.find(f => f.name.toLowerCase().includes('kam'));
          if (!fromField || !toField) continue;

          const from = normalizeLocation(fromField.value);
          const to   = normalizeLocation(toField.value);
          const ts   = message.createdTimestamp;

          const reward = REWARDS.find(r =>
            cityMatches(from, r.from) &&
            cityMatches(to, r.to) &&
            ts >= r.start &&
            ts < r.end
          );

          if (!reward) continue;

          const tbName = extractTbNameFromEmbed(embed);
          if (!tbName) continue;

          addTokens(tbName, reward.silver, reward.gold);
          rewarded++;
          processed++;
        }

        lastId = messages[messages.length - 1].id;
      }

      await interaction.followUp({
        content: `✅ Analýza dokončena.\nZpracováno zpráv: **${processed}**\nPřiděleno odměn: **${rewarded}**.`,
        ephemeral: true
      });
    } catch (err) {
      console.error("Chyba při analýze historie:", err);
      await interaction.followUp({
        content: "❌ Při analýze došlo k chybě. Zkontroluj logy na hostingu.",
        ephemeral: true
      });
    }

    return;
  }

  if (interaction.commandName === "admin-dump") {
    if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "⛔ Tento příkaz je jen pro administrátory.",
        ephemeral: true
      });
      return;
    }

    const jsonText = JSON.stringify(tokens, null, 2);
    const file = new AttachmentBuilder(
      Buffer.from(jsonText, 'utf8'),
      { name: `tokens-${Date.now()}.json` }
    );

    await interaction.reply({
      content: "📤 Tady máš aktuální zálohu žetonů (tokens.json).",
      files: [file],
      ephemeral: true
    });
    return;
  }
});

// ─────────────────────────────────────────────
// Listener na zprávy v kanálu zakázek (TrucksBook)
// ─────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (!JOBS_CHANNEL_ID || message.channel.id !== JOBS_CHANNEL_ID) return;
  if (!message.embeds || message.embeds.length === 0) return;

  const embed = message.embeds[0];
  if (!embed.fields) return;

  const fromField = embed.fields.find(f => f.name.toLowerCase().includes('odkud'));
  const toField   = embed.fields.find(f => f.name.toLowerCase().includes('kam'));
  if (!fromField || !toField) return;

  const from = normalizeLocation(fromField.value);
  const to   = normalizeLocation(toField.value);
  const ts   = message.createdTimestamp;

  const reward = REWARDS.find(r =>
    cityMatches(from, r.from) &&
    cityMatches(to, r.to) &&
    ts >= r.start &&
    ts < r.end
  );

  if (!reward) return;

  const tbName = extractTbNameFromEmbed(embed);
  if (!tbName) {
    console.log("Nenašel jsem TB nickname v embedu, odměna nepřipsána.");
    return;
  }

  addTokens(tbName, reward.silver, reward.gold);
  console.log(`Žetony: ${tbName} +${reward.silver}🥈 +${reward.gold}🥇 za trasu ${from} → ${to}`);
});

// ─────────────────────────────────────────────
// Advent – autoUpdate
// ─────────────────────────────────────────────
async function autoUpdate() {
  if (!config.channelId) return;

  const channel = await client.channels.fetch(config.channelId);
  const now = Date.now();

  const todaysDay = getTodaysDay(now);
  if (!todaysDay) return;

  if (config.lastPublishedDay === todaysDay) return;

  const route = ROUTES.find(r => r.day === todaysDay);
  if (!route) return;

  const activeEmbed = buildEmbed(route, "ACTIVE");
  const activeButton = buildButton(route);

  const msg = await channel.send({
    content: '@everyone',
    embeds: [activeEmbed],
    components: activeButton,
    allowedMentions: { parse: ['everyone'] }
  });

  config.messages[todaysDay] = msg.id;

  const yesterday = todaysDay - 1;
  if (config.messages[yesterday]) {
    try {
      const oldMsg = await channel.messages.fetch(config.messages[yesterday]);
      const expiredRoute = ROUTES.find(r => r.day === yesterday);
      if (expiredRoute) {
        const expiredEmbed = buildEmbed(expiredRoute, "EXPIRED");
        await oldMsg.edit({ embeds: [expiredEmbed], components: [] });
      }
    } catch (e) {
      console.warn("Nemohl jsem aktualizovat včerejší den:", e.message);
    }
  }

  config.lastPublishedDay = todaysDay;
  saveConfig(config);

  console.log(`🔔 Publikován den ${todaysDay}.`);
}

// ─────────────────────────────────────────────
// Start bota
// ─────────────────────────────────────────────
client.once("ready", () => {
  console.log(`Bot přihlášen jako ${client.user.tag}`);
  autoUpdate().catch(console.error);
  setInterval(() => autoUpdate().catch(console.error), 60 * 1000);
});

registerCommands();
client.login(TOKEN);
