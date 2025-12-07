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
const PROCESSED_PATH = path.join(__dirname, 'processed.json');

// ─────────────────────────────────────────────
// ENV VARS
// ─────────────────────────────────────────────
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Pokud v env není JOBS_CHANNEL_ID, použijeme natvrdo ID, co jsi poslal
const JOBS_CHANNEL_ID = process.env.JOBS_CHANNEL_ID || '1149900706543833208';

// role za 5 zlatých žetonů
const GOLD_ROLE_ID = '1445291140348772372';

// firemní barva (např. pro statistické embed)
const BRAND_COLOR = 0xFF2C57;

if (!TOKEN) throw new Error('❌ DISCORD_TOKEN chybí.');
if (!CLIENT_ID) console.warn('⚠️ CLIENT_ID chybí (slash commandy se nemusí zaregistrovat).');
if (!GUILD_ID) console.warn('⚠️ GUILD_ID chybí (slash commandy se nemusí zaregistrovat).');

if (!process.env.JOBS_CHANNEL_ID) {
  console.warn('⚠️ JOBS_CHANNEL_ID není nastaven v env, používám natvrdo 1149900706543833208.');
}

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
    mapUrl: "https://i.imgur.com/Y0iuQ6v.png",
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
    mapUrl: "https://i.imgur.com/uJQv3X4.png",
    from: "Milán",
    to: "Lublaň",
    distance: "627 km"
  },
  {
    day: 9,
    activeImage: "https://i.imgur.com/NJCEWIN.png",
    expiredImage: "https://i.imgur.com/XgUjvXJ.png",
    mapUrl: "https://i.imgur.com/wuYKtsB.png",
    from: "Lublaň",
    to: "Budapešť",
    distance: "447 km"
  },
  {
    day: 10,
    activeImage: "https://i.imgur.com/s7Qv0nR.png",
    expiredImage: "https://i.imgur.com/iY64co5.png",
    mapUrl: "https://i.imgur.com/46zLtoh.png",
    from: "Budapešť",
    to: "TruckersMP HQ",
    distance: "658 km"
  },
  {
    day: 11,
    activeImage: "https://i.imgur.com/lICL8XB.png",
    expiredImage: "https://i.imgur.com/k5yywz7.png",
    mapUrl: "https://i.imgur.com/VMdvMrR.png",
    from: "TruckersMP HQ",
    to: "Brno",
    distance: "290 km"
  },
  {
    day: 12,
    activeImage: "https://i.imgur.com/4F9Uhla.png",
    expiredImage: "https://i.imgur.com/PMnCoiN.png",
    mapUrl: "https://i.imgur.com/kLxeQ3F.png",
    from: "Vídeň",
    to: "Salzburg",
    distance: "313 km"
  },
  {
    day: 13,
    activeImage: "https://i.imgur.com/mzJgMie.png",
    expiredImage: "https://i.imgur.com/aFX9ooX.png",
    mapUrl: "https://i.imgur.com/cgzzfdO.png",
    from: "Salzburg",
    to: "Zürich",
    distance: "534 km"
  },
  {
    day: 14,
    activeImage: "https://i.imgur.com/RSMQ3ks.png",
    expiredImage: "https://i.imgur.com/pU3qOrR.png",
    mapUrl: "https://i.imgur.com/34QOZIg.png",
    from: "Zürich",
    to: "Frankfurt",
    distance: "580 km"
  },
  {
    day: 15,
    activeImage: "https://i.imgur.com/KxdrtRw.png",
    expiredImage: "https://i.imgur.com/Gz3X9JY.png",
    mapUrl: "https://i.imgur.com/RFNNHrX.png",
    from: "Kodaň",
    to: "Duisburg",
    distance: "743 km"
  },
  {
    day: 16,
    activeImage: "https://i.imgur.com/Lc5WzMW.png",
    expiredImage: "https://i.imgur.com/A1KfHuP.png",
    mapUrl: "https://i.imgur.com/NVfE1Vf.png",
    from: "Duisburg",
    to: "Calais",
    distance: "375 km"
  },
  {
    day: 17,
    activeImage: "https://i.imgur.com/mEO6zLj.png",
    expiredImage: "https://i.imgur.com/q8uPN07.png",
    mapUrl: "https://i.imgur.com/SJTyKxc.png",
    from: "Calais",
    to: "Londýn",
    distance: "266 km"
  },
  {
    day: 18,
    activeImage: "https://i.imgur.com/OwsdAOn.png",
    expiredImage: "https://i.imgur.com/uB0FHye.png",
    mapUrl: "https://i.imgur.com/DR04Iu3.png",
    from: "Londýn",
    to: "Varšava",
    distance: "1618 km"
  },
  {
    day: 19,
    activeImage: "https://i.imgur.com/FwWkUYu.png",
    expiredImage: "https://i.imgur.com/ocyDw42.png",
    mapUrl: "https://i.imgur.com/xtcuyAG.jpeg",
    from: "Varšava",
    to: "Bratislava",
    distance: "374 km"
  },
  {
    day: 20,
    activeImage: "https://i.imgur.com/ze8qXT0.png",
    expiredImage: "https://i.imgur.com/9DDSvNw.png",
    mapUrl: "https://i.imgur.com/PCUVGpA.png",
    from: "Bratislava",
    to: "TruckersMP HQ",
    distance: "411 km"
  },
  {
    day: 21,
    activeImage: "https://i.imgur.com/ipFuQd0.png",
    expiredImage: "https://i.imgur.com/5UzWT4x.png",
    mapUrl: "https://i.imgur.com/CNihvFx.png",
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
  const color = 16731212; // adventní barva

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

  let s = String(raw).trim();

  // 1) Custom emoji typu <:flag_cz:1234567890> nebo <a:něco:123...>
  s = s.replace(/^<a?:[^>]+>\s*/, '');

  // 2) Textové emoji typu :flag_cz:
  s = s.replace(/^:[^:\s]+:\s*/, '');

  // 3) Zbytek – smaž cokoliv ne-písmeno na začátku (např. skutečný 🇨🇿 znak)
  s = s.replace(/^[^A-Za-zÀ-ž]+/, '');

  return s.trim();
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
  'strassburg': 'strasbourg',
  'štrasburk': 'strasbourg',

  // Kolín / Cologne / Köln
  'kolin': 'cologne',
  'kolín': 'cologne',
  'koln': 'cologne',
  'köln': 'cologne',
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
// + STATISTIKY (km, počet zakázek, trasy)
// ─────────────────────────────────────────────

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

function ensureStats(entry) {
  if (!entry.stats) {
    entry.stats = {
      totalJobs: 0,
      totalKm: 0,
      routes: {} // routeKey -> { jobs, totalKm }
    };
  }
}

// TB nick
function ensureTbEntry(tbName) {
  if (!tokens[tbName]) {
    tokens[tbName] = {
      tbName,
      discordId: null,
      silver: 0,
      gold: 0,
      stats: {
        totalJobs: 0,
        totalKm: 0,
        routes: {}
      }
    };
  } else {
    ensureStats(tokens[tbName]);
  }
  return tokens[tbName];
}

// 🔎 Najde existující TB záznam case-insensitive
function findExistingTbKey(tbNickInput) {
  if (!tbNickInput) return null;
  const target = tbNickInput.trim().toLowerCase();

  for (const key of Object.keys(tokens)) {
    if (key.trim().toLowerCase() === target) {
      return key;
    }
  }
  return null;
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

// sečte žetony a statistiky pro daný Discord účet
function getTokensForDiscordUser(discordId) {
  let totalSilver = 0;
  let totalGold = 0;
  let totalJobs = 0;
  let totalKm = 0;
  const details = [];

  for (const [tbName, data] of Object.entries(tokens)) {
    if (data.discordId === discordId) {
      totalSilver += data.silver;
      totalGold += data.gold;

      if (data.stats) {
        totalJobs += data.stats.totalJobs || 0;
        totalKm += data.stats.totalKm || 0;
      }

      details.push({
        tbName,
        silver: data.silver,
        gold: data.gold
      });
    }
  }

  return { totalSilver, totalGold, details, totalJobs, totalKm };
}

// najde oblíbenou trasu uživatele (podle počtu zakázek)
function getFavoriteRouteForDiscordUser(discordId) {
  let bestRoute = null;
  let bestJobs = 0;

  for (const [, data] of Object.entries(tokens)) {
    if (data.discordId !== discordId || !data.stats || !data.stats.routes) continue;

    for (const [routeKey, rStats] of Object.entries(data.stats.routes)) {
      const jobs = rStats.jobs || 0;
      if (jobs > bestJobs) {
        bestJobs = jobs;
        bestRoute = routeKey;
      }
    }
  }

  return { routeKey: bestRoute, jobs: bestJobs };
}

// statistika trasy pro TB nick
function buildRouteKey(from, to) {
  const a = normalizeCityName(from) || from;
  const b = normalizeCityName(to) || to;
  return `${a} -> ${b}`;
}

// ✨ Hezký formát názvu města a trasy pro výpis
function capitalizeCity(name) {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatRouteKey(key) {
  if (!key) return "";
  const [from, to] = key.split("->").map(p => p.trim());
  return `${capitalizeCity(from)} → ${capitalizeCity(to)}`;
}

// vytáhne km z embedu TB, pokud jsou k dispozici
function extractDistanceKmFromEmbed(embed) {
  if (!embed) return null;
  const fields = embed.fields || [];

  const distanceField = fields.find(f =>
    f.name &&
    typeof f.name === 'string' &&
    (
      f.name.toLowerCase().includes('uznaná vzdálenost') ||
      f.name.toLowerCase().includes('uznana vzdalenost') ||
      f.name.toLowerCase().includes('distance')
    )
  );

  const candidates = [];

  if (distanceField && distanceField.value) {
    candidates.push(String(distanceField.value));
  }
  if (embed.description) {
    candidates.push(String(embed.description));
  }

  for (const text of candidates) {
    const cleaned = text.replace(/\s+/g, ' ');
    const m = cleaned.match(/(\d[\d\s.,]*)\s*km/i);
    if (m) {
      const numStr = m[1].replace(/\s+/g, '').replace(',', '.');
      const km = Number(numStr);
      if (!Number.isNaN(km) && km >= 0) return km;
    }
  }

  return null;
}

// doplnění statistik pro jednu odměněnou zakázku
function recordJobStats(tbName, from, to, embed) {
  const entry = ensureTbEntry(tbName);
  const stats = entry.stats;
  const routeKey = buildRouteKey(from, to);

  let km = extractDistanceKmFromEmbed(embed);

  // fallback – zkusit vzdálenost z ROUTES (podle města)
  if (km == null) {
    const routeDef = ROUTES.find(r =>
      (cityMatches(from, r.from) && cityMatches(to, r.to)) ||
      (cityMatches(from, r.to) && cityMatches(to, r.from))
    );
    if (routeDef && routeDef.distance) {
      const m = String(routeDef.distance).match(/(\d[\d\s]*)/);
      if (m) {
        const numStr = m[1].replace(/\s+/g, '');
        const parsed = Number(numStr);
        if (!Number.isNaN(parsed)) km = parsed;
      }
    }
  }

  if (!Number.isFinite(km)) km = 0;

  stats.totalJobs += 1;
  stats.totalKm += km;

  if (!stats.routes[routeKey]) {
    stats.routes[routeKey] = {
      jobs: 0,
      totalKm: 0
    };
  }

  stats.routes[routeKey].jobs += 1;
  stats.routes[routeKey].totalKm += km;
}

// ─────────────────────────────────────────────
// AUTO-LINK TB nicku na Discord podle jména
// ─────────────────────────────────────────────

function normalizeNameForMatch(name) {
  if (!name) return '';
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

async function tryAutoLinkTbToDiscord(tbName) {
  if (!GUILD_ID) return;
  if (!tbName) return;

  const existingKey = findExistingTbKey(tbName);
  const key = existingKey || tbName;
  const entry = ensureTbEntry(key);

  if (entry.discordId) return; // už propojeno

  const targetNorm = normalizeNameForMatch(key);
  if (!targetNorm) return;

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    // načteme členy do cache (u menších guild ok)
    await guild.members.fetch();

    const matches = guild.members.cache.filter(member => {
      const displayNorm = normalizeNameForMatch(member.displayName);
      const userNorm = normalizeNameForMatch(member.user.username);
      return displayNorm === targetNorm || userNorm === targetNorm;
    });

    if (matches.size === 1) {
      const member = matches.first();
      entry.discordId = member.id;
      saveTokens(tokens);
      console.log(`🤝 AUTO-LINK: TB "${key}" automaticky propojen s ${member.user.tag} (${member.id})`);
      // kdyby měl už z historie 5+ goldů, přidáme roli
      await tryAssignGoldRoleForTb(key);
    } else if (matches.size > 1) {
      console.log(`AUTO-LINK: TB "${key}" má více možných shod (${matches.size}), nepropojuji automaticky.`);
    } else {
      console.log(`AUTO-LINK: TB "${key}" – nenašel jsem shodu na Discordu.`);
    }
  } catch (err) {
    console.warn(`AUTO-LINK: chyba při vyhledávání uživatele pro TB "${tbName}":`, err.message);
  }
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
// PROCESSED – zprávy, které už dostaly odměnu
// ─────────────────────────────────────────────
function loadProcessedMessages() {
  try {
    if (!fs.existsSync(PROCESSED_PATH)) return {};
    return JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf8'));
  } catch (err) {
    console.error('Chyba při čtení processed.json:', err);
    return {};
  }
}

function saveProcessedMessages(map) {
  try {
    fs.writeFileSync(PROCESSED_PATH, JSON.stringify(map, null, 2), 'utf8');
  } catch (err) {
    console.error('Chyba při zápisu processed.json:', err);
  }
}

let processedMessages = loadProcessedMessages();

function isMessageAlreadyProcessed(messageId) {
  return !!processedMessages[messageId];
}

function markMessageProcessed(messageId) {
  processedMessages[messageId] = true;
  saveProcessedMessages(processedMessages);
}

// ─────────────────────────────────────────────
// DISCORD BOT – setup
// ─────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
    // GatewayIntentBits.MessageContent
  ]
});

// helper: přidá členovi roli za 5+ zlatých žetonů
async function tryAssignGoldRoleForTb(tbName) {
  const entry = tokens[tbName];
  if (!entry) return;
  if (entry.gold < 5) return;         // potřebujeme alespoň 5 zlatých
  if (!entry.discordId) return;       // není propojený Discord
  if (!GUILD_ID) return;
  if (!GOLD_ROLE_ID) return;

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(entry.discordId);
    if (!member.roles.cache.has(GOLD_ROLE_ID)) {
      await member.roles.add(
        GOLD_ROLE_ID,
        'Získáno alespoň 5 zlatých žetonů v adventním kalendáři'
      );
      console.log(`🎖 Přidávám roli GOLD uživateli ${entry.discordId} (TB ${tbName})`);
    }
  } catch (err) {
    console.warn(`Nemohu přidat roli GOLD pro TB ${tbName}:`, err.message);
  }
}

let config = loadConfig() || { channelId: null, lastPublishedDay: 0, messages: {} };

// ─────────────────────────────────────────────
// Slash commandy – definice
// ─────────────────────────────────────────────
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
    .setDescription("Zobrazí žebříček řidičů – žetony, kilometry nebo počet zakázek.")
    .addIntegerOption(o =>
      o
        .setName("strana")
        .setDescription("Číslo strany (1 = top 1–10, 2 = 11–20, ...)")
        .setRequired(false)
        .setMinValue(1)
    )
    .addStringOption(o =>
      o
        .setName("typ")
        .setDescription("Typ žebříčku")
        .addChoices(
          { name: "Žetony (body)", value: "tokens" },
          { name: "Kilometry", value: "km" },
          { name: "Počet zakázek", value: "jobs" }
        )
        .setRequired(false)
    ),
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
    .setName("unlink")
    .setDescription("ADMIN: odstraní propojení TB nicku s Discord účtem.")
    .addStringOption(o =>
      o
        .setName("tb_nick")
        .setDescription("TB nickname, který chceš odpojit")
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
    .setDescription("ADMIN: projde historii zakázek od začátku eventu a doplní chybějící žetony.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("fullanalyze")
    .setDescription("ADMIN: kompletně přepočítá žetony a statistiky od začátku eventu (RESET!).")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("admin-dump")
    .setDescription("Exportuje tokens.json se žetony (jen admin).")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("addpoints")
    .setDescription("ADMIN: ručně přidá body (žetony) uživateli.")
    .addUserOption(o =>
      o
        .setName("uzivatel")
        .setDescription("Discord uživatel, kterému chceš přidat body")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o
        .setName("body")
        .setDescription("Kolik bodů přidat (1🥇 = 3 body, 1🥈 = 1 bod)")
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(o =>
      o
        .setName("tb_nick")
        .setDescription("Volitelné: konkrétní TB nick, na který body připíšu")
        .setRequired(false)
    )
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
    // nechávám všechny znaky, jen ořežu mezery
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
      return v;
    }
  }

  return null;
}

// ─────────────────────────────────────────────
// Funkce pro analýzu historie zakázek (inkrementální)
// ─────────────────────────────────────────────
async function analyzeJobs() {
  if (!JOBS_CHANNEL_ID) {
    throw new Error("Není nastaven JOBS_CHANNEL_ID, nemohu analyzovat historii.");
  }

  const channel = await client.channels.fetch(JOBS_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) {
    throw new Error("Kanál zakázek není textový nebo neexistuje.");
  }

  let lastId = null;
  let scanned = 0;
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
      // pokud je zpráva starší než začátek eventu, končíme
      if (message.createdTimestamp < EVENT_START) {
        stop = true;
        break;
      }

      scanned++;

      // už zpracovaná – přeskoč
      if (isMessageAlreadyProcessed(message.id)) {
        continue;
      }

      if (!message.embeds || message.embeds.length === 0) {
        console.log(`[ANALYZE] ${message.id}: žádný embed`);
        continue;
      }
      const embed = message.embeds[0];
      if (!embed.fields || embed.fields.length === 0) {
        console.log(`[ANALYZE] ${message.id}: embed bez fields`);
        continue;
      }

      const fromField = embed.fields.find(f => f.name && f.name.toLowerCase().includes('odkud'));
      const toField   = embed.fields.find(f => f.name && f.name.toLowerCase().includes('kam'));
      if (!fromField || !toField) {
        console.log(`[ANALYZE] ${message.id}: nenašel jsem pole Odkud/Kam`);
        continue;
      }

      const from = normalizeLocation(fromField.value);
      const to   = normalizeLocation(toField.value);

      // pojistka na čas – vezmi createdTimestamp, případně fallback
      let ts = message.createdTimestamp || (message.createdAt ? message.createdAt.getTime() : null);
      if (!ts) ts = Date.now();

      console.log(
        `[ANALYZE] ${message.id}: rawFrom="${fromField.value}" rawTo="${toField.value}" => from="${from}" to="${to}" ts=${new Date(ts).toISOString()}`
      );

      const reward = REWARDS.find(r =>
        (
          (cityMatches(from, r.from) && cityMatches(to, r.to)) ||
          (cityMatches(from, r.to) && cityMatches(to, r.from))
        ) &&
        ts >= r.start &&
        ts < r.end
      );

      if (!reward) {
        console.log(`[ANALYZE] ${message.id}: žádná shoda v REWARDS`);
        continue;
      }

      const tbName = extractTbNameFromEmbed(embed);
      if (!tbName) {
        console.log(`[ANALYZE] ${message.id}: nenašel jsem TB nick`);
        continue;
      }

      console.log(
        `[ANALYZE] ${message.id}: ODMĚŇUJI tbName="${tbName}" route="${reward.from} ↔ ${reward.to}" silver=${reward.silver}, gold=${reward.gold}`
      );

      // statistika jízdy (jobs/km)
      recordJobStats(tbName, from, to, embed);

      // auto-link podle jména
      await tryAutoLinkTbToDiscord(tbName);

      // žetony
      addTokens(tbName, reward.silver, reward.gold);
      await tryAssignGoldRoleForTb(tbName);

      markMessageProcessed(message.id);
      rewarded++;
    }

    lastId = messages[messages.length - 1].id;
  }

  return { scanned, rewarded };
}

// ─────────────────────────────────────────────
// FULL ANALÝZA – kompletní reset a přepočet
// ─────────────────────────────────────────────
async function fullAnalyzeJobs() {
  if (!JOBS_CHANNEL_ID) {
    throw new Error("Není nastaven JOBS_CHANNEL_ID, nemohu analyzovat historii.");
  }

  const channel = await client.channels.fetch(JOBS_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) {
    throw new Error("Kanál zakázek není textový nebo neexistuje.");
  }

  // ⚠️ RESET – smažu všechny žetony i processed zprávy
  tokens = {};
  saveTokens(tokens);
  processedMessages = {};
  saveProcessedMessages(processedMessages);

  let lastId = null;
  let scanned = 0;
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
      // pokud je zpráva starší než začátek eventu, končíme
      if (message.createdTimestamp < EVENT_START) {
        stop = true;
        break;
      }

      scanned++;

      if (!message.embeds || message.embeds.length === 0) {
        continue;
      }
      const embed = message.embeds[0];
      if (!embed.fields || embed.fields.length === 0) {
        continue;
      }

      const fromField = embed.fields.find(f => f.name && f.name.toLowerCase().includes('odkud'));
      const toField   = embed.fields.find(f => f.name && f.name.toLowerCase().includes('kam'));
      if (!fromField || !toField) {
        continue;
      }

      const from = normalizeLocation(fromField.value);
      const to   = normalizeLocation(toField.value);

      // pojistka na čas
      let ts = message.createdTimestamp || (message.createdAt ? message.createdAt.getTime() : null);
      if (!ts) ts = Date.now();

      const reward = REWARDS.find(r =>
        (
          (cityMatches(from, r.from) && cityMatches(to, r.to)) ||
          (cityMatches(from, r.to) && cityMatches(to, r.from))
        ) &&
        ts >= r.start &&
        ts < r.end
      );

      if (!reward) {
        continue;
      }

      const tbName = extractTbNameFromEmbed(embed);
      if (!tbName) {
        continue;
      }

      // statistiky (jobs/km)
      recordJobStats(tbName, from, to, embed);
      // auto-link dle jména
      await tryAutoLinkTbToDiscord(tbName);
      // žetony
      addTokens(tbName, reward.silver, reward.gold);
      await tryAssignGoldRoleForTb(tbName);

      markMessageProcessed(message.id);
      rewarded++;
    }

    lastId = messages[messages.length - 1].id;
  }

  return { scanned, rewarded };
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
    const { totalSilver, totalGold, details, totalJobs, totalKm } = getTokensForDiscordUser(interaction.user.id);

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

    const { routeKey, jobs } = getFavoriteRouteForDiscordUser(interaction.user.id);

    let statsText = "";
    statsText += `🚚 Zakázky v eventu: **${totalJobs}**\n`;
    statsText += `🧭 Ujeté kilometry: **${totalKm} km**\n`;
    if (routeKey && jobs > 0) {
      statsText += `⭐ Nejčastější trasa: **${formatRouteKey(routeKey)}** (**${jobs}×**)\n`;
    }

    await interaction.reply({
      content: `📣 ${interaction.user}, tady je tvůj aktuální stav žetonů:`,
      embeds: [
        {
          title: "💰 Stav žetonů",
          description:
            `🥇 Zlaté: **${totalGold}**\n` +
            `🥈 Stříbrné: **${totalSilver}**\n` +
            `📊 Body: **${score}** (1🥇 = 3 body, 1🥈 = 1 bod)\n\n` +
            statsText +
            `\n` +
            (lines.length ? `Rozpis podle TB nicků:\n${lines.join('\n')}` : ""),
          color: BRAND_COLOR
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
    const page = interaction.options.getInteger("strana") ?? 1;
    const type = interaction.options.getString("typ") ?? "tokens";

    if (page < 1) {
      await interaction.reply({
        content: "❌ Číslo strany musí být minimálně 1.",
        ephemeral: true
      });
      return;
    }

    const entries = Object.entries(tokens);
    if (entries.length === 0) {
      await interaction.reply({
        content: `📉 Zatím nikdo nezískal žádné žetony.`
      });
      return;
    }

    const sorted = entries.sort(([, a], [, b]) => {
      let metricA = 0;
      let metricB = 0;

      if (type === "km") {
        metricA = (a.stats && a.stats.totalKm) || 0;
        metricB = (b.stats && b.stats.totalKm) || 0;
      } else if (type === "jobs") {
        metricA = (a.stats && a.stats.totalJobs) || 0;
        metricB = (b.stats && b.stats.totalJobs) || 0;
      } else {
        // tokens (body)
        const scoreA = getUserScore(a);
        const scoreB = getUserScore(b);
        if (scoreB !== scoreA) return scoreB - scoreA;
        if (b.gold !== a.gold) return b.gold - a.gold;
        return b.silver - a.silver;
      }

      // km / jobs – čisté porovnání, při shodě fallback na tokeny
      if (metricB !== metricA) return metricB - metricA;
      const scoreA = getUserScore(a);
      const scoreB = getUserScore(b);
      return scoreB - scoreA;
    });

    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

    if (page > totalPages) {
      await interaction.reply({
        content: `❌ Maximální dostupná strana je **${totalPages}**.`,
        ephemeral: true
      });
      return;
    }

    const startIndex = (page - 1) * pageSize;
    const top = sorted.slice(startIndex, startIndex + pageSize);

    const lines = [];
    for (let i = 0; i < top.length; i++) {
      const [tbName, data] = top[i];

      const label = data.discordId ? `<@${data.discordId}>` : tbName;

      if (type === "km") {
        const km = (data.stats && data.stats.totalKm) || 0;
        lines.push(
          `**${startIndex + i + 1}.** ${label} — 🧭 **${km} km**`
        );
      } else if (type === "jobs") {
        const jobs = (data.stats && data.stats.totalJobs) || 0;
        lines.push(
          `**${startIndex + i + 1}.** ${label} — 🚚 **${jobs} zakázek**`
        );
      } else {
        const score = getUserScore(data);
        lines.push(
          `**${startIndex + i + 1}.** ${label} — 🥇 **${data.gold}** | 🥈 **${data.silver}** (📊 **${score}** bodů)`
        );
      }
    }

    let title = "🏆 Žebříček řidičů podle žetonů";
    if (type === "km") title = "🏆 Žebříček řidičů podle kilometrů";
    if (type === "jobs") title = "🏆 Žebříček řidičů podle počtu zakázek";

    await interaction.reply({
      content: `🏁 Žebříček vyžádal: ${interaction.user}`,
      embeds: [
        {
          title,
          description: lines.join("\n"),
          footer: {
            text: `Strana ${page} / ${totalPages} (zobrazuji ${pageSize} na stránku)`
          },
          color: BRAND_COLOR
        }
      ]
    });
    return;
  }

  if (interaction.commandName === "link") {
    const tbNickRaw = interaction.options.getString("tb_nick");
    const tbNick = tbNickRaw.trim();

    const existingKey = findExistingTbKey(tbNick);
    const keyToUse = existingKey || tbNick;

    const entry = ensureTbEntry(keyToUse);

    // TB nick už je propojený s jiným Discord účtem
    if (entry.discordId && entry.discordId !== interaction.user.id) {
      await interaction.reply({
        content: `⛔ TB nick **${keyToUse}** je už propojený s jiným Discord účtem.\n` +
                 `Pokud je to chyba, kontaktuj prosím administrátora.`,
        ephemeral: true
      });
      return;
    }

    entry.discordId = interaction.user.id;
    saveTokens(tokens);

    // pokud už má 5+ zlatých, přidej roli
    await tryAssignGoldRoleForTb(keyToUse);

    await interaction.reply({
      content: `✅ Propojil jsem tvůj Discord účet ${interaction.user} s TB nickem **${keyToUse}**.\nVšechny žetony pod tímto TB nickem se ti nyní počítají do příkazu /zetony.`,
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

    const existingKey = findExistingTbKey(tbNick);
    const keyToUse = existingKey || tbNick;

    const entry = ensureTbEntry(keyToUse);

    if (entry.discordId && entry.discordId !== user.id) {
      console.log(
        `ADMIN-LINK: TB ${keyToUse} se přepojuje z Discord ID ${entry.discordId} na ${user.id}`
      );
    }

    entry.discordId = user.id;
    saveTokens(tokens);

    // i tady – kdyby už měl 5+ goldů z historie
    await tryAssignGoldRoleForTb(keyToUse);

    await interaction.reply({
      content: `✅ Propojil jsem uživatele ${user} s TB nickem **${keyToUse}**.`
    });
    return;
  }

  if (interaction.commandName === "unlink") {
    if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "⛔ Tento příkaz je jen pro administrátory.",
        ephemeral: true
      });
      return;
    }

    const tbNickRaw = interaction.options.getString("tb_nick");
    const tbNick = tbNickRaw.trim();

    const existingKey = findExistingTbKey(tbNick);
    if (!existingKey) {
      await interaction.reply({
        content: `❌ TB nick **${tbNick}** v evidenci žetonů vůbec neexistuje.`,
        ephemeral: true
      });
      return;
    }

    const entry = ensureTbEntry(existingKey);
    if (!entry.discordId) {
      await interaction.reply({
        content: `ℹ️ TB nick **${existingKey}** aktuálně není propojený s žádným Discord účtem.`,
        ephemeral: true
      });
      return;
    }

    const oldDiscordId = entry.discordId;
    entry.discordId = null;
    saveTokens(tokens);

    await interaction.reply({
      content: `✅ Zrušil jsem propojení TB nicku **${existingKey}** s Discord účtem <@${oldDiscordId}>.`,
      ephemeral: true
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
      content: "🔍 Začínám analyzovat historii zakázek od začátku eventu. Žetony zůstanou zachované, jen doplním chybějící.",
      ephemeral: true
    });

    try {
      const { scanned, rewarded } = await analyzeJobs();

      await interaction.followUp({
        content: `✅ Analýza dokončena.\n` +
                 `Prohlédnuto zpráv: **${scanned}**\n` +
                 `Nově přiděleno odměn: **${rewarded}**.`,
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

  if (interaction.commandName === "fullanalyze") {
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
      content:
        "⚠️ Spouštím **FULL** analýzu zakázek od začátku eventu.\n" +
        "Všechny žetony a statistiky budou přepočítány od nuly podle historie v kanálu zakázek.",
      ephemeral: true
    });

    try {
      const { scanned, rewarded } = await fullAnalyzeJobs();

      await interaction.followUp({
        content:
          `✅ Full analýza dokončena.\n` +
          `Prohlédnuto zpráv: **${scanned}**\n` +
          `Přiděleno odměn: **${rewarded}**.\n` +
          `Všechny žetony, kilometry a počty zakázek byly spočítány znovu.`,
        ephemeral: true
      });
    } catch (err) {
      console.error("Chyba při full analýze historie:", err);
      await interaction.followUp({
        content: "❌ Při full analýze došlo k chybě. Zkontroluj logy na hostingu.",
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

  if (interaction.commandName === "addpoints") {
    if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "⛔ Tento příkaz je jen pro administrátory.",
        ephemeral: true
      });
      return;
    }

    const user = interaction.options.getUser("uzivatel");
    const points = interaction.options.getInteger("body");
    const tbNickRaw = interaction.options.getString("tb_nick");

    let tbNameToUse = null;

    if (tbNickRaw) {
      const tbNick = tbNickRaw.trim();
      const existingKey = findExistingTbKey(tbNick);
      tbNameToUse = existingKey || tbNick;

      const entry = ensureTbEntry(tbNameToUse);
      // přepojení TB nicku na daného uživatele
      entry.discordId = user.id;
      saveTokens(tokens);
    } else {
      // najdi TB nick podle propojeného Discord účtu
      const match = Object.entries(tokens).find(([, data]) => data.discordId === user.id);
      if (!match) {
        await interaction.reply({
          content: `❌ Uživatel ${user} nemá žádný propojený TB nick.\nPoužij prosím nejdřív /link nebo zadej parametr **tb_nick**.`,
          ephemeral: true
        });
        return;
      }
      tbNameToUse = match[0];
    }

    const addGold = Math.floor(points / 3);
    const addSilver = points % 3;

    addTokens(tbNameToUse, addSilver, addGold);
    await tryAssignGoldRoleForTb(tbNameToUse);

    await interaction.reply({
      content:
        `✅ Přidal jsem uživateli ${user} celkem **${points} bodů** ` +
        `(➕ 🥇 **${addGold}**, ➕ 🥈 **${addSilver}**) ` +
        `na TB nick **${tbNameToUse}**.\n` +
        `Body se promítají do žebříčku stejně jako žetony (1🥇 = 3 body, 1🥈 = 1 bod).`,
      ephemeral: false
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

  // už zpracovaná zpráva – neodměňovat znovu
  if (isMessageAlreadyProcessed(message.id)) {
    console.log(`[LIVE] ${message.id}: zpráva už byla dříve zpracovaná, přeskočeno.`);
    return;
  }

  const embed = message.embeds[0];
  if (!embed.fields) return;

  const fromField = embed.fields.find(f => f.name && f.name.toLowerCase().includes('odkud'));
  const toField   = embed.fields.find(f => f.name && f.name.toLowerCase().includes('kam'));
  if (!fromField || !toField) return;

  const from = normalizeLocation(fromField.value);
  const to   = normalizeLocation(toField.value);

  // pojistka na čas
  let ts = message.createdTimestamp || (message.createdAt ? message.createdAt.getTime() : null);
  if (!ts) ts = Date.now();

  console.log(
    `[LIVE] ${message.id}: rawFrom="${fromField.value}" rawTo="${toField.value}" => from="${from}" to="${to}" ts=${new Date(ts).toISOString()}`
  );

  const reward = REWARDS.find(r =>
    (
      (cityMatches(from, r.from) && cityMatches(to, r.to)) ||
      (cityMatches(from, r.to) && cityMatches(to, r.from))
    ) &&
    ts >= r.start &&
    ts < r.end
  );

  if (!reward) {
    console.log(`[LIVE] ${message.id}: žádná shoda v REWARDS`);
    return;
  }

  const tbName = extractTbNameFromEmbed(embed);
  if (!tbName) {
    console.log(`[LIVE] ${message.id}: nenašel jsem TB nickname v embedu, odměna nepřipsána.`);
    return;
  }

  // Statistika jízdy (jobs/km)
  recordJobStats(tbName, from, to, embed);

  // Auto-link TB nicku na Discord, pokud to jde jednoznačně
  await tryAutoLinkTbToDiscord(tbName);

  // Žetony
  addTokens(tbName, reward.silver, reward.gold);
  await tryAssignGoldRoleForTb(tbName);
  markMessageProcessed(message.id);

  console.log(
    `[LIVE] ${message.id}: Žetony: ${tbName} +${reward.silver}🥈 +${reward.gold}🥇 za trasu ${from} ↔ ${to}`
  );
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
  console.log(`Používám JOBS_CHANNEL_ID = ${JOBS_CHANNEL_ID}`);

  // Adventní kalendář
  autoUpdate().catch(console.error);
  setInterval(() => autoUpdate().catch(console.error), 60 * 1000);

  // Automatická reanalýza každých 10 minut (inkrementální)
  setInterval(async () => {
    try {
      console.log('[AUTO-ANALYZE] Spouštím automatickou reanalýzu zakázek...');
      const { scanned, rewarded } = await analyzeJobs();
      console.log(`[AUTO-ANALYZE] Hotovo. Prohlédnuto ${scanned} zpráv, nových odměn: ${rewarded}.`);
    } catch (err) {
      console.error('[AUTO-ANALYZE] Chyba:', err);
    }
  }, 10 * 60 * 1000);
});

registerCommands();
client.login(TOKEN);
