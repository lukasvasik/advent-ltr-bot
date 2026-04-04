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

const ROLE_EASTER_HAUL = '1489754575199015012';
const ROLE_ZAJIC_DNE = '1489757276435648552';

const YEAR = 2026;
const START_HOUR_UTC = 14; 
const EVENT_START = Date.UTC(YEAR, 3, 4, START_HOUR_UTC, 0, 0); // Posunuto na 4.4.2026

const getWindow = (dayNum) => ({
  start: Date.UTC(YEAR, 3, dayNum, START_HOUR_UTC, 0, 0),
  end:   Date.UTC(YEAR, 3, dayNum + 1, START_HOUR_UTC, 0, 0)
});

// ─────────────────────────────────────────────
// TRASY - FINÁLNÍ OBRÁZKY
// ─────────────────────────────────────────────
const ROUTES = [
  { day: 1, from: "Bratislava", to: "Poznaň", dist: 564, activeImage: "https://i.imgur.com/EWPSeZW.png", expiredImage: "https://i.imgur.com/jZ3FoDE.png", mapUrl: "https://i.imgur.com/c1VoCwa.png", ...getWindow(4) },
  { day: 2, from: "Poznaň", to: "Hannover", dist: 474, activeImage: "https://i.imgur.com/LZwpg0Q.png", expiredImage: "https://i.imgur.com/WedlQ26.png", mapUrl: "https://i.imgur.com/XVbmplo.png", ...getWindow(5) },
  { day: 3, from: "Hannover", to: "Calais", dist: 643, activeImage: "https://i.imgur.com/3HPnYmt.png", expiredImage: "https://i.imgur.com/sBISFuS.png", mapUrl: "https://i.imgur.com/nh35TGN.png", ...getWindow(6) },
  { day: 4, from: "Calais", to: "Ženeva", dist: 872, activeImage: "https://i.imgur.com/DTKOMFh.png", expiredImage: "https://i.imgur.com/4TazZvs.png", mapUrl: "https://i.imgur.com/7OfAdQl.png", ...getWindow(7) },
  { day: 5, from: "Ženeva", to: "Verona", dist: 662, activeImage: "https://i.imgur.com/h6Sx4Xb.png", expiredImage: "https://i.imgur.com/3ycQD7l.png", mapUrl: "https://i.imgur.com/gleD0Ju.png", ...getWindow(8) },
  { day: 6, from: "Verona", to: "Stuttgart", dist: 613, activeImage: "https://i.imgur.com/yOjmeKk.png", expiredImage: "https://i.imgur.com/OltNn8X.png", mapUrl: "https://i.imgur.com/sLPk44s.png", ...getWindow(9) },
  { day: 7, from: "Stuttgart", to: "Praha", dist: 509, activeImage: "https://i.imgur.com/ULTiW56.png", expiredImage: "https://i.imgur.com/LotLCtz.png", mapUrl: "https://i.imgur.com/AHIKyMT.png", ...getWindow(10) }
];

const CITY_SYNONYMS = {
  'praha': 'praha', 'prague': 'praha', 'prag': 'praha',
  'bratislava': 'bratislava', 'pressburg': 'bratislava',
  'poznan': 'poznaň', 'poznaň': 'poznaň',
  'hannover': 'hannover', 'hanover': 'hannover',
  'calais': 'calais', 'zeneva': 'ženeva', 'ženeva': 'ženeva', 'geneve': 'ženeva',
  'verona': 'verona', 'stuttgart': 'stuttgart', 'viden': 'viden', 'vienna': 'viden'
};

function normalize(text) {
  if (!text || typeof text !== 'string') return '';
  const base = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  for (const [key, val] of Object.entries(CITY_SYNONYMS)) { if (base.includes(key)) return val; }
  return base;
}

function extractDistanceKm(embed) {
  if (!embed) return null;
  const distField = embed.fields?.find(f => f.name && f.name.toLowerCase().includes('vzdálenost'));
  const text = distField ? distField.value : embed.description;
  if (!text) return null;
  const match = text.replace(/\s+/g, ' ').match(/(\d[\d\s.,]*)\s*km/i);
  return match ? Number(match[1].replace(/\s+/g, '').replace(',', '.')) : null;
}

let eggsData = fs.existsSync(EGGS_PATH) ? JSON.parse(fs.readFileSync(EGGS_PATH, 'utf8')) : {};
let config = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) : { channelId: null, lastPublishedDay: 0, messages: {}, dailyHare: {} };
let processed = fs.existsSync(PROCESSED_PATH) ? JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf8')) : {};

const saveAll = () => {
  fs.writeFileSync(EGGS_PATH, JSON.stringify(eggsData, null, 2));
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  fs.writeFileSync(PROCESSED_PATH, JSON.stringify(processed, null, 2));
};

// ─────────────────────────────────────────────
// MIGRACE: Záchrana starých dat a oprava formátu
// ─────────────────────────────────────────────
for (const user of Object.values(eggsData)) {
  // Pojistka proti pádu: vytvoří atributy, pokud uživatel vznikl ve staré verzi kódu
  if (!user.routes) user.routes = {};
  if (typeof user.totalJobs !== 'number') user.totalJobs = 0;
  if (typeof user.totalKm !== 'number') user.totalKm = 0;
  if (!user.completedDays) user.completedDays = [];

  const fixedRoutes = {};
  for (const [key, val] of Object.entries(user.routes)) {
    const fixedKey = key.split(' → ').map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(' → ');
    fixedRoutes[fixedKey] = (fixedRoutes[fixedKey] || 0) + val;
  }
  user.routes = fixedRoutes;
}
saveAll();

async function tryAssignRole(memberId, roleId, reason) {
  if (!GUILD_ID || !memberId || !roleId) return;
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(memberId);
    if (!member.roles.cache.has(roleId)) await member.roles.add(roleId, reason);
  } catch (e) {
    console.error(`Chyba při přiřazování role ${roleId} uživateli ${memberId}:`, e.message);
  }
}

async function tryAutoLink(tbName) {
  if (!GUILD_ID || !tbName) return;
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();
    const target = tbName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = guild.members.cache.find(m => m.displayName.toLowerCase().replace(/[^a-z0-9]/g, '').includes(target) || m.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').includes(target));
    if (match && target.length >= 3) {
      eggsData[tbName].discordId = match.id;
      saveAll();
    }
  } catch (e) {
    console.error(`Chyba při auto-linku pro ${tbName}:`, e.message);
  }
}

// ─────────────────────────────────────────────
// ZPRACOVÁNÍ JÍZDY A HAZARD
// ─────────────────────────────────────────────
async function processJob(tbName, fromRaw, toRaw, embed, msgId, ts = Date.now(), isAnalysis = false) {
  if (processed[msgId]) return 0;
  
  const from = normalize(fromRaw);
  const to = normalize(toRaw);
  
  // STRIKTNÍ SMĚR JÍZDY: Odkud -> Kam
  const route = ROUTES.find(r => ts >= r.start && ts < r.end && from === normalize(r.from) && to === normalize(r.to));
  if (!route) return 0;

  if (!isAnalysis) console.log(`[DEBUG] Nalezena platná trasa (Den #${route.day}) pro řidiče ${tbName}`);

  if (!eggsData[tbName]) eggsData[tbName] = { tbName, discordId: null, completedDays: [], totalEggs: 0, totalKm: 0, totalJobs: 0, bonusClaimed: false, routes: {} };
  const user = eggsData[tbName];
  
  if (!user.discordId && !isAnalysis) await tryAutoLink(tbName);
  
  const km = extractDistanceKm(embed) || route.dist;
  user.totalJobs += 1;
  user.totalKm += km;
  
  const routeKey = `${route.from} → ${route.to}`;
  user.routes[routeKey] = (user.routes[routeKey] || 0) + 1;

  let earned = 1;
  const rand = Math.random() * 100;
  if (rand <= 1) earned += 5; 
  else if (rand <= 11) earned += 1;
  user.totalEggs += earned;

  // ZAJÍC DNE A KOMPLETACE
  if (!user.completedDays.includes(route.day)) {
    user.completedDays.push(route.day);
    
    if (!isAnalysis) {
      if (user.discordId && !config.dailyHare[route.day]) {
        console.log(`[DEBUG] Přiděluji Zajíce dne pro den #${route.day} uživateli ${tbName}`);
        config.dailyHare[route.day] = user.discordId;
        try {
          const guild = await client.guilds.fetch(GUILD_ID);
          const currentHares = guild.members.cache.filter(m => m.roles.cache.has(ROLE_ZAJIC_DNE));
          for (const [id, member] of currentHares) await member.roles.remove(ROLE_ZAJIC_DNE);
          await tryAssignRole(user.discordId, ROLE_ZAJIC_DNE, `Zajíc dne ${route.day}`);
          if (config.channelId) {
            const ch = await client.channels.fetch(config.channelId);
            await ch.send(`🐰 **Zajícem dne #${route.day}** se stává <@${user.discordId}>! Byl první! 🏆`);
          }
        } catch(e) {
          console.error(`Chyba při logice Zajíce dne pro den ${route.day}:`, e.message);
        }
      } else if (!user.discordId && !config.dailyHare[route.day]) {
         console.log(`[DEBUG] Zajíc dne PŘESKOČEN - uživatel ${tbName} byl sice první, ale nemá propojený Discord (chybí ID). Role bude udělena dalšímu v pořadí s propojeným účtem.`);
      }
    }
  }

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
// VIZUÁL (EMBEDY)
// ─────────────────────────────────────────────
function buildEmbed(route, state) {
  const st = new Date(route.start);
  const en = new Date(route.end);
  const timeText = `${st.getUTCDate()}.4. ${String(st.getUTCHours() + 2).padStart(2, '0')}:00 – ${en.getUTCDate()}.4. ${String(en.getUTCHours() + 2).padStart(2, '0')}:00`;
  const isActive = state === "ACTIVE";
  return {
    title: `🥚 Velikonoční jízda – Den #${route.day}`,
    description: isActive 
      ? `**Trasa je právě AKTIVNÍ!**\n\n**Start:** ${route.from}\n**Cíl:** ${route.to}\n**Délka:** ${route.dist} km\n**Čas:** ${timeText}\n\nOdvez tuto trasu a získej vajíčko! Trasu můžeš jet opakovaně. Máš 10% šanci na bonus a 1% šanci na Jackpot! 🥚\n\n*(Pozor: Počítá se jen směr ${route.from} -> ${route.to})*\n\nKlikni na tlačítko níže pro zobrazení mapy 👇` 
      : `**Tato etapa už skončila.**\nSleduj aktuální trasu dne!`,
    color: isActive ? BRAND_COLOR : 0x99aab5,
    image: { url: isActive ? route.activeImage : route.expiredImage },
    thumbnail: { url: LOGO_URL },
    footer: { text: `Luky Transport • Velikonoční Event 2026`, icon_url: LOGO_URL }
  };
}

const buildButton = (route) => [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Zobrazit mapu trasy!").setStyle(ButtonStyle.Link).setURL(route.mapUrl))];

// ─────────────────────────────────────────────
// PŘÍKAZY
// ─────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName("vajicka").setDescription("Ukáže tvůj stav velikonočních vajíček a statistik."),
  new SlashCommandBuilder().setName("leaderboard").setDescription("Zobrazí žebříček sběratelů vajíček.")
    .addStringOption(o => o.setName("typ").setDescription("Řazení").addChoices({name: "Vajíčka", value: "eggs"}, {name: "Kilometry", value: "km"}, {name: "Zakázky", value: "jobs"}))
    .addIntegerOption(o => o.setName("strana").setDescription("Strana žebříčku").setMinValue(1)),
  new SlashCommandBuilder().setName("velikonoce").setDescription("Zobrazí aktuální trasu pro dnešní den."),
  new SlashCommandBuilder().setName("link").setDescription("Propojí tvůj Discord s TrucksBook nickem.")
    .addStringOption(o => o.setName("tb_nick").setRequired(true).setDescription("Nick na Trucksbooku")),
  new SlashCommandBuilder().setName("setup").setDescription("Nastavit kanál pro auto-publikaci.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-publish").setDescription("Ručně publikovat den.")
    .addIntegerOption(o => o.setName("den").setDescription("Číslo dne (1-7)").setRequired(true).setMinValue(1).setMaxValue(7)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-link").setDescription("Ručně propojit Discord s TB.")
    .addUserOption(o => o.setName("uzivatel").setDescription("Uživatel").setRequired(true))
    .addStringOption(o => o.setName("tb_nick").setDescription("Přesný TB nick").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("unlink").setDescription("Odstranit propojení účtu.")
    .addStringOption(o => o.setName("tb_nick").setDescription("Přesný TB nick").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-add-egg").setDescription("Ručně přidat vajíčko.")
    .addStringOption(o => o.setName("tb_nick").setDescription("Přesný TB nick").setRequired(true))
    .addIntegerOption(o => o.setName("den").setDescription("Za jaký den (1-7)").setRequired(true))
    .addUserOption(o => o.setName("uzivatel").setDescription("Volitelné propojení").setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("analyzovat").setDescription("Doplnit vajíčka a statistiky z historie.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("fullanalyze").setDescription("Smazat vajíčka a přepočítat je z historie od nuly!").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("analyzovat-zajice").setDescription("ADMIN: Zpětně určit Zajíce dne.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("full-test").setDescription("ADMIN: Rychlá simulace události (všechny dny po 15s).").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-egg-dump").setDescription("Export databáze do JSON.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-egg-load").setDescription("ADMIN: Nahrát JSON zálohu s databází vajíček.")
    .addAttachmentOption(o => o.setName("soubor").setDescription("Záložní .json soubor (z admin-egg-dump)").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(c => c.toJSON());

const client = new Client({ intents: [
  GatewayIntentBits.Guilds, 
  GatewayIntentBits.GuildMessages, 
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.MessageContent // Nutné pro živý poslech embedů ze zakázek
]});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "full-test") {
    await interaction.reply({ content: "🛠️ Spouštím **FULL TEST** systému. Během následujících 2 minut uvidíš v tomto kanálu simulaci celého eventu.", ephemeral: true });
    let currentTestDay = 1;
    const testInterval = setInterval(async () => {
      const route = ROUTES.find(r => r.day === currentTestDay);
      if (!route) {
        clearInterval(testInterval);
        return interaction.channel.send("✅ **TEST DOKONČEN.** Všechny obrázky a stavy byly nasimulovány. Nezapomeň před ostrým startem smazat `.json` soubory!");
      }
      const prevDay = currentTestDay - 1;
      if (config.messages[prevDay]) {
        try {
          const oldMsg = await interaction.channel.messages.fetch(config.messages[prevDay]);
          await oldMsg.edit({ embeds: [buildEmbed(ROUTES.find(r => r.day === prevDay), "EXPIRED")], components: [] });
        } catch (e) {
          console.error(`Chyba při simulaci expirace dne ${prevDay}:`, e.message);
        }
      }
      const msg = await interaction.channel.send({ content: `🛠️ **[TEST Simulace]**`, embeds: [buildEmbed(route, "ACTIVE")], components: buildButton(route) });
      config.messages[currentTestDay] = msg.id;
      currentTestDay++;
    }, 15000);
    return;
  }

  if (interaction.commandName === "setup") { config.channelId = interaction.channel.id; saveAll(); return interaction.reply({ content: "📌 Kanál nastaven.", ephemeral: true }); }
  
  if (interaction.commandName === "vajicka") {
    const user = Object.values(eggsData).find(e => e.discordId === interaction.user.id);
    if (!user) return interaction.reply({ content: "Zatím nemáš žádná vajíčka. Propoj se přes `/link`!", ephemeral: true });
    
    let favRoute = "Žádná";
    let maxR = 0;
    for (const [r, count] of Object.entries(user.routes)) { if (count > maxR) { maxR = count; favRoute = r; } }

    return interaction.reply({ embeds: [{ title: "🥚 Tvůj košík", fields: [
      { name: "Vajíčka", value: `**${user.totalEggs}** 🥚`, inline: true }, 
      { name: "Etapy", value: `**${user.completedDays.length}/7**`, inline: true }, 
      { name: "Bonus komplet", value: user.bonusClaimed ? "✅ Připsáno" : "❌ Chybí", inline: false },
      { name: "🚚 Zakázky", value: `${user.totalJobs}`, inline: true }, 
      { name: "🧭 Kilometry", value: `${user.totalKm} km`, inline: true },
      { name: "⭐ Nejčastější", value: `**${favRoute}** (${maxR}x)`, inline: false }
    ], color: BRAND_COLOR, thumbnail: { url: LOGO_URL }, footer: { text: `Propojeno s TB: ${user.tbName}`, icon_url: LOGO_URL } }]});
  }

  if (interaction.commandName === "leaderboard") {
    const page = interaction.options.getInteger("strana") ?? 1;
    const type = interaction.options.getString("typ") ?? "eggs";
    const entries = Object.values(eggsData);
    if (!entries.length) return interaction.reply("Zatím nikdo nesbírá.");
    const sorted = entries.sort((a, b) => type === "km" ? b.totalKm - a.totalKm : (type === "jobs" ? b.totalJobs - a.totalJobs : b.totalEggs - a.totalEggs));
    const start = (page - 1) * 10;
    const top = sorted.slice(start, start + 10);
    const lines = top.map((d, i) => `${start + i + 1}. ${d.discordId ? `<@${d.discordId}>` : d.tbName} — ${type === "km" ? d.totalKm + " km" : (type === "jobs" ? d.totalJobs + " zak." : d.totalEggs + " 🥚")}`);
    return interaction.reply({ embeds: [{ title: `🏆 Žebříček`, description: lines.join("\n"), color: 0xFFCC00, footer: { text: `Strana ${page}` } }] });
  }

  if (interaction.commandName === "velikonoce") {
    const route = ROUTES.find(r => Date.now() >= r.start && Date.now() < r.end);
    if (!route) return interaction.reply("Neběží etapa.");
    return interaction.reply({ embeds: [buildEmbed(route, "ACTIVE")], components: buildButton(route) });
  }

  if (interaction.commandName === "link") {
    const nick = interaction.options.getString("tb_nick").trim();
    if (!eggsData[nick]) eggsData[nick] = { tbName: nick, discordId: interaction.user.id, completedDays: [], totalEggs: 0, totalKm: 0, totalJobs: 0, bonusClaimed: false, routes: {} };
    else eggsData[nick].discordId = interaction.user.id;
    saveAll();
    return interaction.reply({ content: `✅ Propojeno s **${nick}**`, ephemeral: true });
  }

  if (interaction.commandName === "admin-publish") {
    await interaction.deferReply({ ephemeral: true });
    const day = interaction.options.getInteger("den");
    const route = ROUTES.find(r => r.day === day);
    const channel = await client.channels.fetch(config.channelId).catch(() => null);
    if (channel && route) { const msg = await channel.send({ content: "@everyone", embeds: [buildEmbed(route, "ACTIVE")], components: buildButton(route) }); config.messages[day] = msg.id; saveAll(); }
    return interaction.editReply("✅ Publikováno.");
  }

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

  if (interaction.commandName === "admin-egg-load") {
    await interaction.deferReply({ ephemeral: true });
    const attachment = interaction.options.getAttachment("soubor");

    if (!attachment.name.endsWith('.json')) {
      return interaction.editReply("❌ Soubor musí být ve formátu .json!");
    }

    try {
      const response = await fetch(attachment.url);
      const data = await response.json();
      
      eggsData = data;
      saveAll();
      
      return interaction.editReply(`✅ Databáze úspěšně nahrána a obnovena ze souboru **${attachment.name}**.`);
    } catch (error) {
      console.error("Chyba při načítání JSON zálohy:", error);
      return interaction.editReply("❌ Nastala chyba při načítání souboru. Ujisti se, že jde o validní JSON zálohu.");
    }
  }

  if (interaction.commandName === "analyzovat-zajice") {
    await interaction.deferReply({ ephemeral: true });
    const channel = await client.channels.fetch(JOBS_CHANNEL_ID);
    const msgs = await channel.messages.fetch({ limit: 100 });
    const potentialHares = {};
    for (const m of msgs.values()) {
      if (!m.embeds.length) continue;
      const e = m.embeds[0];
      const f = normalize(e.fields?.find(field => field.name?.toLowerCase()?.includes('odkud'))?.value);
      const t = normalize(e.fields?.find(field => field.name?.toLowerCase()?.includes('kam'))?.value);
      const n = e.author?.name || e.fields?.find(field => field.name?.toLowerCase()?.includes('řidič'))?.value;
      const ts = m.createdTimestamp;
      const route = ROUTES.find(r => ts >= r.start && ts < r.end && f === normalize(r.from) && t === normalize(r.to));
      if (route && eggsData[n.trim()]?.discordId) {
        if (!potentialHares[route.day]) potentialHares[route.day] = [];
        potentialHares[route.day].push({ ts, discordId: eggsData[n.trim()].discordId });
      }
    }
    let summary = [];
    for (const day in potentialHares) {
      potentialHares[day].sort((a, b) => a.ts - b.ts);
      const winner = potentialHares[day][0];
      if (!config.dailyHare[day]) {
        config.dailyHare[day] = winner.discordId;
        await tryAssignRole(winner.discordId, ROLE_ZAJIC_DNE, `Zpětně určený Zajíc dne ${day}`);
        summary.push(`Den ${day}: <@${winner.discordId}>`);
      }
    }
    saveAll();
    return interaction.editReply(summary.length ? `✅ Nalezeni noví zajíci:\n${summary.join("\n")}` : "ℹ️ Žádní noví zajíci.");
  }

  async function runAnalysis(fullReset) {
    if (fullReset) { eggsData = {}; config.dailyHare = {}; processed = {}; saveAll(); }
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
    console.log(`[LIVE JOB] Zaznamenána zakázka: ${n.trim()} (${f} -> ${t})`);
    await processJob(n.trim(), f, t, e, m.id, m.createdTimestamp);
  }
});

// ─────────────────────────────────────────────
// AUTO UPDATE (16:00)
// ─────────────────────────────────────────────
async function autoUpdate() {
  if (!config.channelId) return;
  const now = Date.now();
  const route = ROUTES.find(r => now >= r.start && now < r.end);
  if (!route || config.lastPublishedDay === route.day) return;
  const channel = await client.channels.fetch(config.channelId).catch(() => null);
  if (channel) {
    const yesterday = route.day - 1;
    if (config.messages[yesterday]) {
      try {
        const oldMsg = await channel.messages.fetch(config.messages[yesterday]);
        await oldMsg.edit({ embeds: [buildEmbed(ROUTES.find(r => r.day === yesterday), "EXPIRED")], components: [] });
      } catch (e) {
        console.error(`Chyba při automatické expiraci zprávy dne ${yesterday}:`, e.message);
      }
    }
    const msg = await channel.send({ content: "@everyone", embeds: [buildEmbed(route, "ACTIVE")], components: buildButton(route) });
    config.messages[route.day] = msg.id; config.lastPublishedDay = route.day; saveAll();
  }
}

client.once("ready", () => {
  console.log(`Bot Velikonoce přihlášen a připraven.`);
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  setInterval(autoUpdate, 60000);
});

client.login(TOKEN);
