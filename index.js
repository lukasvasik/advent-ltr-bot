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
const JOBS_CHANNEL_ID = process.env.JOBS_CHANNEL_ID || '1149900706543833208';
const BRAND_COLOR = 0x8A2BE2;
const LOGO_URL = "https://i.imgur.com/fdvSTG2.png"; 

if (!TOKEN) throw new Error('❌ DISCORD_TOKEN chybí.');

// ROLE IDs
const ROLE_EVENT_HAUL = '1500670438630756464'; // Mistr Čaroděj
const ROLE_BLACK_MAGIC = '1500670224461074492'; // Pán Stínů (Varianta A)
const ROLE_WHITE_MAGIC = '1500670331063505066'; // Bílý Mág (Varianta B)

const YEAR = 2026;
const START_HOUR_UTC = 16; 
const EVENT_START = Date.UTC(YEAR, 4, 4, START_HOUR_UTC, 0, 0); 

const getWindow = (dayNum) => ({
  start: Date.UTC(YEAR, 4, dayNum, START_HOUR_UTC, 0, 0),
  end:   Date.UTC(YEAR, 4, dayNum + 1, START_HOUR_UTC, 0, 0)
});

// ─────────────────────────────────────────────
// TRASY 
// ─────────────────────────────────────────────
const ROUTES = [
  // DEN 1
  { day: 1, variant: 'A', from: "Kiel", to: "Erfurt", dist: 459, activeImage: "https://i.imgur.com/V6nPBA0.png", mapUrl: "https://i.imgur.com/V6nPBA0.png", ...getWindow(4) },
  { day: 1, variant: 'B', from: "Brusel", to: "Erfurt", dist: 459, activeImage: "https://i.imgur.com/Wrjmm39.png", mapUrl: "https://i.imgur.com/Wrjmm39.png", ...getWindow(4) },
  // DEN 2
  { day: 2, variant: 'A', from: "Praha", to: "Hannover", dist: 530, activeImage: "https://i.imgur.com/hzZv8xf.png", mapUrl: "https://i.imgur.com/hzZv8xf.png", ...getWindow(5) },
  { day: 2, variant: 'B', from: "Groningen", to: "Hannover", dist: 347, activeImage: "https://i.imgur.com/ag15MhP.png", mapUrl: "https://i.imgur.com/ag15MhP.png", ...getWindow(5) },
  // DEN 3
  { day: 3, variant: 'A', from: "Groningen", to: "Kassel", dist: 385, activeImage: "https://i.imgur.com/WmhUy5g.png", mapUrl: "https://i.imgur.com/WmhUy5g.png", ...getWindow(6) },
  { day: 3, variant: 'B', from: "Stetin", to: "Kassel", dist: 520, activeImage: "https://i.imgur.com/1R6dCAa.png", mapUrl: "https://i.imgur.com/1R6dCAa.png", ...getWindow(6) },
  // DEN 4
  { day: 4, variant: 'A', from: "Brusel", to: "Hannover", dist: 257, activeImage: "https://i.imgur.com/SydOWKW.png", mapUrl: "https://i.imgur.com/SydOWKW.png", ...getWindow(7) },
  { day: 4, variant: 'B', from: "Kiel", to: "Hannover", dist: 257, activeImage: "https://i.imgur.com/6sazkud.png", mapUrl: "https://i.imgur.com/6sazkud.png", ...getWindow(7) },
  // DEN 5
  { day: 5, variant: 'A', from: "Praha", to: "Erfurt", dist: 340, activeImage: "https://i.imgur.com/wAMChxt.png", mapUrl: "https://i.imgur.com/wAMChxt.png", ...getWindow(8) },
  { day: 5, variant: 'B', from: "Stetin", to: "Erfurt", dist: 444, activeImage: "https://i.imgur.com/Mk1G9CK.png", mapUrl: "https://i.imgur.com/Mk1G9CK.png", ...getWindow(8) },
  // DEN 6
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
  bloodMoon: { activeUntil: 0, announced: false } 
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

  if (!orbsData[tbName]) orbsData[tbName] = { 
    tbName, discordId: null, completedDays: [], totalOrbs: 0, totalKm: 0, totalJobs: 0, bonusClaimed: false, 
    routes: {}, lastVariant: null, inventory: { talisman: 0, doublePotionUntil: 0 } 
  };
  const user = orbsData[tbName];
  
  if (!user.discordId && !isAnalysis) await tryAutoLink(tbName);
  
  user.totalJobs += 1;
  user.totalKm += route.dist;
  
  const routeKey = `${route.from} → ${route.to} (${route.variant})`;
  user.routes[routeKey] = (user.routes[routeKey] || 0) + 1;

  // ZÁKLADNÍ ODMĚNA A KOMBO
  let earned = 1;
  let comboMessage = "";
  if (user.lastVariant && user.lastVariant !== route.variant) {
    earned += 2; // Alchymistický lektvar (střídání)
    comboMessage = " 🧪 *Namíchal jsi alchymistický lektvar (+2 Orby za střídání)!*";
  }
  user.lastVariant = route.variant;

  // PROKLETÍ NÁKLADU (15% šance)
  let isCursed = Math.random() < 0.15;
  let curseMessage = "";
  if (isCursed) {
    if (user.inventory.talisman > 0) {
      user.inventory.talisman -= 1;
      curseMessage = " 🛡️ *Čarodějnice se tě pokusila okrást, ale Talisman Ochrany magii odrazil!*";
    } else {
      earned = 0;
      curseMessage = " 💀 *Tvůj náklad byl proklet čarodějnicí. Nezískáváš žádné orby!*";
    }
  }

  // MULTIPLIKÁTORY (Krvavý měsíc & Lektvar zdvojení)
  if (earned > 0) {
    let multiplier = 1;
    if (config.bloodMoon.activeUntil > ts) multiplier *= 2;
    if (user.inventory.doublePotionUntil > ts) multiplier *= 2;
    earned *= multiplier;
  }

  user.totalOrbs += earned;

  // DENNÍ MISTŘI (Bílá/Černá magie)
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
        
        if (config.channelId) {
          const ch = await client.channels.fetch(config.channelId);
          await ch.send(`🔮 **Prvním ${title} dne #${route.day}** se stává <@${user.discordId}>! 🏆`);
        }
      } catch(e) { console.error(e); }
    }
  }

  if (!user.completedDays.includes(route.day) && earned > 0) {
    user.completedDays.push(route.day);
  }

  // SPLNĚNÍ EVENTU
  if (user.completedDays.length >= 6 && !user.bonusClaimed) {
    user.totalOrbs += 10; // Extra bonus
    user.bonusClaimed = true;
    if (user.discordId) await tryAssignRole(user.discordId, ROLE_EVENT_HAUL, "Splněno 6 etap");
  }

  processed[msgId] = true;
  saveAll();

  // NOTIFIKACE NA DISCORD
  if (!isAnalysis && user.discordId && config.channelId) {
    const ch = await client.channels.fetch(config.channelId).catch(()=>null);
    if (ch && (curseMessage !== "" || comboMessage !== "" || earned > 1)) {
       ch.send(`<@${user.discordId}> odevzdal zakázku! Získal **${earned} 🔮**${comboMessage}${curseMessage}`);
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
  const timeText = `${st.getUTCDate()}.5. ${String(st.getUTCHours() + 2).padStart(2, '0')}:00 – ${en.getUTCDate()}.5. ${String(en.getUTCHours() + 2).padStart(2, '0')}:00`;
  
  return routes.map(route => ({
    title: `🔮 Čarodějnický Event – Den #${route.day} (Varianta ${route.variant} - ${route.variant === 'A' ? 'Černá' : 'Bílá'} Magie)`,
    description: isActive 
      ? `**Start:** ${route.from}\n**Cíl:** ${route.to}\n**Délka:** cca ${route.dist} km\n**Čas:** ${timeText}\n\nStřídej varianty A a B pro kombo bonus +2 Orby! Dej si pozor na prokletý náklad.` 
      : `**Tato etapa už skončila.**`,
    color: route.variant === 'A' ? 0x2C2F33 : 0xF5F5DC,
    image: { url: isActive ? route.activeImage : null },
    footer: { text: `Luky Transport • Čarodějnický Event 2026` }
  }));
}

const buildShopEmbed = (userOrbs) => ({
  title: "🛒 Čarodějnický Obchod",
  description: `Tvé orby: **${userOrbs} 🔮**\nVyber si magický předmět k zakoupení:`,
  color: BRAND_COLOR,
  fields: [
    { name: "1️⃣ Věštecká koule (3 Orby)", value: "Odhalí čas Krvavého měsíce." },
    { name: "2️⃣ Talisman Ochrany (5 Orbů)", value: "Jednorázově blokuje Prokletý náklad." },
    { name: "3️⃣ Lektvar Zdvojení (15 Orbů)", value: "2x více orbů po dobu 60 minut." },
    { name: "4️⃣ Risky Potion (10 Orbů)", value: "Vypij a riskuj! (Šance na 0 až 15 orbů)." },
    { name: "5️⃣ Role Mistr Čaroděj (50 Orbů)", value: "Exkluzivní role navždy." }
  ]
});

// ─────────────────────────────────────────────
// PŘÍKAZY
// ─────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName("orby").setDescription("Ukáže tvůj stav magických orbů."),
  new SlashCommandBuilder().setName("event").setDescription("Zobrazí aktuální trasy."),
  new SlashCommandBuilder().setName("obchod").setDescription("Otevře čarodějnický obchod."),
  new SlashCommandBuilder().setName("link").setDescription("Propojí Discord s TrucksBook nickem.")
    .addStringOption(o => o.setName("tb_nick").setRequired(true).setDescription("Nick na Trucksbooku")),
  new SlashCommandBuilder().setName("setup").setDescription("Nastavit kanál eventu.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-bloodmoon").setDescription("ADMIN: Spustí Krvavý měsíc na 2 hodiny.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("full-test").setDescription("ADMIN: Otestuje publikaci embedů do kanálu.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(c => c.toJSON());

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent ]});

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    
    if (interaction.commandName === "orby") {
      const user = Object.values(orbsData).find(e => e.discordId === interaction.user.id);
      if (!user) return interaction.reply({ content: "Zatím nemáš žádné orby. Propoj se přes `/link`!", ephemeral: true });
      
      let doubleTime = user.inventory.doublePotionUntil > Date.now() ? `<t:${Math.floor(user.inventory.doublePotionUntil/1000)}:R>` : "Neaktivní";
      
      return interaction.reply({ embeds: [{ title: "🔮 Tvůj kotlík", fields: [
        { name: "Orby", value: `**${user.totalOrbs}** 🔮`, inline: true }, 
        { name: "Etapy", value: `**${user.completedDays.length}/6**`, inline: true }, 
        { name: "🚚 Zakázky", value: `${user.totalJobs}`, inline: true }, 
        { name: "🛡️ Talismany", value: `${user.inventory.talisman}x`, inline: true },
        { name: "⏳ Lektvar zdvojení", value: doubleTime, inline: true },
        { name: "Poslední trasa", value: user.lastVariant ? `Varianta ${user.lastVariant}` : "Žádná", inline: true }
      ], color: BRAND_COLOR }]});
    }

    if (interaction.commandName === "event") {
      const route = ROUTES.find(r => Date.now() >= r.start && Date.now() < r.end);
      if (!route) return interaction.reply("Neběží žádná etapa.");
      return interaction.reply({ embeds: buildEmbedsForDay(route.day, true) });
    }

    if (interaction.commandName === "link") {
      const nick = interaction.options.getString("tb_nick").trim();
      if (!orbsData[nick]) orbsData[nick] = { tbName: nick, discordId: interaction.user.id, completedDays: [], totalOrbs: 0, totalKm: 0, totalJobs: 0, bonusClaimed: false, routes: {}, lastVariant: null, inventory: { talisman: 0, doublePotionUntil: 0 } };
      else orbsData[nick].discordId = interaction.user.id;
      saveAll();
      return interaction.reply({ content: `✅ Propojeno s **${nick}**`, ephemeral: true });
    }

    if (interaction.commandName === "setup") {
      config.channelId = interaction.channel.id; saveAll();
      return interaction.reply({ content: "📌 Kanál pro event nastaven.", ephemeral: true });
    }

    if (interaction.commandName === "admin-bloodmoon") {
      config.bloodMoon.activeUntil = Date.now() + (2 * 60 * 60 * 1000); // 2 hodiny
      config.bloodMoon.announced = true;
      saveAll();
      interaction.reply("🌕 **KRVAVÝ MĚSÍC POVSTAL!** Následující 2 hodiny dávají všechny zakázky 2x více Orbů!");
      return;
    }

    if (interaction.commandName === "full-test") {
      await interaction.reply({ content: "🛠️ Odesílám testovací embedy pro den 6.", ephemeral: true });
      await interaction.channel.send({ embeds: buildEmbedsForDay(6, true) });
      return;
    }

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

      return interaction.reply({ embeds: [buildShopEmbed(user.totalOrbs)], components: [row1, row2], ephemeral: true });
    }
  }

  // Zpracování tlačítek v obchodu
  if (interaction.isButton() && interaction.customId.startsWith('buy_')) {
    const userObj = Object.values(orbsData).find(e => e.discordId === interaction.user.id);
    if (!userObj) return interaction.reply({ content: "Chyba uživatele.", ephemeral: true });

    let cost = 0; let replyMsg = "";
    
    if (interaction.customId === 'buy_crystal') cost = 3;
    else if (interaction.customId === 'buy_talisman') cost = 5;
    else if (interaction.customId === 'buy_double') cost = 15;
    else if (interaction.customId === 'buy_risk') cost = 10;
    else if (interaction.customId === 'buy_role') cost = 50;

    if (userObj.totalOrbs < cost) return interaction.reply({ content: `❌ Nemáš dostatek orbů. Potřebuješ jich ${cost}.`, ephemeral: true });

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
      else if (roll < 95) won = 10;
      else won = 15;
      
      userObj.totalOrbs += won;
      replyMsg = `🎲 Vypil jsi Risky Potion a tvé tělo se zachvělo... Získáváš zpět **${won} orbů**!`;
    }
    else if (interaction.customId === 'buy_role') {
      await tryAssignRole(interaction.user.id, ROLE_EVENT_HAUL, "Nákup v obchodu");
      replyMsg = "🎓 Zakoupil jsi roli Mistr Čaroděj. Zkontroluj si profil!";
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

client.once("ready", () => {
  console.log(`Bot Čarodějnice přihlášen.`);
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
});

client.login(TOKEN);
