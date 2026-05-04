import 'dotenv/config';
import {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─────────────────────────────────────────────
// CESTY A KONFIGURACE
// ─────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, 'witch_config.json');
const ORBS_PATH = path.join(__dirname, 'witch_orbs.json');
const PROCESSED_PATH = path.join(__dirname, 'processed_witch.json');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// KANÁLY
const JOBS_CHANNEL_ID = process.env.JOBS_CHANNEL_ID || '1149900706543833208';
const NOTIFY_CHANNEL_ID = '1445219033833144443'; // Spam kanál (Zakázky, Havrani, Mistři)

const BRAND_COLOR = 0x8A2BE2;
const LOGO_URL = "https://i.imgur.com/fdvSTG2.png"; 

if (!TOKEN) throw new Error('❌ DISCORD_TOKEN chybí.');

// ROLE IDs
const ROLE_EVENT_HAUL = '1500670438630756464'; // Mistr Čaroděj
const ROLE_BLACK_MAGIC = '1500670224461074492'; // Pán Stínů (Varianta A)
const ROLE_WHITE_MAGIC = '1500670331063505066'; // Bílý Mág (Varianta B)

// ČASOVÁNÍ EVENTU (Nastaveno na 18:00 SELČ -> 16:00 UTC)
const YEAR = 2026;
const START_HOUR_UTC = 16; 
const START_MINUTE_UTC = 0;
const EVENT_START = Date.UTC(YEAR, 4, 4, START_HOUR_UTC, START_MINUTE_UTC, 0); 

const getWindow = (dayNum) => ({
  start: Date.UTC(YEAR, 4, dayNum, START_HOUR_UTC, START_MINUTE_UTC, 0),
  end:   Date.UTC(YEAR, 4, dayNum + 1, START_HOUR_UTC, START_MINUTE_UTC, 0)
});

// ─────────────────────────────────────────────
// TRASY 
// ─────────────────────────────────────────────
const ROUTES = [
  { day: 1, variant: 'A', from: "Kiel", to: "Erfurt", dist: 459, activeImage: "https://i.imgur.com/V6nPBA0.png", mapUrl: "https://i.imgur.com/V6nPBA0.png", ...getWindow(4) },
  { day: 1, variant: 'B', from: "Brusel", to: "Erfurt", dist: 459, activeImage: "https://i.imgur.com/Wrjmm39.png", mapUrl: "https://i.imgur.com/Wrjmm39.png", ...getWindow(4) },
  { day: 2, variant: 'A', from: "Praha", to: "Hannover", dist: 530, activeImage: "https://i.imgur.com/hzZv8xf.png", mapUrl: "https://i.imgur.com/hzZv8xf.png", ...getWindow(5) },
  { day: 2, variant: 'B', from: "Groningen", to: "Hannover", dist: 347, activeImage: "https://i.imgur.com/ag15MhP.png", mapUrl: "https://i.imgur.com/ag15MhP.png", ...getWindow(5) },
  { day: 3, variant: 'A', from: "Groningen", to: "Kassel", dist: 385, activeImage: "https://i.imgur.com/WmhUy5g.png", mapUrl: "https://i.imgur.com/WmhUy5g.png", ...getWindow(6) },
  { day: 3, variant: 'B', from: "Stetin", to: "Kassel", dist: 520, activeImage: "https://i.imgur.com/1R6dCAa.png", mapUrl: "https://i.imgur.com/1R6dCAa.png", ...getWindow(6) },
  { day: 4, variant: 'A', from: "Brusel", to: "Hannover", dist: 257, activeImage: "https://i.imgur.com/SydOWKW.png", mapUrl: "https://i.imgur.com/SydOWKW.png", ...getWindow(7) },
  { day: 4, variant: 'B', from: "Kiel", to: "Hannover", dist: 257, activeImage: "https://i.imgur.com/6sazkud.png", mapUrl: "https://i.imgur.com/6sazkud.png", ...getWindow(7) },
  { day: 5, variant: 'A', from: "Praha", to: "Erfurt", dist: 340, activeImage: "https://i.imgur.com/wAMChxt.png", mapUrl: "https://i.imgur.com/wAMChxt.png", ...getWindow(8) },
  { day: 5, variant: 'B', from: "Stetin", to: "Erfurt", dist: 444, activeImage: "https://i.imgur.com/Mk1G9CK.png", mapUrl: "https://i.imgur.com/Mk1G9CK.png", ...getWindow(8) },
  { day: 6, variant: 'A', from: "Praha", to: "Kassel", dist: 445, activeImage: "https://i.imgur.com/g5BRiak.png", mapUrl: "https://i.imgur.com/g5BRiak.png", ...getWindow(9) },
  { day: 6, variant: 'B', from: "Kiel", to: "Kassel", dist: 381, activeImage: "https://i.imgur.com/WwBHxbu.png", mapUrl: "https://i.imgur.com/WwBHxbu.png", ...getWindow(9) }
];

const CITY_SYNONYMS = {
  'praha': 'praha', 'prague': 'praha', 'prag': 'praha',
  'kiel': 'kiel', 'erfurt': 'erfurt',
  'brusel': 'brusel', 'brussels': 'brusel', 'brussel': 'brusel',
  'hannover': 'hannover', 'hanover': 'hannover',
  'groningen': 'groningen', 'kassel': 'kassel',
  'stetin': 'stetin', 'stettin': 'stetin', 'szczecin': 'stetin'
};

function normalize(text) {
  if (!text || typeof text !== 'string') return '';
  const base = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  for (const [key, val] of Object.entries(CITY_SYNONYMS)) { if (base.includes(key)) return val; }
  return base;
}

// ─────────────────────────────────────────────
// DATABÁZE
// ─────────────────────────────────────────────
let orbsData = fs.existsSync(ORBS_PATH) ? JSON.parse(fs.readFileSync(ORBS_PATH, 'utf8')) : {};
let config = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) : { 
  channelId: null, lastPublishedDay: 0, messages: {}, 
  dailyMasters: { 1:{}, 2:{}, 3:{}, 4:{}, 5:{}, 6:{} }, 
  bloodMoon: { activeUntil: 0, announced: false, msgId: null },
  eventEndedAnnounced: false
};
let processed = fs.existsSync(PROCESSED_PATH) ? JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf8')) : {};

const saveAll = () => {
  fs.writeFileSync(ORBS_PATH, JSON.stringify(orbsData, null, 2));
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  fs.writeFileSync(PROCESSED_PATH, JSON.stringify(processed, null, 2));
};

async function tryAssignRole(memberId, roleId, reason) {
  if (!GUILD_ID || !memberId || !roleId) return;
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(memberId);
    if (!member.roles.cache.has(roleId)) await member.roles.add(roleId, reason);
  } catch (e) { console.error(`Chyba při přiřazování role ${roleId}:`, e.message); }
}

async function tryAutoLink(tbName) {
  if (!GUILD_ID || !tbName) return;
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();
    const target = tbName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = guild.members.cache.find(m => m.displayName.toLowerCase().replace(/[^a-z0-9]/g, '').includes(target) || m.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').includes(target));
    if (match && target.length >= 3) {
      orbsData[tbName].discordId = match.id;
      saveAll();
    }
  } catch (e) { console.error(`Chyba při auto-linku:`, e.message); }
}

// ─────────────────────────────────────────────
// ZPRACOVÁNÍ ZAKÁZKY & MECHANIKY
// ─────────────────────────────────────────────
async function processJob(tbName, fromRaw, toRaw, msgId, ts = Date.now(), isAnalysis = false) {
  if (processed[msgId]) return 0;
  
  const from = normalize(fromRaw);
  const to = normalize(toRaw);
  
  const activeRoutes = ROUTES.filter(r => ts >= r.start && ts < r.end);
  const route = activeRoutes.find(r => from === normalize(r.from) && to === normalize(r.to));
  if (!route) return 0;

  if (!orbsData[tbName]) {
    orbsData[tbName] = { 
      tbName, discordId: null, completedDays: [], totalOrbs: 0, totalKm: 0, totalJobs: 0, 
      bonusClaimed: false, routes: {}, lastVariant: null, 
      stolenOrbs: 0, cursedCount: 0, quests: {},
      inventory: { talisman: 0, doublePotionUntil: 0, labUpgrade: false } 
    };
  }
  const user = orbsData[tbName];
  
  if (!user.inventory) user.inventory = { talisman: 0, doublePotionUntil: 0, labUpgrade: false };
  if (!user.quests) user.quests = {};
  if (user.inventory.labUpgrade === undefined) user.inventory.labUpgrade = false;
  if (user.stolenOrbs === undefined) user.stolenOrbs = 0;
  if (user.cursedCount === undefined) user.cursedCount = 0;

  if (!user.discordId && !isAnalysis) await tryAutoLink(tbName);
  
  user.totalJobs += 1;
  user.totalKm += route.dist;
  
  const routeKey = `${route.from} → ${route.to} (${route.variant})`;
  user.routes[routeKey] = (user.routes[routeKey] || 0) + 1;

  let earned = 1;
  let eventMessages = [];

  // ALCHYMIE (Kombo)
  if (user.lastVariant && user.lastVariant !== route.variant) {
    earned += 2; 
    eventMessages.push("🧪 *Namíchal jsi alchymistický lektvar (+2 Orby za střídání)!*");
  }
  user.lastVariant = route.variant;

  // LABORATOŘ
  if (user.inventory.labUpgrade) earned += 1;

  // MYTICKÝ ORB (1% Jackpot) a BĚŽNÝ BONUS
  const rand = Math.random() * 100;
  if (rand <= 1) {
    earned += 5;
    eventMessages.push(`✨ **Hráč ${tbName}, obdržel bonus v podobě mytického orbu v hodnotě 5 orbů navíc.**`);
  } else if (rand <= 11) {
    earned += 1; 
  }

  // POUSTEVNÍK (2% šance)
  if (Math.random() * 100 <= 2) {
    earned += 5;
    eventMessages.push("🧙‍♂️ *Na odpočívadle jsi potkal potulného poustevníka, který ti za tvou ochotu dal 5 orbů.*");
  }

  // DENNÍ ÚKOLY (Questy s vyšší obtížností)
  const currentDay = route.day;
  if (!user.quests[currentDay]) {
    const questPool = [
      { type: 'jobs', target: 4, reward: 5, desc: "Odevzdej dnes 4 zakázky" },
      { type: 'jobs', target: 7, reward: 10, desc: "Odevzdej dnes 7 zakázek" },
      { type: 'jobs', target: 12, reward: 20, desc: "Odevzdej dnes 12 zakázek" },
      { type: 'km', target: 1500, reward: 5, desc: "Ujeď dnes alespoň 1 500 km z eventových tras" },
      { type: 'km', target: 3000, reward: 10, desc: "Ujeď dnes alespoň 3 000 km z eventových tras" },
      { type: 'km', target: 5000, reward: 20, desc: "Ujeď dnes alespoň 5 000 km z eventových tras" }
    ];
    user.quests[currentDay] = { ...questPool[Math.floor(Math.random() * questPool.length)], progress: 0, completed: false };
  }

  // PROKLETÍ NÁKLADU (15% šance)
  let isCursed = Math.random() < 0.15;
  if (isCursed) {
    if (user.inventory.talisman > 0) {
      user.inventory.talisman -= 1;
      eventMessages.push("🛡️ *Čarodějnice se tě pokusila okrást, ale Talisman Ochrany magii odrazil!*");
      isCursed = false; 
    } else {
      earned = 0;
      user.cursedCount += 1;
      eventMessages.push("💀 *Tvůj náklad byl proklet čarodějnicí. Nezískáváš žádné orby!*");
    }
  }

  // ZPRACOVÁNÍ POSTUPU ÚKOLU
  const q = user.quests[currentDay];
  if (!q.completed && !isCursed) { 
    if (q.type === 'jobs') q.progress += 1;
    if (q.type === 'km') q.progress += route.dist;

    if (q.progress >= q.target) {
      q.completed = true;
      earned += q.reward;
      eventMessages.push(`📜 **Denní úkol splněn!** Získáváš bonusových ${q.reward} orbů za dokončení svého questu!`);
    }
  }

  // MULTIPLIKÁTORY
  if (earned > 0) {
    let multiplier = 1;
    if (config.bloodMoon.activeUntil > ts) multiplier *= 2;
    if (user.inventory.doublePotionUntil > ts) multiplier *= 2;
    earned *= multiplier;
  }

  user.totalOrbs += earned;

  // DENNÍ MISTŘI (Odeslání do SPAM kanálu)
  if (!isAnalysis && user.discordId) {
    if (!config.dailyMasters[route.day][route.variant]) {
      config.dailyMasters[route.day][route.variant] = user.discordId;
      const roleId = route.variant === 'A' ? ROLE_BLACK_MAGIC : ROLE_WHITE_MAGIC;
      const title = route.variant === 'A' ? "Pánem Stínů" : "Bílým Mágem";
      
      try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const currentRoleHolders = guild.members.cache.filter(m => m.roles.cache.has(roleId));
        for (const [id, member] of currentRoleHolders) await member.roles.remove(roleId);
        await tryAssignRole(user.discordId, roleId, `${title} pro den ${route.day}`);
        
        if (NOTIFY_CHANNEL_ID) {
          const ch = await client.channels.fetch(NOTIFY_CHANNEL_ID).catch(()=>null);
          if (ch) await ch.send(`🔮 **Prvním ${title} dne #${route.day}** se stává <@${user.discordId}>! 🏆`);
        }
      } catch(e) { console.error(e); }
    }
  }

  if (!user.completedDays.includes(route.day) && earned > 0) {
    user.completedDays.push(route.day);
  }

  if (user.completedDays.length >= 6 && !user.bonusClaimed) {
    user.totalOrbs += 10; 
    user.bonusClaimed = true;
    if (user.discordId) await tryAssignRole(user.discordId, ROLE_EVENT_HAUL, "Splněno 6 etap");
  }

  processed[msgId] = true;
  saveAll();

  // NOTIFIKACE O ZAKÁZCE DO SPAM KANÁLU S PINGEM
  if (!isAnalysis && user.discordId && NOTIFY_CHANNEL_ID) {
    const ch = await client.channels.fetch(NOTIFY_CHANNEL_ID).catch(()=>null);
    if (ch && (eventMessages.length > 0 || earned >= 0)) { 
       const extraText = eventMessages.length > 0 ? `\n\n${eventMessages.join("\n")}` : "";
       ch.send(`<@${user.discordId}> odevzdal zakázku a získal **${earned} 🔮**!${extraText}`);
    }
  }

  return earned;
}

// ─────────────────────────────────────────────
// VIZUÁL A SHOP
// ─────────────────────────────────────────────
function buildEmbedsForDay(dayNum, isActive = true) {
  const routes = ROUTES.filter(r => r.day === dayNum);
  if (!routes.length) return [];
  
  const st = new Date(routes[0].start);
  const en = new Date(routes[0].end);
  const timeText = `${st.getUTCDate()}.5. ${String(st.getUTCHours() + 2).padStart(2, '0')}:${String(st.getUTCMinutes()).padStart(2, '0')} – ${en.getUTCDate()}.5. ${String(en.getUTCHours() + 2).padStart(2, '0')}:${String(en.getUTCMinutes()).padStart(2, '0')}`;
  
  return routes.map(route => {
    const isBlack = route.variant === 'A';
    return {
      title: isBlack ? `🌑 Den #${route.day} | Černá Magie (Var. A)` : `🌕 Den #${route.day} | Bílá Magie (Var. B)`,
      description: isActive 
        ? `📍 **Trasa:** ${route.from} ➔ ${route.to}\n📏 **Délka:** cca ${route.dist} km\n⏳ **Čas:** ${timeText}\n\n✨ *Střídej varianty A a B pro kombo bonus +2 Orby! Dej si pozor na prokletý náklad.*` 
        : `**Tato etapa už skončila.**`,
      color: isBlack ? 0x2C2F33 : 0xF5F5DC,
      image: { url: isActive ? route.activeImage : null },
      footer: { text: `Luky Transport • Čarodějnický Event 2026` }
    };
  });
}

const buildShopEmbed = (userOrbs) => ({
  title: "🛒 Čarodějnický Obchod",
  description: `Tvé orby: **${userOrbs} 🔮**\nVyber si magický předmět k zakoupení:`,
  color: BRAND_COLOR,
  fields: [
    { name: "1️⃣ Věštecká koule (3 Orby)", value: "Odhalí čas Krvavého měsíce." },
    { name: "2️⃣ Talisman Ochrany (5 Orbů)", value: "Jednorázově blokuje Prokletý náklad." },
    { name: "3️⃣ Lektvar Zdvojení (15 Orbů)", value: "2x více orbů po dobu 60 minut." },
    { name: "4️⃣ Risky Potion (10 Orbů)", value: "Vypij a riskuj! (Šance na 0 až 30 orbů)." },
    { name: "5️⃣ Role Mistr Čaroděj (50 Orbů)", value: "Exkluzivní role navždy." },
    { name: "6️⃣ Zlodějský havran (10 Orbů)", value: "Okrade hráče z Top 10 o 1-10 orbů." },
    { name: "7️⃣ Upgrade Laboratoře (30 Orbů)", value: "Trvalý pasivní bonus +1 Orb ke každé zakázce." }
  ]
});

// ─────────────────────────────────────────────
// ANALÝZA KANÁLU
// ─────────────────────────────────────────────
async function runAnalysis(fullReset) {
  if (fullReset) { 
    orbsData = {}; config.dailyMasters = { 1:{}, 2:{}, 3:{}, 4:{}, 5:{}, 6:{} }; processed = {}; saveAll(); 
  }
  const channel = await client.channels.fetch(JOBS_CHANNEL_ID);
  let lastId = null, scanned = 0, rewarded = 0, stop = false;
  
  while (!stop) {
    const fetched = await channel.messages.fetch({ limit: 100, before: lastId ?? undefined });
    if (fetched.size === 0) break;
    const msgs = Array.from(fetched.values());
    
    for (const m of msgs) {
      if (m.createdTimestamp < EVENT_START) { stop = true; break; }
      scanned++;
      if (!m.embeds.length) continue;
      const e = m.embeds[0];
      const f = e.fields?.find(field => field.name?.toLowerCase()?.includes('odkud'))?.value;
      const t = e.fields?.find(field => field.name?.toLowerCase()?.includes('kam'))?.value;
      const n = e.author?.name || e.fields?.find(field => field.name?.toLowerCase()?.includes('řidič'))?.value;
      
      if (f && t && n) {
        const earned = await processJob(n.trim(), f, t, m.id, m.createdTimestamp, true);
        if (earned > 0) rewarded++;
      }
    }
    lastId = msgs[msgs.length - 1].id;
  }
  return { scanned, rewarded };
}

// ─────────────────────────────────────────────
// PŘÍKAZY A INTERAKCE
// ─────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName("orby").setDescription("Ukáže tvůj stav magických orbů."),
  new SlashCommandBuilder().setName("quest").setDescription("Zobrazí tvůj dnešní osobní úkol."),
  new SlashCommandBuilder().setName("event").setDescription("Zobrazí aktuální trasy."),
  new SlashCommandBuilder().setName("obchod").setDescription("Otevře čarodějnický obchod."),
  new SlashCommandBuilder().setName("leaderboard").setDescription("Zobrazí žebříček eventu.")
    .addStringOption(o => o.setName("typ").setDescription("Řazení").addChoices(
      {name: "Orby", value: "orbs"}, {name: "Kilometry", value: "km"}, {name: "Zakázky", value: "jobs"}, {name: "Ukradené Orby", value: "stolen"}
    )).addIntegerOption(o => o.setName("strana").setDescription("Strana žebříčku").setMinValue(1)),
  new SlashCommandBuilder().setName("profile").setDescription("Zobrazí profil a statistiky jiného hráče.")
    .addUserOption(o => o.setName("uzivatel").setDescription("Vyber uživatele na Discordu").setRequired(true)),
  new SlashCommandBuilder().setName("link").setDescription("Propojí Discord s TrucksBook nickem.")
    .addStringOption(o => o.setName("tb_nick").setRequired(true).setDescription("Nick na Trucksbooku")),
  new SlashCommandBuilder().setName("admin-link").setDescription("ADMIN: Ručně propojí Discord uživatele s TB nickem.")
    .addUserOption(o => o.setName("uzivatel").setDescription("Uživatel").setRequired(true))
    .addStringOption(o => o.setName("tb_nick").setDescription("Přesný TB nick").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("unlink").setDescription("ADMIN: Odstranit propojení účtu.")
    .addStringOption(o => o.setName("tb_nick").setDescription("Přesný TB nick").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-transfer").setDescription("ADMIN: Převést data z jednoho TB nicku na druhý.")
    .addStringOption(o => o.setName("stary_nick").setDescription("Starý TB nick").setRequired(true))
    .addStringOption(o => o.setName("novy_nick").setDescription("Nový TB nick").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("analyzovat").setDescription("ADMIN: Doplnit orby ze zpráv v kanálu.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("fullanalyze").setDescription("ADMIN: Smazat všechny orby a přepočítat je od nuly!").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-orb-dump").setDescription("ADMIN: Export databáze do JSON.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-orb-load").setDescription("ADMIN: Nahrát JSON zálohu s databází.")
    .addAttachmentOption(o => o.setName("soubor").setDescription("Záložní .json soubor").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("setup").setDescription("Nastavit hlavní kanál eventu pro mapy a Blood Moon.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-bloodmoon").setDescription("ADMIN: Spustí Krvavý měsíc na 2 hodiny.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-publish").setDescription("ADMIN: Vynutí opětovné odeslání dnešní trasy do hlavního kanálu.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("full-test").setDescription("ADMIN: Odsimuluje mazání a zveřejnění všech dnů v kanálu.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(c => c.toJSON());

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent ]});

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    
    if (interaction.commandName === "orby") {
      const user = Object.values(orbsData).find(e => e.discordId === interaction.user.id);
      if (!user) return interaction.reply({ content: "Zatím nemáš žádné orby. Propoj se přes `/link`!", ephemeral: true });
      
      let doubleTime = user.inventory.doublePotionUntil > Date.now() ? `<t:${Math.floor(user.inventory.doublePotionUntil/1000)}:R>` : "Neaktivní";
      let labStatus = user.inventory.labUpgrade ? "✅ Aktivní (+1)" : "❌ Nezakoupeno";
      
      return interaction.reply({ embeds: [{ title: "🔮 Tvůj kotlík", fields: [
        { name: "Orby", value: `**${user.totalOrbs}** 🔮`, inline: true }, 
        { name: "Etapy", value: `**${user.completedDays.length}/6**`, inline: true }, 
        { name: "🚚 Zakázky", value: `${user.totalJobs}`, inline: true }, 
        { name: "🛡️ Talismany", value: `${user.inventory.talisman}x`, inline: true },
        { name: "⏳ Lektvar zdvojení", value: doubleTime, inline: true },
        { name: "🧪 Laboratoř", value: labStatus, inline: true },
        { name: "Poslední trasa", value: user.lastVariant ? `Varianta ${user.lastVariant}` : "Žádná", inline: true }
      ], color: BRAND_COLOR }]});
    }

    if (interaction.commandName === "quest") {
      const user = Object.values(orbsData).find(e => e.discordId === interaction.user.id);
      if (!user) return interaction.reply({ content: "Zatím nehraješ! Propoj se přes `/link` a odvez první trasu.", ephemeral: true });

      const route = ROUTES.find(r => Date.now() >= r.start && Date.now() < r.end);
      if (!route) return interaction.reply({ content: "Nyní neběží žádná etapa, nelze plnit úkoly.", ephemeral: true });

      const currentDay = route.day;
      if (!user.quests || !user.quests[currentDay]) {
        return interaction.reply({ content: "Zatím nemáš pro dnešek vygenerovaný úkol. Odvez svou první dnešní zakázku a úkol se ti odemkne!", ephemeral: true });
      }

      const q = user.quests[currentDay];
      const progressText = q.type === 'km' ? `${q.progress} / ${q.target} km` : `${q.progress} / ${q.target} zakázek`;
      const status = q.completed ? "✅ Splněno (Odměna vybrána)" : "⏳ Probíhá";

      return interaction.reply({ embeds: [{
        title: `📜 Tvůj denní úkol (Den #${currentDay})`,
        description: `**Zadání:** ${q.desc}\n**Odměna:** ${q.reward} 🔮\n\n**Stav:** ${status}\n**Postup:** ${progressText}`,
        color: BRAND_COLOR
      }], ephemeral: true });
    }

    if (interaction.commandName === "profile") {
      const targetUser = interaction.options.getUser("uzivatel");
      const user = Object.values(orbsData).find(e => e.discordId === targetUser.id);

      if (!user) return interaction.reply({ content: `Uživatel ${targetUser.username} zatím nemá nasbírané žádné orby nebo propojený účet.`, ephemeral: true });

      let favRoute = "Žádná"; let maxR = 0;
      for (const [r, count] of Object.entries(user.routes)) { if (count > maxR) { maxR = count; favRoute = r; } }
      let labStatus = user.inventory?.labUpgrade ? "✅ Aktivní" : "❌ Nezakoupeno";

      return interaction.reply({ embeds: [{
        title: `🧙 Profil: ${targetUser.username}`,
        thumbnail: { url: targetUser.displayAvatarURL() },
        fields: [
          { name: "Orby", value: `**${user.totalOrbs}** 🔮`, inline: true },
          { name: "Etapy", value: `**${user.completedDays.length}/6**`, inline: true },
          { name: "🚚 Zakázky", value: `${user.totalJobs}`, inline: true },
          { name: "🧭 Kilometry", value: `${user.totalKm} km`, inline: true },
          { name: "🦅 Ukradeno orbů", value: `${user.stolenOrbs || 0} 🔮`, inline: true },
          { name: "💀 Prokleté náklady", value: `${user.cursedCount || 0}x`, inline: true },
          { name: "🧪 Laboratoř", value: labStatus, inline: true },
          { name: "⭐ Nejčastější trasa", value: `**${favRoute}** (${maxR}x)`, inline: false }
        ],
        color: BRAND_COLOR,
        footer: { text: `Propojeno s TB: ${user.tbName}` }
      }]});
    }

    if (interaction.commandName === "leaderboard") {
      const page = interaction.options.getInteger("strana") ?? 1;
      const type = interaction.options.getString("typ") ?? "orbs";
      const entries = Object.values(orbsData).filter(e => e.totalOrbs > 0 || e.totalKm > 0);
      if (!entries.length) return interaction.reply("Zatím nikdo nesbírá.");

      const sorted = entries.sort((a, b) => {
        if (type === "km") return b.totalKm - a.totalKm;
        if (type === "jobs") return b.totalJobs - a.totalJobs;
        if (type === "stolen") return (b.stolenOrbs || 0) - (a.stolenOrbs || 0);
        return b.totalOrbs - a.totalOrbs;
      });

      const start = (page - 1) * 10;
      const top = sorted.slice(start, start + 10);
      if (!top.length) return interaction.reply("Tato strana je prázdná.");

      let typeLabel = "🔮 Orby";
      if (type === "km") typeLabel = "🧭 Kilometry";
      if (type === "jobs") typeLabel = "🚚 Zakázky";
      if (type === "stolen") typeLabel = "🦅 Ukradené Orby";

      const lines = top.map((d, i) => {
        let val = "";
        if (type === "km") val = `${d.totalKm} km`;
        else if (type === "jobs") val = `${d.totalJobs} zak.`;
        else if (type === "stolen") val = `${d.stolenOrbs || 0} ukradených 🔮`;
        else val = `${d.totalOrbs} 🔮`;

        return `**${start + i + 1}.** ${d.discordId ? `<@${d.discordId}>` : d.tbName} — ${val}`;
      });

      return interaction.reply({ embeds: [{
        title: `🏆 Žebříček: ${typeLabel}`,
        description: lines.join("\n\n"),
        color: BRAND_COLOR,
        footer: { text: `Strana ${page}` }
      }]});
    }

    if (interaction.commandName === "event") {
      const route = ROUTES.find(r => Date.now() >= r.start && Date.now() < r.end);
      if (!route) return interaction.reply("Neběží žádná etapa.");
      return interaction.reply({ embeds: buildEmbedsForDay(route.day, true) });
    }

    if (interaction.commandName === "link") {
      const nick = interaction.options.getString("tb_nick").trim();
      if (!orbsData[nick]) orbsData[nick] = { tbName: nick, discordId: interaction.user.id, completedDays: [], totalOrbs: 0, totalKm: 0, totalJobs: 0, bonusClaimed: false, routes: {}, lastVariant: null, stolenOrbs: 0, cursedCount: 0, quests: {}, inventory: { talisman: 0, doublePotionUntil: 0, labUpgrade: false } };
      else orbsData[nick].discordId = interaction.user.id;
      saveAll();
      return interaction.reply({ content: `✅ Propojeno s **${nick}**`, ephemeral: true });
    }

    // ──────────────── ADMIN SPRÁVA ────────────────

    if (interaction.commandName === "admin-link") {
      const user = interaction.options.getUser("uzivatel");
      const nick = interaction.options.getString("tb_nick").trim();
      if (!orbsData[nick]) orbsData[nick] = { tbName: nick, discordId: user.id, completedDays: [], totalOrbs: 0, totalKm: 0, totalJobs: 0, bonusClaimed: false, routes: {}, lastVariant: null, stolenOrbs: 0, cursedCount: 0, quests: {}, inventory: { talisman: 0, doublePotionUntil: 0, labUpgrade: false } };
      else orbsData[nick].discordId = user.id;
      saveAll();
      return interaction.reply({ content: `✅ Admin: Propojil jsem ${user} s TB: **${nick}**`, ephemeral: true });
    }

    if (interaction.commandName === "unlink") {
      const nick = interaction.options.getString("tb_nick").trim();
      if (orbsData[nick]) { orbsData[nick].discordId = null; saveAll(); return interaction.reply({ content: `✅ Odpojeno: **${nick}**`, ephemeral: true }); }
      return interaction.reply({ content: "❌ Nick nenalezen.", ephemeral: true });
    }

    if (interaction.commandName === "admin-transfer") {
      const oldNick = interaction.options.getString("stary_nick").trim();
      const newNick = interaction.options.getString("novy_nick").trim();
      if (!orbsData[oldNick]) return interaction.reply({ content: `❌ Starý nick **${oldNick}** nenalezen.`, ephemeral: true });
      if (orbsData[newNick]) return interaction.reply({ content: `❌ Nový nick **${newNick}** už existuje. Nelze přepsat.`, ephemeral: true });
      
      orbsData[newNick] = { ...orbsData[oldNick], tbName: newNick };
      delete orbsData[oldNick];
      saveAll();
      return interaction.reply({ content: `✅ Data úspěšně převedena z **${oldNick}** na **${newNick}**.`, ephemeral: true });
    }

    if (interaction.commandName === "admin-orb-dump") {
      const file = new AttachmentBuilder(Buffer.from(JSON.stringify(orbsData, null, 2)), { name: 'witch_orbs.json' });
      return interaction.reply({ files: [file], ephemeral: true });
    }

    if (interaction.commandName === "admin-orb-load") {
      await interaction.deferReply({ ephemeral: true });
      const attachment = interaction.options.getAttachment("soubor");
      if (!attachment.name.endsWith('.json')) return interaction.editReply("❌ Soubor musí být .json!");
      try {
        const response = await fetch(attachment.url);
        orbsData = await response.json();
        saveAll();
        return interaction.editReply(`✅ Databáze úspěšně obnovena ze souboru **${attachment.name}**.`);
      } catch (e) {
        return interaction.editReply("❌ Chyba při načítání JSON.");
      }
    }

    if (interaction.commandName === "analyzovat") {
      await interaction.deferReply({ ephemeral: true });
      const { scanned, rewarded } = await runAnalysis(false);
      return interaction.editReply(`✅ Analýza hotova.\nZpráv: ${scanned}\nNové odměny: ${rewarded}`);
    }

    if (interaction.commandName === "fullanalyze") {
      await interaction.deferReply({ ephemeral: true });
      const { scanned, rewarded } = await runAnalysis(true);
      return interaction.editReply(`✅ Full Reset hotov.\nZpráv: ${scanned}\nPřiděleno odměn: ${rewarded}`);
    }

    if (interaction.commandName === "setup") {
      config.channelId = interaction.channel.id; 
      saveAll();
      await interaction.reply({ content: "📌 Hlavní kanál pro event nastaven. Bleskově kontroluji a vydávám aktuální trasu...", ephemeral: true });
      await autoUpdate(); 
      return;
    }

    if (interaction.commandName === "admin-bloodmoon") {
      if (!config.channelId) return interaction.reply({ content: "❌ Musíš nejdříve nastavit hlavní kanál pomocí `/setup`.", ephemeral: true });
      config.bloodMoon.activeUntil = Date.now() + (2 * 60 * 60 * 1000); 
      config.bloodMoon.announced = true;
      const channel = await client.channels.fetch(config.channelId).catch(() => null);
      if (channel) {
        const msg = await channel.send("@everyone 🌕 **KRVAVÝ MĚSÍC POVSTAL!** Následující 2 hodiny dávají všechny zakázky 2x více Orbů!");
        config.bloodMoon.msgId = msg.id;
      }
      saveAll();
      return interaction.reply({ content: "Spuštěno.", ephemeral: true });
    }

    if (interaction.commandName === "admin-publish") {
      const route = ROUTES.find(r => Date.now() >= r.start && Date.now() < r.end);
      if (!route) return interaction.reply({ content: "❌ Aktuálně neběží žádná etapa.", ephemeral: true });
      if (!config.channelId) return interaction.reply({ content: "❌ Není nastaven hlavní kanál pro event (/setup).", ephemeral: true });
      
      const channel = await client.channels.fetch(config.channelId).catch(() => null);
      if (!channel) return interaction.reply({ content: "❌ Nelze najít hlavní kanál.", ephemeral: true });

      if (config.messages[route.day]) {
        try {
          const oldMsg = await channel.messages.fetch(config.messages[route.day]);
          if (oldMsg) await oldMsg.delete();
        } catch (e) {}
      }
      
      const msg = await channel.send({ 
        content: "@everyone 🔮 **Nová etapa Čarodějnického Eventu právě začala!**", 
        embeds: buildEmbedsForDay(route.day, true) 
      });
      config.messages[route.day] = msg.id;
      config.lastPublishedDay = route.day;
      saveAll();
      return interaction.reply({ content: "✅ Trasa byla úspěšně vnucena do hlavního kanálu.", ephemeral: true });
    }

    if (interaction.commandName === "full-test") {
      await interaction.reply({ content: "🛠️ Spouštím **FULL TEST** systému.", ephemeral: true });
      let currentTestDay = 1;
      let lastTestMsgId = null;
      
      const testInterval = setInterval(async () => {
        if (currentTestDay > 6) {
          clearInterval(testInterval);
          if (lastTestMsgId) {
            try {
              const oldMsg = await interaction.channel.messages.fetch(lastTestMsgId);
              if (oldMsg) await oldMsg.delete();
            } catch(e) {}
          }
          
          await interaction.channel.send({ 
            content: "@everyone 🛑 **[TEST Simulace] Čarodějnický Event právě skončil!**",
            embeds: [{
              title: "🎇 Konec Čarodějnického Eventu!",
              description: "Všechny trasy byly uzavřeny a magie pomalu vyprchává z našich tahačů...\n\nObrovské díky všem zúčastněným čarodějům a alchymistům za účast! Nyní prosím vyčkejte na **oficiální vyhodnocení a rozdání finálních odměn od Vedení firmy**.",
              color: 0x000000,
              footer: { text: "Luky Transport • Čarodějnický Event 2026" }
            }]
          });
          return;
        }
        
        if (lastTestMsgId) {
           try {
             const oldMsg = await interaction.channel.messages.fetch(lastTestMsgId);
             if (oldMsg) await oldMsg.delete();
           } catch(e) {}
        }
        
        const msg = await interaction.channel.send({ 
          content: `@everyone 🔮 **[TEST Simulace] Nová etapa Čarodějnického Eventu právě začala! (Den #${currentTestDay})**`, 
          embeds: buildEmbedsForDay(currentTestDay, true) 
        });
        lastTestMsgId = msg.id;
        currentTestDay++;
      }, 10000); 
      return;
    }

    // ──────────────── OBCHOD ────────────────

    if (interaction.commandName === "obchod") {
      const user = Object.values(orbsData).find(e => e.discordId === interaction.user.id);
      if (!user) return interaction.reply({ content: "Nejsi propojen. Použij `/link`.", ephemeral: true });

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('buy_crystal').setLabel('1️⃣ Věštba (3)').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('buy_talisman').setLabel('2️⃣ Talisman (5)').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('buy_double').setLabel('3️⃣ Zdvojení (15)').setStyle(ButtonStyle.Primary)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('buy_risk').setLabel('4️⃣ Risky Potion (10)').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('buy_role').setLabel('5️⃣ Role (50)').setStyle(ButtonStyle.Success)
      );
      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('buy_raven').setLabel('6️⃣ Havran (10)').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('buy_lab').setLabel('7️⃣ Laboratoř (30)').setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [buildShopEmbed(user.totalOrbs)], components: [row1, row2, row3], ephemeral: true });
    }
  }

  if (interaction.isButton() && interaction.customId.startsWith('buy_')) {
    const userObj = Object.values(orbsData).find(e => e.discordId === interaction.user.id);
    if (!userObj) return interaction.reply({ content: "Chyba uživatele.", ephemeral: true });

    let cost = 0; let replyMsg = "";
    
    if (interaction.customId === 'buy_crystal') cost = 3;
    else if (interaction.customId === 'buy_talisman') cost = 5;
    else if (interaction.customId === 'buy_double') cost = 15;
    else if (interaction.customId === 'buy_risk') cost = 10;
    else if (interaction.customId === 'buy_role') cost = 50;
    else if (interaction.customId === 'buy_raven') cost = 10;
    else if (interaction.customId === 'buy_lab') cost = 30;

    if (userObj.totalOrbs < cost) return interaction.reply({ content: `❌ Nemáš dostatek orbů. Potřebuješ jich ${cost}.`, ephemeral: true });

    if (interaction.customId === 'buy_lab') {
      if (userObj.inventory.labUpgrade) return interaction.reply({ content: `❌ Upgrade laboratoře už máš zakoupený!`, ephemeral: true });
      userObj.totalOrbs -= cost;
      userObj.inventory.labUpgrade = true;
      replyMsg = "🧪 Výborně! Tvá laboratoř je vylepšena. Odteď získáváš trvale +1 Orb navíc za každou odjetou zakázku.";
    }
    else if (interaction.customId === 'buy_raven') {
      const allPlayers = Object.values(orbsData)
        .filter(p => p.discordId && p.discordId !== interaction.user.id && p.totalOrbs > 0)
        .sort((a, b) => b.totalOrbs - a.totalOrbs)
        .slice(0, 10);

      if (allPlayers.length === 0) return interaction.reply({ content: "❌ Není koho okrást! Zřejmě jsi v žebříčku úplně sám, nebo ostatní nemají žádné orby.", ephemeral: true });

      userObj.totalOrbs -= cost;
      const target = allPlayers[Math.floor(Math.random() * allPlayers.length)];
      
      const stolenAmount = Math.floor(Math.random() * 10) + 1;
      const actualStolen = Math.min(stolenAmount, target.totalOrbs); 

      target.totalOrbs -= actualStolen;
      userObj.totalOrbs += actualStolen;
      userObj.stolenOrbs += actualStolen; 

      replyMsg = `🦅 Havran se vrátil z lovu! Úspěšně jsi ukradl **${actualStolen} 🔮** hráči jménem ${target.tbName}.`;

      if (NOTIFY_CHANNEL_ID) {
        const ch = await client.channels.fetch(NOTIFY_CHANNEL_ID).catch(()=>null);
        if (ch) ch.send(`🦅 **Temnota houstne!** <@${userObj.discordId}> právě vyslal Zlodějského havrana a okradl <@${target.discordId}> o **${actualStolen} 🔮**!`);
      }
    }
    else {
      userObj.totalOrbs -= cost;
      if (interaction.customId === 'buy_crystal') {
        if (config.bloodMoon.activeUntil > Date.now()) replyMsg = "🔮 Vidíš rudou záři... Krvavý měsíc už PŮSOBÍ!";
        else replyMsg = "🔮 Vize je mlhavá... hvězdy zatím Krvavý měsíc nevyjevily.";
      } 
      else if (interaction.customId === 'buy_talisman') {
        userObj.inventory.talisman += 1;
        replyMsg = "🛡️ Koupil jsi Talisman Ochrany. Jsi chráněn před jedním prokletím!";
      }
      else if (interaction.customId === 'buy_double') {
        userObj.inventory.doublePotionUntil = Date.now() + (60 * 60 * 1000);
        replyMsg = "🧪 Vypil jsi Lektvar Zdvojení. Na dalších 60 minut získáváš 2x orby!";
      }
      else if (interaction.customId === 'buy_risk') {
        const roll = Math.random() * 100;
        let won = 0;
        if (roll < 40) won = 0;
        else if (roll < 60) won = 1;
        else if (roll < 75) won = 5;
        else if (roll < 94) won = 10;
        else if (roll < 99) won = 15;
        else won = 30; 
        
        userObj.totalOrbs += won;
        replyMsg = `🎲 Vypil jsi Risky Potion a tvé tělo se zachvělo... Získáváš zpět **${won} orbů**!`;
      }
      else if (interaction.customId === 'buy_role') {
        await tryAssignRole(interaction.user.id, ROLE_EVENT_HAUL, "Nákup v obchodu");
        replyMsg = "🎓 Zakoupil jsi roli Mistr Čaroděj. Zkontroluj si profil!";
      }
    }

    saveAll();
    return interaction.reply({ content: replyMsg, ephemeral: true });
  }
});

// ─────────────────────────────────────────────
// ŽIVÝ POSLECH ZAKÁZEK
// ─────────────────────────────────────────────
client.on('messageCreate', async (m) => {
  if (m.channel.id !== JOBS_CHANNEL_ID || !m.embeds.length) return;
  const e = m.embeds[0];
  const f = e.fields?.find(field => field.name?.toLowerCase()?.includes('odkud'))?.value;
  const t = e.fields?.find(field => field.name?.toLowerCase()?.includes('kam'))?.value;
  const n = e.author?.name || e.fields?.find(field => field.name?.toLowerCase()?.includes('řidič'))?.value;
  if (f && t && n) {
    await processJob(n.trim(), f, t, m.id, m.createdTimestamp);
  }
});

// ─────────────────────────────────────────────
// AUTO UPDATE (Vydávání tras a mazání starých)
// ─────────────────────────────────────────────
async function autoUpdate() {
  // Smazání Krvavého Měsíce, pokud už expiroval
  if (config.bloodMoon.activeUntil > 0 && Date.now() > config.bloodMoon.activeUntil) {
    if (config.bloodMoon.msgId && config.channelId) {
      const ch = await client.channels.fetch(config.channelId).catch(() => null);
      if (ch) {
        try {
          const bmMsg = await ch.messages.fetch(config.bloodMoon.msgId);
          if (bmMsg) await bmMsg.delete();
        } catch(e) {}
      }
    }
    config.bloodMoon.activeUntil = 0;
    config.bloodMoon.announced = false;
    config.bloodMoon.msgId = null;
    saveAll();
  }

  if (!config.channelId) return;
  const now = Date.now();
  const route = ROUTES.find(r => now >= r.start && now < r.end);

  const channel = await client.channels.fetch(config.channelId).catch(() => null);
  if (!channel) return;

  // POKUD UŽ NEBĚŽÍ ŽÁDNÁ TRASA (Konec eventu)
  if (!route) {
    const lastRoute = ROUTES[ROUTES.length - 1]; 
    if (now >= lastRoute.end && !config.eventEndedAnnounced) {
      if (config.messages[lastRoute.day]) {
        try {
          const oldMsg = await channel.messages.fetch(config.messages[lastRoute.day]);
          if (oldMsg) await oldMsg.delete(); 
        } catch (e) {}
      }
      
      await channel.send({ 
        content: "@everyone 🛑 **Čarodějnický Event právě skončil!**",
        embeds: [{
          title: "🎇 Konec Čarodějnického Eventu!",
          description: "Všechny trasy byly uzavřeny a magie pomalu vyprchává z našich tahačů...\n\nObrovské díky všem zúčastněným čarodějům a alchymistům za účast! Nyní prosím vyčkejte na **oficiální vyhodnocení a rozdání finálních odměn od Vedení firmy**.",
          color: 0x000000,
          thumbnail: { url: LOGO_URL },
          footer: { text: "Luky Transport • Čarodějnický Event 2026" }
        }]
      });
      
      config.eventEndedAnnounced = true;
      saveAll();
    }
    return;
  }

  // POKUD BĚŽÍ TRASA, ALE UŽ JE PUBLIKOVANÁ
  if (config.lastPublishedDay === route.day) return;

  // PUBLIKACE NOVÉHO DNE
  const yesterday = route.day - 1;
  if (config.messages[yesterday]) {
    try {
      const oldMsg = await channel.messages.fetch(config.messages[yesterday]);
      if (oldMsg) await oldMsg.delete();
    } catch (e) {}
  }

  const msg = await channel.send({ 
    content: "@everyone 🔮 **Nová etapa Čarodějnického Eventu právě začala!**", 
    embeds: buildEmbedsForDay(route.day, true) 
  });
  
  config.messages[route.day] = msg.id; 
  config.lastPublishedDay = route.day; 
  saveAll();
}

client.once("ready", () => {
  console.log(`Bot Čarodějnice přihlášen a připraven čarovat.`);
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  
  setInterval(autoUpdate, 60000);
});

client.login(TOKEN);
