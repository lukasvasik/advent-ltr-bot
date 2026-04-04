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
const CONFIG_PATH = path.join(__dirname, 'easter_config.json');
const EGGS_PATH = path.join(__dirname, 'easter_eggs.json');
const PROCESSED_PATH = path.join(__dirname, 'processed_easter.json');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const JOBS_CHANNEL_ID = process.env.JOBS_CHANNEL_ID || '1149900706543833208';
const BRAND_COLOR = 0x34EB52;
const LOGO_URL = "https://i.imgur.com/fdvSTG2.png";

if (!TOKEN) throw new Error('❌ DISCORD_TOKEN chybí.');

// ─────────────────────────────────────────────
// ROLE A ČASOVÁNÍ
// ─────────────────────────────────────────────
const ROLE_EASTER_HAUL = '1489754575199015012';
const ROLE_ZAJIC_DNE = '1489757276435648552';

const YEAR = 2026;
const START_HOUR_UTC = 14; // 16:00 SEČ
const EVENT_START = Date.UTC(YEAR, 3, 3, START_HOUR_UTC, 0, 0); // 3. dubna 16:00

const getWindow = (dayNum) => ({
  start: Date.UTC(YEAR, 3, dayNum, START_HOUR_UTC, 0, 0),
  end:   Date.UTC(YEAR, 3, dayNum + 1, START_HOUR_UTC, 0, 0)
});

const ROUTES = [
  { day: 1, from: "Bratislava", to: "Poznan", dist: 564, activeImage: "https://i.imgur.com/eHOjNyE.png", expiredImage: "https://i.imgur.com/xzwO9q9.png", mapUrl: "https://i.imgur.com/dcvVqLD.png", ...getWindow(3) },
  { day: 2, from: "Poznan", to: "Hannover", dist: 474, activeImage: "https://i.imgur.com/iEUKh0A.png", expiredImage: "https://i.imgur.com/T8U1jEY.png", mapUrl: "https://i.imgur.com/858PSoN.png", ...getWindow(4) },
  { day: 3, from: "Hannover", to: "Calais", dist: 643, activeImage: "https://i.imgur.com/Ik9h5vG.png", expiredImage: "https://i.imgur.com/5lWHhpu.png", mapUrl: "https://i.imgur.com/LjVD8E0.png", ...getWindow(5) },
  { day: 4, from: "Calais", to: "Zeneva", dist: 872, activeImage: "https://i.imgur.com/4KIK4PI.png", expiredImage: "https://i.imgur.com/QJif9vR.png", mapUrl: "https://i.imgur.com/qrSrbx4.png", ...getWindow(6) },
  { day: 5, from: "Zeneva", to: "Verona", dist: 662, activeImage: "https://i.imgur.com/6CiJqB0.png", expiredImage: "https://i.imgur.com/UMw6XG8.png", mapUrl: "https://i.imgur.com/2myq0xw.png", ...getWindow(7) },
  { day: 6, from: "Verona", to: "Stuttgart", dist: 613, activeImage: "https://i.imgur.com/bYVAnmS.png", expiredImage: "https://i.imgur.com/YmiTkuG.png", mapUrl: "https://i.imgur.com/MfLXGcD.png", ...getWindow(8) },
  { day: 7, from: "Stuttgart", to: "Praha", dist: 509, activeImage: "https://i.imgur.com/mQQVYNr.png", expiredImage: "https://i.imgur.com/nicqzyT.png", mapUrl: "https://i.imgur.com/MfLXGcD.png", ...getWindow(9) }
];

// ─────────────────────────────────────────────
// NORMALIZACE A SYNONYMA
// ─────────────────────────────────────────────
const CITY_SYNONYMS = {
  'praha': 'praha', 'prague': 'praha', 'prag': 'praha',
  'bratislava': 'bratislava', 'pressburg': 'bratislava',
  'poznan': 'poznan', 'poznaň': 'poznan',
  'hannover': 'hannover', 'hanover': 'hannover',
  'calais': 'calais', 'zeneva': 'zeneva', 'geneve': 'zeneva', 'ženeva': 'zeneva', 'geneva': 'zeneva',
  'verona': 'verona', 'stuttgart': 'stuttgart', 'viden': 'viden', 'vienna': 'viden', 'vídeň': 'viden',
  'brno': 'brno', 'berlin': 'berlin', 'berlín': 'berlin'
};

function normalize(text) {
  if (!text) return '';
  const base = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  for (const [key, val] of Object.entries(CITY_SYNONYMS)) {
    if (base.includes(key)) return val;
  }
  return base;
}

function extractDistanceKm(embed) {
  if (!embed) return null;
  const distField = embed.fields?.find(f => f.name && f.name.toLowerCase().includes('vzdálenost'));
  const text = distField ? distField.value : embed.description;
  if (!text) return null;
  const match = text.replace(/\s+/g, ' ').match(/(\d[\d\s.,]*)\s*km/i);
  if (match) {
    const parsed = Number(match[1].replace(/\s+/g, '').replace(',', '.'));
    if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

// ─────────────────────────────────────────────
// DATABÁZE A ULOŽENÍ
// ─────────────────────────────────────────────
let eggsData = fs.existsSync(EGGS_PATH) ? JSON.parse(fs.readFileSync(EGGS_PATH, 'utf8')) : {};
let config = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) : { channelId: null, lastPublishedDay: 0, messages: {}, dailyHare: {} };
let processed = fs.existsSync(PROCESSED_PATH) ? JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf8')) : {};

const saveAll = () => {
  fs.writeFileSync(EGGS_PATH, JSON.stringify(eggsData, null, 2));
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  fs.writeFileSync(PROCESSED_PATH, JSON.stringify(processed, null, 2));
};

// ─────────────────────────────────────────────
// FUNKCE ROLÍ A AUTO-LINKU
// ─────────────────────────────────────────────
async function tryAssignRole(memberId, roleId, reason) {
  if (!GUILD_ID || !memberId || !roleId) return;
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(memberId);
    if (!member.roles.cache.has(roleId)) await member.roles.add(roleId, reason);
  } catch (e) { console.warn(`Nelze přidat roli ${roleId} uživateli ${memberId}.`); }
}

async function tryAutoLink(tbName) {
  if (!GUILD_ID || !tbName) return;
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();
    const target = tbName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = guild.members.cache.find(m => 
      m.displayName.toLowerCase().replace(/[^a-z0-9]/g, '').includes(target) || 
      m.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').includes(target)
    );
    if (match && target.length >= 3) {
      eggsData[tbName].discordId = match.id;
      saveAll();
    }
  } catch (e) {}
}

// ─────────────────────────────────────────────
// HLAVNÍ LOGIKA ZPRACOVÁNÍ ZAKÁZKY
// ─────────────────────────────────────────────
async function processJob(tbName, fromRaw, toRaw, embed, msgId, ts = Date.now(), isAnalysis = false) {
  if (processed[msgId]) return 0; // Ochrana proti duplikacím

  const from = normalize(fromRaw);
  const to = normalize(toRaw);
  const route = ROUTES.find(r => ts >= r.start && ts < r.end && ((from === normalize(r.from) && to === normalize(r.to)) || (from === normalize(r.to) && to === normalize(r.from))));

  if (!route) return 0;

  if (!eggsData[tbName]) {
    eggsData[tbName] = { tbName, discordId: null, completedDays: [], totalEggs: 0, totalKm: 0, totalJobs: 0, bonusClaimed: false, routes: {} };
  }
  const user = eggsData[tbName];

  // Auto-link
  if (!user.discordId && !isAnalysis) await tryAutoLink(tbName);
  
  // Statistiky
  const km = extractDistanceKm(embed) || route.dist;
  user.totalJobs += 1;
  user.totalKm += km;
  const routeKey = `${from} ↔ ${to}`;
  if (!user.routes[routeKey]) user.routes[routeKey] = 0;
  user.routes[routeKey] += 1;

  // Hazard a Vajíčka
  let earned = 1;
  const rand = Math.random() * 100;
  if (rand <= 1) earned += 5; // 1% Jackpot
  else if (rand <= 11) earned += 1; // 10% Bonus
  
  user.totalEggs += earned;

  // Unikátní dny a Zajíc Dne
  if (!user.completedDays.includes(route.day)) {
    user.completedDays.push(route.day);

    // Logika Zajíce Dne (jen pokud to není zpětná analýza a má Discord ID)
    if (!isAnalysis && user.discordId && !config.dailyHare[route.day]) {
      config.dailyHare[route.day] = user.discordId;
      try {
        const guild = await client.guilds.fetch(GUILD_ID);
        // Sebrat starým zajícům
        const oldHares = guild.members.cache.filter(m => m.roles.cache.has(ROLE_ZAJIC_DNE));
        for (const [id, member] of oldHares) await member.roles.remove(ROLE_ZAJIC_DNE);
        // Dát novému
        await tryAssignRole(user.discordId, ROLE_ZAJIC_DNE, `Zajíc dne ${route.day}`);
        
        if (config.channelId) {
          const ch = await client.channels.fetch(config.channelId);
          await ch.send(`🐰 **Zajícem dne #${route.day}** se stává <@${user.discordId}>! Odjel první zakázku dne a získal exkluzivní roli! 🏆`);
        }
      } catch(e) { console.error(e); }
    }
  }

  // Easter Haul (Splnění všech 7)
  if (user.completedDays.length === 7 && !user.bonusClaimed) {
    user.totalEggs += 3;
    user.bonusClaimed = true;
    if (user.discordId) await tryAssignRole(user.discordId, ROLE_EASTER_HAUL, "Splněno 7 etap");
  }

  processed[msgId] = true;
  saveAll();
  return earned;
}

// ─────────────────────────────────────────────
// EMBEDY A TLAČÍTKA
// ─────────────────────────────────────────────
function buildEmbed(route, state) {
  const st = new Date(route.start);
  const en = new Date(route.end);
  const timeText = `${st.getUTCDate()}.4. ${String(st.getUTCHours() + 2).padStart(2, '0')}:00 – ${en.getUTCDate()}.4. ${String(en.getUTCHours() + 2).padStart(2, '0')}:00`;

  if (state === "ACTIVE") {
    return {
      title: `🥚 Velikonoční jízda – Den #${route.day}`,
      description: `**Trasa je právě AKTIVNÍ!**\n\n**Start:** ${route.from}\n**Cíl:** ${route.to}\n**Délka:** ${route.dist} km\n**Čas:** ${timeText}\n\nOdvez tuto trasu a získej vajíčko! Trasu můžeš jet opakovaně. Máš 10% šanci na bonus a 1% šanci na Jackpot! 🥚\n\nKlikni na tlačítko níže pro zobrazení mapy 👇`,
      color: BRAND_COLOR, image: { url: route.activeImage }, thumbnail: { url: LOGO_URL }, footer: { text: `Luky Transport • Velikonoce 2026`, icon_url: LOGO_URL }
    };
  } else {
    return {
      title: `🥚 Velikonoční jízda – Den #${route.day}`,
      description: `**Tato etapa už skončila.**\nSleduj aktuální trasu dne!`,
      color: 0x99aab5, image: { url: route.expiredImage }, thumbnail: { url: LOGO_URL }, footer: { text: `Luky Transport • Velikonoce 2026`, icon_url: LOGO_URL }
    };
  }
}

function buildButton(route) {
  return [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Zobrazit mapu trasy").setStyle(ButtonStyle.Link).setURL(route.mapUrl))];
}

// ─────────────────────────────────────────────
// SLASH COMMANDY
// ─────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName("vajicka").setDescription("Ukáže tvůj stav velikonočních vajíček a statistik."),
  
  new SlashCommandBuilder().setName("leaderboard").setDescription("Zobrazí žebříček sběratelů vajíček.")
    .addStringOption(o => o.setName("typ").setDescription("Podle čeho řadit?").addChoices({name: "Vajíčka", value: "eggs"}, {name: "Kilometry", value: "km"}, {name: "Zakázky", value: "jobs"}))
    .addIntegerOption(o => o.setName("strana").setDescription("Strana žebříčku").setMinValue(1)),
  
  new SlashCommandBuilder().setName("velikonoce").setDescription("Zobrazí aktuální trasu pro dnešní den."),
  
  new SlashCommandBuilder().setName("link").setDescription("Propojí tvůj Discord s TrucksBook nickem.")
    .addStringOption(o => o.setName("tb_nick").setDescription("Tvůj přesný nick na TrucksBooku").setRequired(true)),
  
  // ADMIN PŘÍKAZY
  new SlashCommandBuilder().setName("setup").setDescription("Nastaví tento kanál pro publikování.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder().setName("admin-publish").setDescription("Ručně zveřejní vybraný den.")
    .addIntegerOption(o => o.setName("den").setDescription("Číslo dne (1-7)").setRequired(true).setMinValue(1).setMaxValue(7)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder().setName("admin-link").setDescription("Ručně propojí Discord s TB.")
    .addUserOption(o => o.setName("uzivatel").setDescription("Uživatel").setRequired(true))
    .addStringOption(o => o.setName("tb_nick").setDescription("Přesný TB nick").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder().setName("unlink").setDescription("Odstraní propojení účtu.")
    .addStringOption(o => o.setName("tb_nick").setDescription("Přesný TB nick").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder().setName("admin-add-egg").setDescription("Ručně přidá uživateli vajíčko.")
    .addStringOption(o => o.setName("tb_nick").setDescription("Přesný TB nick").setRequired(true))
    .addIntegerOption(o => o.setName("den").setDescription("Za jaký den (1-7)").setRequired(true))
    .addUserOption(o => o.setName("uzivatel").setDescription("Volitelné propojení účtu").setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder().setName("analyzovat").setDescription("Projede historii zakázek a doplní chybějící vajíčka.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder().setName("fullanalyze").setDescription("Smaže všechna vajíčka a přepočítá je z historie od nuly!").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder().setName("admin-egg-dump").setDescription("Exportuje JSON.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(c => c.toJSON());

// ─────────────────────────────────────────────
// BOT EVENTY
// ─────────────────────────────────────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] });

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "setup") {
    config.channelId = interaction.channel.id;
    saveAll();
    return interaction.reply({ content: "📌 Kanál nastaven.", ephemeral: true });
  }

  if (interaction.commandName === "vajicka") {
    const user = Object.values(eggsData).find(e => e.discordId === interaction.user.id);
    if (!user) return interaction.reply({ content: "Zatím nemáš žádná vajíčka. Nejdřív se propoj přes `/link`!", ephemeral: true });

    let favRoute = "Žádná";
    let maxR = 0;
    for (const [r, count] of Object.entries(user.routes)) { if (count > maxR) { maxR = count; favRoute = r; } }

    const embed = {
      title: "🥚 Tvůj velikonoční košík",
      fields: [
        { name: "Počet vajíček", value: `**${user.totalEggs}** 🥚`, inline: true },
        { name: "Odjeté etapy", value: `**${user.completedDays.length} / 7**`, inline: true },
        { name: "Bonus za komplet (+3)", value: user.bonusClaimed ? "✅ Připsáno" : "❌ Chybí", inline: false },
        { name: "🚚 Zakázky", value: `**${user.totalJobs}**`, inline: true },
        { name: "🧭 Kilometry", value: `**${user.totalKm} km**`, inline: true },
        { name: "⭐ Nejčastější", value: `**${favRoute}** (${maxR}x)`, inline: false }
      ],
      color: BRAND_COLOR, thumbnail: { url: LOGO_URL }, footer: { text: `Propojeno s TB: ${user.tbName}`, icon_url: LOGO_URL }
    };
    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "leaderboard") {
    const page = interaction.options.getInteger("strana") ?? 1;
    const type = interaction.options.getString("typ") ?? "eggs";
    const entries = Object.values(eggsData);
    if (!entries.length) return interaction.reply("Zatím nikdo nesbírá.");

    const sorted = entries.sort((a, b) => {
      if (type === "km") return b.totalKm - a.totalKm;
      if (type === "jobs") return b.totalJobs - a.totalJobs;
      return b.totalEggs - a.totalEggs || b.completedDays.length - a.completedDays.length;
    });

    const start = (page - 1) * 10;
    const top = sorted.slice(start, start + 10);
    const lines = top.map((d, i) => {
      const mention = d.discordId ? `<@${d.discordId}>` : d.tbName;
      if (type === "km") return `**${start + i + 1}.** ${mention} — 🧭 **${d.totalKm} km**`;
      if (type === "jobs") return `**${start + i + 1}.** ${mention} — 🚚 **${d.totalJobs} zakázek**`;
      return `**${start + i + 1}.** ${mention} — 🥚 **${d.totalEggs}** (Etap: ${d.completedDays.length}/7)`;
    });

    let title = "🏆 Žebříček (Vajíčka)";
    if (type === "km") title = "🏆 Žebříček (Kilometry)";
    if (type === "jobs") title = "🏆 Žebříček (Zakázky)";

    return interaction.reply({ embeds: [{ title, description: lines.join("\n"), color: 0xFFCC00, thumbnail: { url: LOGO_URL }, footer: { text: `Strana ${page} | Celkem: ${sorted.length}`, icon_url: LOGO_URL } }] });
  }

  if (interaction.commandName === "velikonoce") {
    const route = ROUTES.find(r => Date.now() >= r.start && Date.now() < r.end);
    if (!route) return interaction.reply("Momentálně neběží žádná velikonoční etapa.");
    return interaction.reply({ embeds: [buildEmbed(route, "ACTIVE")], components: buildButton(route) });
  }

  if (interaction.commandName === "link") {
    const nick = interaction.options.getString("tb_nick").trim();
    if (!eggsData[nick]) eggsData[nick] = { tbName: nick, discordId: interaction.user.id, completedDays: [], totalEggs: 0, totalKm: 0, totalJobs: 0, bonusClaimed: false, routes: {} };
    else eggsData[nick].discordId = interaction.user.id;
    saveAll();
    return interaction.reply({ content: `✅ Úspěšně propojeno!`, ephemeral: true });
  }

  // --- ADMIN COMMANDS ---
  if (interaction.commandName === "admin-link") {
    const user = interaction.options.getUser("uzivatel");
    const nick = interaction.options.getString("tb_nick").trim();
    if (!eggsData[nick]) eggsData[nick] = { tbName: nick, discordId: user.id, completedDays: [], totalEggs: 0, totalKm: 0, totalJobs: 0, bonusClaimed: false, routes: {} };
    else eggsData[nick].discordId = user.id;
    saveAll();
    return interaction.reply(`✅ Admin: Propojil jsem ${user} s TB: **${nick}**`);
  }

  if (interaction.commandName === "unlink") {
    const nick = interaction.options.getString("tb_nick").trim();
    if (eggsData[nick]) { eggsData[nick].discordId = null; saveAll(); return interaction.reply(`✅ Odpojeno: **${nick}**`); }
    return interaction.reply("❌ Nick nenalezen.");
  }

  if (interaction.commandName === "admin-publish") {
    await interaction.deferReply({ ephemeral: true });
    const dayNum = interaction.options.getInteger("den");
    const route = ROUTES.find(r => r.day === dayNum);
    if (!route || !config.channelId) return interaction.editReply("❌ Chyba trasy nebo kanálu.");
    const channel = await client.channels.fetch(config.channelId).catch(() => null);
    if (!channel) return interaction.editReply("❌ Kanál nenalezen.");

    const yesterday = route.day - 1;
    if (config.messages[yesterday]) {
      try {
        const oldMsg = await channel.messages.fetch(config.messages[yesterday]);
        await oldMsg.edit({ embeds: [buildEmbed(ROUTES.find(r => r.day === yesterday), "EXPIRED")], components: [] });
      } catch (e) {}
    }

    const msg = await channel.send({ content: "🛠️ **[TEST]** Ruční publikace trasy", embeds: [buildEmbed(route, "ACTIVE")], components: buildButton(route) });
    config.messages[route.day] = msg.id;
    config.lastPublishedDay = route.day;
    saveAll();
    return interaction.editReply(`✅ Publikováno.`);
  }

  if (interaction.commandName === "admin-add-egg") {
    await interaction.deferReply({ ephemeral: true });
    const tbNick = interaction.options.getString("tb_nick").trim();
    const dayNum = interaction.options.getInteger("den");
    const userObj = interaction.options.getUser("uzivatel");

    if (!eggsData[tbNick]) eggsData[tbNick] = { tbName: tbNick, discordId: null, completedDays: [], totalEggs: 0, totalKm: 0, totalJobs: 0, bonusClaimed: false, routes: {} };
    const user = eggsData[tbNick];
    
    if (userObj) user.discordId = userObj.id;

    user.totalEggs += 1;
    if (!user.completedDays.includes(dayNum)) user.completedDays.push(dayNum);
    if (user.completedDays.length === 7 && !user.bonusClaimed) { user.totalEggs += 3; user.bonusClaimed = true; }
    saveAll();
    return interaction.editReply(`✅ Přidáno. Celkem má: ${user.totalEggs} 🥚`);
  }

  if (interaction.commandName === "admin-egg-dump") {
    const file = new AttachmentBuilder(Buffer.from(JSON.stringify(eggsData, null, 2)), { name: 'eggs.json' });
    return interaction.reply({ files: [file], ephemeral: true });
  }

  // --- ANALÝZY ---
  async function runAnalysis(fullReset) {
    if (fullReset) {
      eggsData = {}; config.dailyHare = {}; processed = {}; saveAll();
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
        const f = e.fields?.find(field => field.name.toLowerCase().includes('odkud'))?.value;
        const t = e.fields?.find(field => field.name.toLowerCase().includes('kam'))?.value;
        const n = e.author?.name || e.fields?.find(field => field.name.toLowerCase().includes('řidič'))?.value;
        
        if (f && t && n) {
          const earned = await processJob(n.trim(), f, t, e, m.id, m.createdTimestamp, true);
          if (earned > 0) rewarded++;
        }
      }
      lastId = msgs[msgs.length - 1].id;
    }
    return { scanned, rewarded };
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
});

// --- ŽIVÝ POSLECH ZAKÁZEK ---
client.on('messageCreate', async (m) => {
  if (m.channel.id !== JOBS_CHANNEL_ID || !m.embeds.length) return;
  const e = m.embeds[0];
  const f = e.fields?.find(field => field.name.toLowerCase().includes('odkud'))?.value;
  const t = e.fields?.find(field => field.name.toLowerCase().includes('kam'))?.value;
  const n = e.author?.name || e.fields?.find(field => field.name.toLowerCase().includes('řidič'))?.value;
  if (f && t && n) await processJob(n.trim(), f, t, e, m.id);
});

// --- AUTO UPDATE (16:00) ---
async function autoUpdate() {
  if (!config.channelId) return;
  const route = ROUTES.find(r => Date.now() >= r.start && Date.now() < r.end);
  if (!route || config.lastPublishedDay === route.day) return;

  const channel = await client.channels.fetch(config.channelId).catch(() => null);
  if (channel) {
    const yesterday = route.day - 1;
    if (config.messages[yesterday]) {
      try {
        const oldMsg = await channel.messages.fetch(config.messages[yesterday]);
        await oldMsg.edit({ embeds: [buildEmbed(ROUTES.find(r => r.day === yesterday), "EXPIRED")], components: [] });
      } catch (err) {}
    }
    const msg = await channel.send({ content: "@everyone", embeds: [buildEmbed(route, "ACTIVE")], components: buildButton(route) });
    config.messages[route.day] = msg.id;
    config.lastPublishedDay = route.day;
    saveAll();
  }
}

client.once("ready", () => {
  console.log(`Bot přihlášen jako ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  setInterval(autoUpdate, 60000);
});

client.login(TOKEN);
