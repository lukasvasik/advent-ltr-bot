import 'dotenv/config';
import {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// ─────────────────────────────────────────────
// KONFIGURACE A CESTY
// ─────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_PATH = path.join(__dirname, 'users_db.json');
const CARDS_PATH = path.join(__dirname, 'cards_db.json');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ID Kanálů
const CH_JOBS = '1149900706543833208';
const CH_MATCHES = '1505183390897279077';
const CH_BETS = '1505183898349338797';
const CH_SHOP = '1505184082898714784';
const CH_MARKET = '1505189708693770300';
const CH_CMDS = '1505236386163458119';
const CH_LOG = '1505235716693561535';
const CH_BACKUP = '1505571130956578917';

// ID Rolí
const ROLE_COLLECTOR = '1505237697533444216';
const ROLE_FAN = '1505237904233070692';
const ROLE_EXPERT = '1505238178271858788';

const EVENT_COLOR = 0xFF2C57;

const SHOP_CATEGORIES = {
  basic: ['random', 'attack', 'defensive', 'lead', 'goal'],
  groups: ['group_a', 'group_b'],
  national: ['cze_col', 'svk_col', 'can_col', 'usa_col', 'swe_col', 'fin_col', 'sui_col', 'lat_col', 'ger_col', 'aut_col', 'hun_col', 'gbr_col', 'den_col', 'nor_col', 'slo_col', 'ita_col']
};

const TEAM_ELO = {
  "Canada": 1800, "Russia": 1780, "Sweden": 1750, "Finland": 1740, 
  "Czechia": 1730, "Czech Republic": 1730, "USA": 1700, "Switzerland": 1650, 
  "Germany": 1600, "Slovakia": 1550, "Latvia": 1500, "Denmark": 1450, 
  "Norway": 1400, "Belarus": 1350, "France": 1350, "Kazakhstan": 1300,
  "Austria": 1250, "Slovenia": 1200, "Hungary": 1150, "Great Britain": 1100, 
  "Poland": 1100, "Italy": 1100
};

// ─────────────────────────────────────────────
// DATABÁZE A PAMĚŤ
// ─────────────────────────────────────────────
let usersDb = fs.existsSync(USERS_PATH) ? JSON.parse(fs.readFileSync(USERS_PATH, 'utf8')) : {};
const cardsDb = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8'));

let activeMatches = {};

const saveUsers = () => fs.writeFileSync(USERS_PATH, JSON.stringify(usersDb, null, 2));

function getUser(id, tbName = null) {
  if (!usersDb[id]) {
    usersDb[id] = { id, tbName: tbName || "Neznámý", pucks: 0, inventory: [], bets: [], lockedCards: {}, km: 0, betsTotal: 0, betsWon: 0 };
  }
  // Zajištění kompatibility starých záznamů s novými sloupci
  if (!usersDb[id].lockedCards) usersDb[id].lockedCards = {};
  if (usersDb[id].km === undefined) usersDb[id].km = 0;
  if (usersDb[id].betsTotal === undefined) usersDb[id].betsTotal = usersDb[id].bets.length || 0;
  if (usersDb[id].betsWon === undefined) usersDb[id].betsWon = 0;
  return usersDb[id];
}

function isCardLocked(user, cardId) {
  if (!user.lockedCards) return false;
  const expiry = user.lockedCards[cardId];
  if (expiry && Date.now() < expiry) return true;
  if (expiry && Date.now() >= expiry) {
    delete user.lockedCards[cardId];
    return false;
  }
  return false;
}

function lockCard(user, cardId, durationMs) {
  if (!user.lockedCards) user.lockedCards = {};
  user.lockedCards[cardId] = Date.now() + durationMs;
}

function unlockCard(user, cardId) {
  if (user.lockedCards && user.lockedCards[cardId]) {
    delete user.lockedCards[cardId];
  }
}

// ─────────────────────────────────────────────
// PŘÍKAZY (SLASH COMMANDS)
// ─────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName("puky").setDescription("Zobrazí tvůj aktuální stav puků."),
  new SlashCommandBuilder().setName("link").setDescription("Propojí tvůj Discord s TrucksBook nickem.")
    .addStringOption(o => o.setName("nick").setDescription("Tvůj nick na TB").setRequired(true)),
  
  // NOVÉ PŘÍKAZY PRO PROFIL A LEADERBOARD
  new SlashCommandBuilder().setName("profil").setDescription("Zobrazí tvoje statistiky z celého eventu.")
    .addUserOption(o => o.setName("uzivatel").setDescription("Čí profil chceš vidět (nepovinné)")),
  new SlashCommandBuilder().setName("leaderboard").setDescription("Zobrazí žebříček nejlepších hráčů.")
    .addStringOption(o => o.setName("kategorie").setDescription("Podle čeho chceš žebříček seřadit?").setRequired(true).addChoices(
        { name: '🏒 Počet Puků', value: 'pucks' },
        { name: '🎴 Počet Karet', value: 'cards' },
        { name: '🚚 Najeté Kilometry', value: 'km' },
        { name: '💰 Vyhrané Sázky', value: 'bets' }
    )),

  new SlashCommandBuilder().setName("album").setDescription("Prohlédni si sbírku karet (svou nebo cizí).")
    .addStringOption(o => o.setName("tym").setDescription("Vyber národní tým").setRequired(true).addChoices(
        { name: '🇨🇿 Česko (CZE)', value: 'CZE' }, { name: '🇸🇰 Slovensko (SVK)', value: 'SVK' },
        { name: '🇨🇦 Kanada (CAN)', value: 'CAN' }, { name: '🇺🇸 USA (USA)', value: 'USA' },
        { name: '🇸🇪 Švédsko (SWE)', value: 'SWE' }, { name: '🇫🇮 Finsko (FIN)', value: 'FIN' },
        { name: '🇨🇭 Švýcarsko (SUI)', value: 'SUI' }, { name: '🇱🇻 Lotyšsko (LAT)', value: 'LAT' },
        { name: '🇩🇪 Německo (GER)', value: 'GER' }, { name: '🇦🇹 Rakousko (AUT)', value: 'AUT' },
        { name: '🇭🇺 Maďarsko (HUN)', value: 'HUN' }, { name: '🇬🇧 Velká Británie (GBR)', value: 'GBR' },
        { name: '🇩🇰 Dánsko (DEN)', value: 'DEN' }, { name: '🇳🇴 Norsko (NOR)', value: 'NOR' },
        { name: '🇸🇮 Slovinsko (SLO)', value: 'SLO' }, { name: '🇮🇹 Itálie (ITA)', value: 'ITA' }
    ))
    .addUserOption(o => o.setName("uzivatel").setDescription("Čí album chceš vidět (nepovinné)")),
  new SlashCommandBuilder().setName("prodat").setDescription("Vystaví tvou kartu na globální tržiště.")
    .addStringOption(o => o.setName("karta_id").setDescription("Vyber kartu k prodeji ze svého inventáře").setRequired(true).setAutocomplete(true))
    .addIntegerOption(o => o.setName("cena").setDescription("Cena v pucích").setRequired(true)),
  new SlashCommandBuilder().setName("trade").setDescription("Nabídne přímou výměnu hráči.")
    .addUserOption(o => o.setName("uzivatel").setDescription("Komu chceš nabídnout trade").setRequired(true))
    .addStringOption(o => o.setName("nabizim").setDescription("Vyber kartu ze svého inventáře").setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName("chci").setDescription("Vyber kartu od druhého hráče").setRequired(true).setAutocomplete(true)),
  new SlashCommandBuilder().setName("vsadit").setDescription("Vsadí puky na nadcházející zápas.")
    .addStringOption(o => o.setName("zapas").setDescription("Vyber zápas z nabídky").setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName("tip").setDescription("Tvůj tip na vítěze").setRequired(true).addChoices({name: 'Výhra Domácí', value: 'home'}, {name: 'Výhra Hosté', value: 'away'}))
    .addIntegerOption(o => o.setName("puky").setDescription("Kolik puků sázíš").setRequired(true)),
  
  // ADMIN PŘÍKAZY
  new SlashCommandBuilder().setName("admin-setup-shop").setDescription("ADMIN: Vykreslí nástěnku do obchodu.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-puky").setDescription("ADMIN: Přidá nebo odebere puky.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName("uzivatel").setDescription("Komu").setRequired(true))
    .addIntegerOption(o => o.setName("pocet").setDescription("Počet puků (+ přidá, - ubere)").setRequired(true)),
  new SlashCommandBuilder().setName("admin-karta").setDescription("ADMIN: Přidá konkrétní kartu hráči.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName("uzivatel").setDescription("Komu").setRequired(true))
    .addStringOption(o => o.setName("karta_id").setDescription("ID karty (např. CZE_A1)").setRequired(true)),
  new SlashCommandBuilder().setName("admin-zapasy").setDescription("ADMIN: Ručně otestuje a stáhne zápasy z RapidAPI (Ignoruje limity).").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-vyhodnot").setDescription("ADMIN: Ručně vyhodnotí sázky zápasu.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName("zapas").setDescription("Který zápas skončil?").setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName("vitez").setDescription("Kdo vyhrál?").setRequired(true).addChoices({name: 'Vyhráli Domácí', value: 'home'}, {name: 'Vyhráli Hosté', value: 'away'})),
  new SlashCommandBuilder().setName("admin-vytvor-zapas").setDescription("ADMIN: Ručně vytvoří zápas (když API stávkuje).").setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName("domaci").setDescription("Tým domácí").setRequired(true))
    .addStringOption(o => o.setName("hoste").setDescription("Tým hosté").setRequired(true))
    .addNumberOption(o => o.setName("kurz_domaci").setDescription("Kurz na domácí (např. 1.5)").setRequired(true))
    .addNumberOption(o => o.setName("kurz_hoste").setDescription("Kurz na hosty (např. 2.1)").setRequired(true))
    .addIntegerOption(o => o.setName("zacatek_za_hodin").setDescription("Za kolik hodin zápas začíná?").setRequired(true)),
  new SlashCommandBuilder().setName("admin-zaloha-vynut").setDescription("ADMIN: Okamžitě odešle aktuální stav databáze do záložního kanálu.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(c => c.toJSON());

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ]});

// ─────────────────────────────────────────────
// AUTOCOMPLETE (NAŠEPTÁVAČ)
// ─────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isAutocomplete()) return;
  const focusedOption = interaction.options.getFocused(true);

  if (interaction.commandName === 'trade' || interaction.commandName === 'prodat') {
    let choices = [];
    if (focusedOption.name === 'nabizim' || focusedOption.name === 'karta_id') {
      const user = getUser(interaction.user.id);
      choices = [...new Set(user.inventory)].filter(id => !isCardLocked(user, id)).map(id => {
        const card = cardsDb.cards.find(c => c.id === id);
        return { name: card ? `${card.team} | ${card.name} (${id})` : id, value: id };
      });
    } else if (focusedOption.name === 'chci') {
      const targetUserId = interaction.options.get('uzivatel')?.value;
      if (targetUserId) {
        const target = getUser(targetUserId);
        choices = [...new Set(target.inventory)].map(id => {
          const card = cardsDb.cards.find(c => c.id === id);
          return { name: card ? `${card.team} | ${card.name} (${id})` : id, value: id };
        });
      } else {
        choices = cardsDb.cards.map(c => ({ name: `${c.team} | ${c.name} (${c.id})`, value: c.id }));
      }
    }
    const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase())).slice(0, 25);
    await interaction.respond(filtered).catch(()=>null);
  } 
  
  else if (interaction.commandName === 'vsadit' || interaction.commandName === 'admin-vyhodnot') {
    if (focusedOption.name === 'zapas') {
      let matches = Object.keys(activeMatches);
      if (interaction.commandName === 'vsadit') {
        matches = matches.filter(m => activeMatches[m].status === 'NS' && Date.now() < activeMatches[m].startTime);
      }
      const choices = matches.map(m => ({name: m, value: m}));
      const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase())).slice(0, 25);
      await interaction.respond(filtered).catch(()=>null);
    }
  }
});

// ─────────────────────────────────────────────
// POMOCNÉ FUNKCE
// ─────────────────────────────────────────────
async function openShopCatalog(interaction, category, index) {
  const packKeys = SHOP_CATEGORIES[category];
  const packKey = packKeys[index];
  const pack = cardsDb.packages[packKey];

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`browse_shop_${category}_${index - 1}`).setLabel('◀ Předchozí').setStyle(ButtonStyle.Primary).setDisabled(index === 0),
    new ButtonBuilder().setCustomId(`buy_pack_${packKey}`).setLabel(`Koupit za ${pack.price} puků`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`browse_shop_${category}_${index + 1}`).setLabel('Další ▶').setStyle(ButtonStyle.Primary).setDisabled(index === packKeys.length - 1)
  );

  const embed = new EmbedBuilder()
    .setTitle(`📦 ${pack.name}`)
    .setDescription(`Cena: **${pack.price} puků**\n*Balíček ${index + 1} z ${packKeys.length}*`)
    .setImage(pack.image)
    .setColor(EVENT_COLOR);

  if (interaction.replied || interaction.deferred) {
    await interaction.update({ embeds: [embed], components: [row] });
  } else {
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
}

// Sběr kilometrů
client.on('messageCreate', async (m) => {
  if (m.channel.id !== CH_JOBS || !m.embeds.length) return;
  const e = m.embeds[0];
  const distVal = e.fields?.find(f => f.name?.toLowerCase()?.includes('vzdálenost'))?.value;
  const driver = e.author?.name || e.fields?.find(f => f.name?.toLowerCase()?.includes('řidič'))?.value;
  if (distVal && driver) {
    const kmMatches = distVal.match(/(\d+)/g);
    if (kmMatches) {
      const km = parseInt(kmMatches.join(''), 10);
      const ziskanePuky = Math.floor(km / 200);
      
      const userKey = Object.keys(usersDb).find(k => usersDb[k].tbName.toLowerCase() === driver.toLowerCase().trim());
      if (userKey) {
        usersDb[userKey].km += km; // Přičtení surových kilometrů do profilu
        if (ziskanePuky > 0) {
          usersDb[userKey].pucks += ziskanePuky;
        }
        saveUsers();
      }
    }
  }
});

// Zápasová nástěnka
async function renderMatchesDashboard() {
  const matchCh = await client.channels.fetch(CH_MATCHES).catch(()=>null);
  if (!matchCh) return "Kanál pro zápasy nebyl nalezen.";

  const embed = new EmbedBuilder().setTitle(`🔥 Aktuální zápasy a kurzy MS`).setColor(EVENT_COLOR);
  const matchKeys = Object.keys(activeMatches);

  if (matchKeys.length === 0) {
    embed.setDescription("Žádné aktivní zápasy nebyly nalezeny. Použij `/admin-vytvor-zapas`.");
  } else {
    matchKeys.forEach(k => {
      const m = activeMatches[k];
      const s = m.status === 'NS' ? '⏳ Nezačalo' : (['FT', 'AET', 'AWT', 'PEN', 'FINISHED'].includes(m.status) ? `🏁 Konec (${m.scoreHome || 0}:${m.scoreAway || 0})` : `🔴 LIVE (${m.scoreHome || 0}:${m.scoreAway || 0})`);
      const oddsTxt = m.oddsHome > 1.0 ? `🏠 Domácí: **${m.oddsHome}** •   ✈️ Hosté: **${m.oddsAway}**` : "Kurzy nevypsány.";
      
      embed.addFields({
        name: `🏒 ${m.home}  vs  ${m.away}`,
        value: `📅 **Start:** <t:${Math.floor(m.startTime/1000)}:f>  (<t:${Math.floor(m.startTime/1000)}:R>)\n📊 **Stav:** ${s}\n💰 **Kurzy:** ${oddsTxt}\n\u200b`,
        inline: false
      });
    });
  }

  const msgs = await matchCh.messages.fetch({ limit: 5 });
  if (msgs.size > 0) await msgs.first().edit({ embeds: [embed] }); else await matchCh.send({ embeds: [embed] });
}

// Cloud zálohy
async function sendBackup() {
  try {
    const ch = await client.channels.fetch(CH_BACKUP);
    if (fs.existsSync(USERS_PATH)) {
      await ch.send({
        content: `📦 **Automatická záloha databáze (users_db.json)**\n🕒 Čas zálohy: <t:${Math.floor(Date.now() / 1000)}:F>`,
        files: [USERS_PATH]
      });
      return true;
    }
    return false;
  } catch (e) { return false; }
}

async function loadBackupOnStartup() {
  try {
    const ch = await client.channels.fetch(CH_BACKUP);
    const messages = await ch.messages.fetch({ limit: 1 });
    if (messages.size > 0) {
      const lastMsg = messages.first();
      const attachment = lastMsg.attachments.first();
      if (attachment && attachment.name.endsWith('.json')) {
        const response = await axios.get(attachment.url);
        if (response.data && typeof response.data === 'object') {
          fs.writeFileSync(USERS_PATH, JSON.stringify(response.data, null, 2));
          usersDb = response.data;
          console.log(`[ZÁLOHA] ÚSPĚCH! Databáze obnovena.`);
          return true;
        }
      }
    }
    return false;
  } catch (e) { return false; }
}

// ─────────────────────────────────────────────
// HLAVNÍ LOGIKA INTERAKCÍ (Tlačítka a Příkazy)
// ─────────────────────────────────────────────
client.on("interactionCreate", async interaction => {
  if (interaction.isAutocomplete()) return;

  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_category_select') {
    const selected = interaction.values[0];
    if (selected === 'reset') {
      return interaction.reply({ content: '🔄 Výběr uvolněn! Nyní můžeš znovu otevřít jakoukoliv kategorii z menu.', ephemeral: true });
    }
    await openShopCatalog(interaction, selected, 0);
  }

  if (interaction.isButton() && interaction.customId.startsWith('browse_shop_')) {
    const parts = interaction.customId.split('_');
    await openShopCatalog(interaction, parts[2], parseInt(parts[3], 10));
  }

  if (interaction.isButton() && interaction.customId.startsWith('buy_pack_')) {
    const packKey = interaction.customId.replace('buy_pack_', '');
    const pack = cardsDb.packages[packKey];
    const user = getUser(interaction.user.id);
    if (user.pucks < pack.price) return interaction.reply({ content: `❌ Nemáš dostatek puků!`, ephemeral: true });

    user.pucks -= pack.price;
    saveUsers();

    let possibleCards = cardsDb.cards;
    if (pack.type === "role") {
        const t = Array.isArray(pack.target) ? pack.target : [pack.target];
        possibleCards = possibleCards.filter(c => t.includes(c.role));
    } else if (pack.type === "group") possibleCards = possibleCards.filter(c => c.group === pack.target);
    else if (pack.type === "team") possibleCards = possibleCards.filter(c => c.team === pack.target);

    const selectedCard = possibleCards[Math.floor(Math.random() * possibleCards.length)];

    await interaction.update({ content: "⏳ Otevírám balíček...", embeds: [{ image: { url: cardsDb.animations[0] }, color: EVENT_COLOR }], components: [] });
    setTimeout(() => interaction.editReply({ embeds: [{ image: { url: cardsDb.animations[1] }, color: EVENT_COLOR }] }), 2500);
    setTimeout(() => interaction.editReply({ embeds: [{ image: { url: cardsDb.animations[2] }, color: EVENT_COLOR }] }), 5000);
    setTimeout(() => interaction.editReply({ embeds: [{ image: { url: cardsDb.animations[0] }, color: EVENT_COLOR }] }), 7500);
    
    setTimeout(async () => {
      user.inventory.push(selectedCard.id);
      saveUsers();
      const flipBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`flip_${selectedCard.id}_back`).setLabel('🔄 Otočit kartu').setStyle(ButtonStyle.Secondary));
      await interaction.editReply({
        content: `🎉 Získal jsi novou kartu!`,
        embeds: [{ title: `${selectedCard.team} | ${selectedCard.name}`, description: `Pozice: **${selectedCard.role}**\nID: \`${selectedCard.id}\``, image: { url: selectedCard.front }, color: EVENT_COLOR }],
        components: [flipBtn]
      });
      const logCh = await client.channels.fetch(CH_LOG).catch(()=>null);
      if (logCh) logCh.send(`👀 Hráč <@${user.id}> právě rozbalil **${pack.name}** a získal nového hokejistu!`);
      checkMilestones(interaction.user.id);
    }, 10000);
  }

  if (interaction.isButton() && interaction.customId.startsWith('view_album_')) {
    const parts = interaction.customId.split('_');
    const team = parts[2];
    const targetIndex = parseInt(parts[3], 10);
    const user = getUser(interaction.user.id);
    const ownedTeamCards = cardsDb.cards.filter(c => c.team === team && user.inventory.includes(c.id));
    if (ownedTeamCards.length === 0) return interaction.reply({ content: "❌ Zatím z tohoto týmu nic nemáš.", ephemeral: true });
    const card = ownedTeamCards[targetIndex];
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`view_album_${team}_${targetIndex - 1}`).setLabel('◀ Předchozí').setStyle(ButtonStyle.Primary).setDisabled(targetIndex === 0),
      new ButtonBuilder().setCustomId(`flip_${card.id}_back`).setLabel('🔄 Otočit kartu').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`view_album_${team}_${targetIndex + 1}`).setLabel('Další ▶').setStyle(ButtonStyle.Primary).setDisabled(targetIndex === ownedTeamCards.length - 1)
    );
    const embed = new EmbedBuilder().setTitle(`${card.team} | ${card.name}`).setDescription(`Pozice: **${card.role}**\nID: \`${card.id}\`\n*Karta ${targetIndex + 1} z ${ownedTeamCards.length}*`).setImage(card.front).setColor(EVENT_COLOR);
    await (interaction.replied || interaction.deferred ? interaction.update({ embeds: [embed], components: [row] }) : interaction.reply({ embeds: [embed], components: [row], ephemeral: true }));
  }

  if (interaction.isButton() && interaction.customId.startsWith('flip_')) {
    const parts = interaction.customId.split('_');
    const cardId = `${parts[1]}_${parts[2]}`;
    const targetFace = parts[3]; 
    const card = cardsDb.cards.find(c => c.id === cardId);
    if(!card) return;
    const newFace = targetFace === 'back' ? 'front' : 'back';
    const oldRow = interaction.message.components[0];
    const newRow = new ActionRowBuilder();
    if (oldRow) {
      oldRow.components.forEach(comp => {
        if (comp.customId.startsWith('flip_')) {
          newRow.addComponents(new ButtonBuilder().setCustomId(`flip_${cardId}_${newFace}`).setLabel(newFace === 'back' ? '🔄 Otočit kartu' : '🔄 Otočit zpět').setStyle(ButtonStyle.Secondary));
        } else newRow.addComponents(ButtonBuilder.from(comp));
      });
    }
    await interaction.update({ embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setImage(targetFace === 'back' ? card.back : card.front).setColor(EVENT_COLOR)], components: [newRow] });
  }

  if (interaction.isButton() && interaction.customId.startsWith('marketbuy_')) {
    const [, sellerId, cardId, priceStr] = interaction.customId.split('_');
    const price = parseInt(priceStr, 10);
    const buyer = getUser(interaction.user.id);
    const seller = usersDb[sellerId];
    if (buyer.id === sellerId) return interaction.reply({ content: "❌ Vlastní karta.", ephemeral: true });
    if (buyer.pucks < price) return interaction.reply({ content: "❌ Málo puků.", ephemeral: true });
    if (!seller || !seller.inventory.includes(cardId)) {
      await interaction.message.delete().catch(()=>null);
      return interaction.reply({ content: "❌ Už není k dispozici.", ephemeral: true });
    }
    buyer.pucks -= price; seller.pucks += price;
    seller.inventory.splice(seller.inventory.indexOf(cardId), 1); buyer.inventory.push(cardId);
    saveUsers();
    await interaction.message.delete().catch(()=>null);
    interaction.reply({ content: `✅ Úspěšně koupeno!`, ephemeral: true });
    checkMilestones(buyer.id);
    const logCh = await client.channels.fetch(CH_LOG).catch(()=>null);
    if (logCh) logCh.send(`🤝 <@${buyer.id}> koupil kartu od <@${seller.id}> za **${price} puků** na tržišti!`);
  }

  // OVLÁDÁNÍ TRADU
  if (interaction.isButton() && (interaction.customId.startsWith('tradeaccept_') || interaction.customId.startsWith('tradedecline_') || interaction.customId.startsWith('tradecancel_'))) {
    const parts = interaction.customId.split('_');
    const type = parts[0];
    const iniId = parts[1];
    const tarId = parts[2];
    const myC = parts[3];
    const theirC = parts[4];
    const timestamp = parseInt(parts[5], 10);

    const ini = getUser(iniId);
    const tar = getUser(tarId);

    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      unlockCard(ini, myC);
      saveUsers();
      return interaction.message.edit({ 
          embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setTitle("⏳ Tento návrh na Trade již vypršel (24h).").setColor(0x808080)], 
          components: [] 
      });
    }

    if (type === 'tradecancel') {
      if (interaction.user.id !== iniId) return interaction.reply({ content: "❌ Pouze navrhovatel může tento trade zrušit.", ephemeral: true });
      unlockCard(ini, myC);
      saveUsers();
      return interaction.message.edit({ 
          embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setTitle("❌ Trade byl zrušen navrhovatelem.").setColor(0x808080)], 
          components: [] 
      });
    }

    if (interaction.user.id !== tarId) return interaction.reply({ content: "❌ Toto není pro tebe.", ephemeral: true });

    if (type === 'tradeaccept') {
      if (!ini.inventory.includes(myC) || !tar.inventory.includes(theirC)) {
        unlockCard(ini, myC); saveUsers();
        return interaction.message.edit({ 
            embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setTitle("❌ Nelze dokončit. Někdo z vás už svou kartu nemá.").setColor(0xFF0000)], 
            components: [] 
        });
      }
      ini.inventory.splice(ini.inventory.indexOf(myC), 1); ini.inventory.push(theirC);
      tar.inventory.splice(tar.inventory.indexOf(theirC), 1); tar.inventory.push(myC);
      unlockCard(ini, myC);
      saveUsers();
      await interaction.message.edit({ 
          embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setTitle("✅ Trade proběhl úspěšně!").setColor(0x00FF00)], 
          components: [] 
      });
      checkMilestones(iniId); checkMilestones(tarId);
    } else if (type === 'tradedecline') {
      unlockCard(ini, myC);
      saveUsers();
      await interaction.message.edit({ 
          embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setTitle("❌ Trade byl zamítnut druhým hráčem.").setColor(0xFF0000)], 
          components: [] 
      });
    }
  }

  // ─────────────────────────────────────────────
  // OSTATNÍ SLASH PŘÍKAZY
  // ─────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "puky") interaction.reply({ content: `🏒 Máš **${getUser(interaction.user.id).pucks} puků**.`, ephemeral: true });
    
    if (interaction.commandName === "link") {
      const user = getUser(interaction.user.id); user.tbName = interaction.options.getString("nick");
      saveUsers(); interaction.reply({ content: `✅ Propojeno s TB nickem **${user.tbName}**.`, ephemeral: true });
    }
    
    // PROFIL HRÁČE
    if (interaction.commandName === "profil") {
      const targetUser = interaction.options.getUser("uzivatel") || interaction.user;
      const u = getUser(targetUser.id);
      
      const totalCards = cardsDb.cards.length;
      const uniqueCards = new Set(u.inventory).size;
      const completion = Math.round((uniqueCards / totalCards) * 100) || 0;
      
      const embed = new EmbedBuilder()
        .setTitle(`👤 Hokejový Profil: ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setColor(EVENT_COLOR)
        .addFields(
          { name: '🚛 TrucksBook Nick', value: `\`${u.tbName}\``, inline: true },
          { name: '🚚 Najeto v eventu', value: `**${u.km}** km`, inline: true },
          { name: '🏒 Aktuální puky', value: `**${u.pucks}**`, inline: true },
          { name: '🎴 Sbírka karet', value: `**${u.inventory.length}** ks (${uniqueCards}/${totalCards} - ${completion}%)`, inline: false },
          { name: '📈 Úspěšnost sázek', value: `**${u.betsWon}** výher z **${u.betsTotal}** sázek`, inline: false }
        )
        .setFooter({ text: 'LTR Hockey Event' });
        
      interaction.reply({ embeds: [embed] });
    }

    // LEADERBOARD (ŽEBŘÍČEK)
    if (interaction.commandName === "leaderboard") {
      const category = interaction.options.getString("kategorie");
      let usersArray = Object.values(usersDb).filter(u => u.tbName !== "Neznámý");
      let title = "";
      let valueMapper;

      if (category === 'pucks') {
        usersArray.sort((a, b) => b.pucks - a.pucks);
        title = "🏆 Leaderboard: Nejvíce Puků";
        valueMapper = (u) => `**${u.pucks}** puků`;
      } else if (category === 'cards') {
        usersArray.sort((a, b) => b.inventory.length - a.inventory.length);
        title = "🏆 Leaderboard: Největší sběratelé (Karty)";
        valueMapper = (u) => `**${u.inventory.length}** karet`;
      } else if (category === 'km') {
        usersArray.sort((a, b) => b.km - a.km);
        title = "🏆 Leaderboard: Nejpilnější řidiči (KM)";
        valueMapper = (u) => `**${u.km}** km`;
      } else if (category === 'bets') {
        usersArray.sort((a, b) => b.betsWon - a.betsWon);
        title = "🏆 Leaderboard: Nejlepší sázkaři";
        valueMapper = (u) => `**${u.betsWon}** výher z ${u.betsTotal} sázek`;
      }

      const top10 = usersArray.slice(0, 10);
      let desc = top10.map((u, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i+1}.**`;
        return `${medal} <@${u.id}> (\`${u.tbName}\`) - ${valueMapper(u)}`;
      }).join('\n\n');

      if (!desc) desc = "Zatím zde není žádný záznam.";

      const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor(EVENT_COLOR);
      interaction.reply({ embeds: [embed] });
    }
    
    if (interaction.commandName === "album") {
      const team = interaction.options.getString("tym").toUpperCase();
      const targetUser = interaction.options.getUser("uzivatel") || interaction.user;
      const userObj = getUser(targetUser.id);
      const teamCards = cardsDb.cards.filter(c => c.team === team);
      if (teamCards.length === 0) return interaction.reply({ content: "❌ Neexistující tým.", ephemeral: true });
      let desc = ""; let ownedCount = 0;
      teamCards.forEach(c => {
        if (userObj.inventory.includes(c.id)) { desc += `✅ **${c.role}** - ${c.name} \`[${c.id}]\`\n\n`; ownedCount++; }
        else desc += `❌ **${c.role}** - *???*\n\n`;
      });
      const embed = new EmbedBuilder().setTitle(`📖 Album: ${team} (${targetUser.username})`).setDescription(desc).setFooter({ text: `Zkompletováno: ${ownedCount}/${teamCards.length}` }).setColor(EVENT_COLOR);
      const comps = (targetUser.id === interaction.user.id && ownedCount > 0) ? [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`view_album_${team}_0`).setLabel('🖼️ Prohlédnout mé karty').setStyle(ButtonStyle.Success))] : [];
      interaction.reply({ embeds: [embed], components: comps });
    }
    
    if (interaction.commandName === "prodat") {
      const cardId = interaction.options.getString("karta_id").toUpperCase();
      const price = interaction.options.getInteger("cena");
      const user = getUser(interaction.user.id);
      if (!user.inventory.includes(cardId)) return interaction.reply({ content: "❌ Tuto kartu nevlastníš.", ephemeral: true });
      if (isCardLocked(user, cardId)) return interaction.reply({ content: "❌ Tuto kartu nemůžeš prodat, je dočasně uzamčena v aktivním návrhu na Trade.", ephemeral: true });

      const card = cardsDb.cards.find(c => c.id === cardId);
      const marketCh = await client.channels.fetch(CH_MARKET);
      const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`marketbuy_${user.id}_${cardId}_${price}`).setLabel(`Koupit za ${price} puků`).setStyle(ButtonStyle.Success));
      await marketCh.send({ content: `🛒 **Nová nabídka!**\nProdejce: <@${user.id}>`, embeds: [{ title: `${card.team} | ${card.name}`, image: { url: card.front }, color: EVENT_COLOR }], components: [btn] });
      interaction.reply({ content: `✅ Vystaveno na trh.`, ephemeral: true });
    }
    
    if (interaction.commandName === "trade") {
      const targetUser = interaction.options.getUser("uzivatel");
      const myCardId = interaction.options.getString("nabizim").toUpperCase();
      const theirCardId = interaction.options.getString("chci").toUpperCase();
      const user = getUser(interaction.user.id);
      const target = getUser(targetUser.id);
      
      if (!user.inventory.includes(myCardId)) return interaction.reply({ content: "❌ Tuto kartu nevlastníš.", ephemeral: true });
      if (!target.inventory.includes(theirCardId)) return interaction.reply({ content: "❌ Druhý hráč tuto kartu nemá.", ephemeral: true });
      if (isCardLocked(user, myCardId)) return interaction.reply({ content: "❌ Tuto kartu už nabízíš v jiném tradu (nebo je zamčená).", ephemeral: true });

      const myCard = cardsDb.cards.find(c => c.id === myCardId) || { name: 'Neznámá karta', team: '?', role: '?', front: null };
      const theirCard = cardsDb.cards.find(c => c.id === theirCardId) || { name: 'Neznámá karta', team: '?', role: '?', front: null };

      const timestamp = Date.now();
      lockCard(user, myCardId, 24 * 60 * 60 * 1000);
      saveUsers();

      const cmdsCh = await client.channels.fetch(CH_CMDS);
      const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`tradeaccept_${interaction.user.id}_${targetUser.id}_${myCardId}_${theirCardId}_${timestamp}`).setLabel('Souhlasím').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`tradedecline_${interaction.user.id}_${targetUser.id}_${myCardId}_${theirCardId}_${timestamp}`).setLabel('Odmítnout').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`tradecancel_${interaction.user.id}_${targetUser.id}_${myCardId}_${theirCardId}_${timestamp}`).setLabel('Zrušit návrh').setStyle(ButtonStyle.Secondary)
      );
      
      const embed = new EmbedBuilder()
        .setTitle('🤝 Nový návrh na výměnu karet!')
        .setDescription(`<@${interaction.user.id}> ti nabízí obchod, <@${targetUser.id}>!\n\n` +
                        `**NABÍZÍ TI:**\n🏒 **${myCard.name}** (${myCard.team} - ${myCard.role})\n🆔 \`${myCard.id}\`\n\n` +
                        `**CHCE OD TEBE:**\n🏒 **${theirCard.name}** (${theirCard.team} - ${theirCard.role})\n🆔 \`${theirCard.id}\`\n\n` +
                        `⏳ *Platnost návrhu vyprší <t:${Math.floor((timestamp + 24*60*60*1000)/1000)}:R>*`)
        .setImage(myCard.front)
        .setThumbnail(theirCard.front)
        .setColor(EVENT_COLOR);

      await cmdsCh.send({ content: `<@${targetUser.id}>, máš tu návrh na výměnu!`, embeds: [embed], components: [btnRow] });
      interaction.reply({ content: `✅ Návrh odeslán do chatu. Tvoje karta byla dočasně uzamčena.`, ephemeral: true });
    }
    
    if (interaction.commandName === "vsadit") {
      const matchName = interaction.options.getString("zapas");
      const tip = interaction.options.getString("tip");
      const puky = interaction.options.getInteger("puky");
      const user = getUser(interaction.user.id);

      if (!activeMatches[matchName]) return interaction.reply({ content: "❌ Zápas nenalezen nebo už skončil.", ephemeral: true });
      const mData = activeMatches[matchName];

      if (mData.status !== 'NS' || Date.now() >= mData.startTime) {
         return interaction.reply({ content: "❌ Na tento zápas už nelze vsadit. Už se hraje nebo začal!", ephemeral: true });
      }

      const odd = tip === 'home' ? mData.oddsHome : mData.oddsAway;

      if (odd <= 1.0) return interaction.reply({ content: "❌ K tomuto zápasu ještě nejsou kurzy.", ephemeral: true });
      if (user.pucks < puky) return interaction.reply({ content: `❌ Nemáš dost puků! Máš ${user.pucks}.`, ephemeral: true });
      if (puky <= 0) return interaction.reply({ content: "❌ Musíš vsadit alespoň 1 puk.", ephemeral: true });

      const potWin = Math.floor(puky * odd);
      user.pucks -= puky; 
      user.betsTotal += 1; // Aktualizace pro žebříček
      user.bets.push({ match: matchName, tip, amount: puky, odd, potentialWin: potWin, resolved: false });
      saveUsers(); 
      
      interaction.reply({ content: `✅ Vsadil jsi **${puky} puků** s kurzem **${odd}** na zápas **${matchName}**!\nPokud tvůj tým vyhraje, vyhraješ **${potWin} puků**!`, ephemeral: true });
    }

    if (interaction.commandName === "admin-vytvor-zapas") {
      const home = interaction.options.getString("domaci");
      const away = interaction.options.getString("hoste");
      const oddsHome = interaction.options.getNumber("kurz_domaci");
      const oddsAway = interaction.options.getNumber("kurz_hoste");
      const hours = interaction.options.getInteger("zacatek_za_hodin");

      const matchKey = `${home} - ${away}`;
      const startTime = Date.now() + (hours * 3600 * 1000);

      activeMatches[matchKey] = {
          id: `manual_${Date.now()}`,
          home, away, oddsHome, oddsAway,
          status: 'NS', startTime: startTime,
          scoreHome: null, scoreAway: null, manual: true
      };

      await renderMatchesDashboard();
      interaction.reply({ content: `✅ Ruční zápas **${matchKey}** úspěšně vytvořen na široké nástěnce!`, ephemeral: true });
    }

    if (interaction.commandName === "admin-vyhodnot") {
      const matchName = interaction.options.getString("zapas");
      const winner = interaction.options.getString("vitez");
      let totalPayout = 0;
      let winnersCount = 0;

      for (const userId in usersDb) {
        const user = usersDb[userId];
        user.bets.forEach(bet => {
          if (!bet.resolved && bet.match === matchName) {
            if (bet.tip === winner) {
              user.pucks += bet.potentialWin;
              user.betsWon += 1; // Aktualizace pro žebříček
              totalPayout += bet.potentialWin;
              winnersCount++;
              giveExpertRole(userId);
            }
            bet.resolved = true;
          }
        });
      }
      saveUsers();
      
      if (activeMatches[matchName]) {
         activeMatches[matchName].status = 'FT';
         activeMatches[matchName].scoreHome = winner === 'home' ? 1 : 0;
         activeMatches[matchName].scoreAway = winner === 'away' ? 1 : 0;
         await renderMatchesDashboard();
      }

      const logCh = await client.channels.fetch(CH_LOG).catch(()=>null);
      if (logCh && winnersCount > 0) logCh.send(`💸 Sázky na zápas **${matchName}** byly ručně vyhodnoceny! Celkem si **${winnersCount} výherců** rozdělilo **${totalPayout} puků**!`);

      interaction.reply({ content: `✅ Ručně vyhodnoceno. Vyplaceno ${totalPayout} puků celkem ${winnersCount} lidem.`, ephemeral: true });
    }
    
    if (interaction.commandName === "admin-setup-shop") {
      const select = new StringSelectMenuBuilder().setCustomId('shop_category_select').setPlaceholder('Vyberte kategorii balíčků...')
        .addOptions(
          { label: 'Základní a Poziční balíčky', value: 'basic', emoji: '📦' },
          { label: 'Skupinové balíčky', value: 'groups', emoji: '🏆' },
          { label: 'Národní balíčky', value: 'national', emoji: '🌍' },
          { label: 'Zrušit výběr (Reset)', value: 'reset', emoji: '🔄', description: 'Klikni sem, pokud ti nejde vybrat stejná kategorie.' }
        );
        
      const shopDesc = `Vítej v oficiálním **LTR Hokejovém Obchodě**! 🛒\n\n` +
                       `> Zde můžeš utratit své těžce vyježděné puky za balíčky hokejových karet do svého alba. Z každého balíčku ti padne vždy jeden náhodný hráč podle kategorie, kterou si vybereš.\n\n` +
                       `**📦 DOSTUPNÉ KATEGORIE BALÍČKŮ:**\n\n` +
                       `🔹 **Základní a Poziční**\n` +
                       `Chceš zkusit štěstí? Padají zde náhodní útočníci, obránci, brankáři nebo úplný random ze všech týmů.\n\n` +
                       `🔹 **Skupinové**\n` +
                       `Sbíráš konkrétní polovinu pavouka? Tyto balíčky obsahují hráče čistě ze Skupiny A nebo Skupiny B.\n\n` +
                       `🔹 **Národní**\n` +
                       `Jdeš na jistotu? Za vyšší cenu zde pořídíš garantovaného hráče z konkrétního národního týmu.\n\n` +
                       `---\n` +
                       `*💡 Puky získáš ježděním na TrucksBooku (200 km = 1 Puk).*`;

      await (await client.channels.fetch(CH_SHOP)).send({ embeds: [{ title: "🛒 Hokejový Obchod LTR", description: shopDesc, color: EVENT_COLOR }], components: [new ActionRowBuilder().addComponents(select)] });
      interaction.reply({ content: "✅ Obchod úspěšně překreslen s novým designem.", ephemeral: true });
    }
    
    if (interaction.commandName === "admin-puky") {
        const u = getUser(interaction.options.getUser("uzivatel").id);
        u.pucks += interaction.options.getInteger("pocet"); saveUsers();
        interaction.reply({ content: `✅ Přidáno/odebráno.`, ephemeral: true });
    }
    
    if (interaction.commandName === "admin-karta") {
        const u = getUser(interaction.options.getUser("uzivatel").id);
        u.inventory.push(interaction.options.getString("karta_id").toUpperCase()); saveUsers();
        interaction.reply({ content: `✅ Karta přidána.`, ephemeral: true });
    }
    
    if (interaction.commandName === "admin-zapasy") {
      await interaction.deferReply({ ephemeral: true });
      const res = await fetchMatches(true); 
      interaction.editReply(res === true ? "✅ Operace dokončena. API a statistický model zpracovaly data." : `❌ DEBUG REPORT:\n\n${res}`);
    }

    if (interaction.commandName === "admin-zaloha-vynut") {
       await interaction.deferReply({ ephemeral: true });
       const status = await sendBackup();
       interaction.editReply(status === true ? "✅ Ruční záloha byla úspěšně odeslána do kanálu!" : `❌ Selhalo: ${status}`);
    }
  }
});

// ─────────────────────────────────────────────
// MECHANIKA MILNÍKŮ A ODBORNÍKA
// ─────────────────────────────────────────────
async function checkMilestones(userId) {
  const user = usersDb[userId]; if (!user) return;
  const teams = [...new Set(cardsDb.cards.map(c => c.team))];
  let completed = 0;
  for (const t of teams) {
    if (cardsDb.cards.filter(c => c.team === t).every(c => user.inventory.includes(c.id))) completed++;
  }
  try {
    const guild = await client.guilds.fetch(GUILD_ID); const member = await guild.members.fetch(userId); const logCh = await client.channels.fetch(CH_LOG);
    if (completed >= 1 && !member.roles.cache.has(ROLE_FAN)) { await member.roles.add(ROLE_FAN); logCh.send(`🏆 <@${userId}> je **HOKEJOVÝ FANOUŠEK**!`); }
    if (completed >= 8 && !member.roles.cache.has(ROLE_COLLECTOR)) { await member.roles.add(ROLE_COLLECTOR); logCh.send(`👑 <@${userId}> je **SBĚRATELEM**!`); }
  } catch(e) {}
}

async function giveExpertRole(userId) {
  try {
    const guild = await client.guilds.fetch(GUILD_ID); const member = await guild.members.fetch(userId); const logCh = await client.channels.fetch(CH_LOG);
    if (!member.roles.cache.has(ROLE_EXPERT)) { await member.roles.add(ROLE_EXPERT); logCh.send(`🏆 <@${userId}> vyhrál sázku a stává se **EXPERTEM HOKEJE**!`); }
  } catch(e) {}
}

// ─────────────────────────────────────────────
// AUTOMATICKÉ VYHODNOCENÍ SÁZEK
// ─────────────────────────────────────────────
async function evaluateBetsAutomatically() {
  let totalPayout = 0;
  let winnersCount = 0;
  let evaluatedMatches = [];

  for (const matchKey in activeMatches) {
    const m = activeMatches[matchKey];
    if (['FT', 'AET', 'AWT', 'PEN', 'FINISHED'].includes(m.status)) {
      if (m.scoreHome === null || m.scoreAway === null || m.scoreHome === m.scoreAway) continue; 
      
      const winner = m.scoreHome > m.scoreAway ? 'home' : 'away';
      let matchHadBets = false;

      for (const userId in usersDb) {
        const user = usersDb[userId];
        user.bets.forEach(bet => {
          if (!bet.resolved && bet.match === matchKey) {
            matchHadBets = true;
            if (bet.tip === winner) {
              user.pucks += bet.potentialWin;
              user.betsWon += 1; // Zápis pro žebříček
              totalPayout += bet.potentialWin;
              winnersCount++;
              giveExpertRole(userId);
            }
            bet.resolved = true;
          }
        });
      }
      if (matchHadBets) evaluatedMatches.push(matchKey);
    }
  }

  if (evaluatedMatches.length > 0) {
    saveUsers();
    const logCh = await client.channels.fetch(CH_LOG).catch(()=>null);
    if (logCh) {
       logCh.send(`💸 **Automatické vyhodnocení sázek:** Zápasy \`${evaluatedMatches.join(', ')}\` skončily! Celkem si **${winnersCount} výherců** rozdělilo **${totalPayout} puků**!`);
    }
  }
}

// ─────────────────────────────────────────────
// RAPIDAPI + ELO ZÁCHRANNÝ SYSTÉM
// ─────────────────────────────────────────────
async function fetchMatches(isManual = false) {
  const currentHour = new Date().getHours();
  if (!isManual && (currentHour < 9 || currentHour > 23)) {
    return true; 
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || 'betsapi2.p.rapidapi.com';
  if (!apiKey) return "Chybí RAPIDAPI_KEY v proměnných Railway.";

  try {
    const headers = { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': apiHost };

    const manualMatches = Object.values(activeMatches).filter(m => m.manual);
    activeMatches = {};
    manualMatches.forEach(m => { activeMatches[`${m.home} - ${m.away}`] = m; });

    const upcomingRes = await axios.get(`https://${apiHost}/v1/bet365/upcoming`, { 
        headers, params: { sport_id: 17 } 
    });
    
    let allGames = upcomingRes.data?.results || [];

    let relevantGames = allGames.filter(g => {
        const lName = (g.league?.name || "").toLowerCase();
        return (lName.includes('world championship') || lName.includes('iihf')) &&
               !lName.includes('u20') && !lName.includes('women') && !lName.includes('div');
    });

    if (relevantGames.length === 0) {
        await renderMatchesDashboard();
        return `Nenalezeny MS zápasy pro dnešek přes API.`;
    }

    relevantGames = relevantGames.slice(0, 2);

    for (const g of relevantGames) {
        const fId = g.id;
        const home = g.home?.name || "Domácí";
        const away = g.away?.name || "Hosté";
        const matchKey = `${home} - ${away}`;

        let oddsHome = 1.0;
        let oddsAway = 1.0;

        try {
            const oddsRes = await axios.get(`https://${apiHost}/v3/bet365/prematch`, { 
                headers, params: { FI: fId } 
            });
            
            const data = oddsRes.data?.results?.[0];
            if (data) {
                const sp = data.main?.sp || data.sp;
                const market = sp?.full_time_result || sp?.match_odds || sp?.['3_way'] || sp?.to_win;
                
                if (market && market.odds) {
                    const hObj = market.odds.find(o => o.header === '1' || o.name === 'Home');
                    const aObj = market.odds.find(o => o.header === '2' || o.name === 'Away');
                    if (hObj) oddsHome = parseFloat(hObj.odds);
                    if (aObj) oddsAway = parseFloat(aObj.odds);
                } else {
                    const str = JSON.stringify(data);
                    const hMatch = str.match(/"header":"1","odds":"([\d.]+)"/);
                    const aMatch = str.match(/"header":"2","odds":"([\d.]+)"/);
                    if (hMatch) oddsHome = parseFloat(hMatch[1]);
                    if (aMatch) oddsAway = parseFloat(aMatch[1]);
                }
            }
        } catch (e) {}

        if (oddsHome === 1.0 || oddsAway === 1.0) {
            let eloH = TEAM_ELO[home] || 1400; 
            let eloA = TEAM_ELO[away] || 1400;
            let probH = 1 / (1 + Math.pow(10, (eloA - eloH) / 400));
            let probA = 1 - probH;
            let calcOddsH = (1 / probH) * 0.95;
            let calcOddsA = (1 / probA) * 0.95;
            calcOddsH = Math.max(1.01, Math.min(30.00, calcOddsH));
            calcOddsA = Math.max(1.01, Math.min(30.00, calcOddsA));
            oddsHome = parseFloat(calcOddsH.toFixed(2));
            oddsAway = parseFloat(calcOddsA.toFixed(2));
        }

        activeMatches[matchKey] = {
            id: fId, home, away, oddsHome, oddsAway,
            status: g.time_status === '0' ? 'NS' : 'LIVE',
            startTime: g.time ? parseInt(g.time) * 1000 : Date.now() + 3600000,
            scoreHome: null, scoreAway: null, manual: false
        };
    }

    await evaluateBetsAutomatically();
    await renderMatchesDashboard();
    return true;

  } catch (err) {
    await renderMatchesDashboard(); 
    let errMsg = err.message;
    if (err.response && err.response.data) {
       errMsg += `\nAPI: ${JSON.stringify(err.response.data).substring(0,200)}`;
    }
    return errMsg;
  }
}

// ─────────────────────────────────────────────
// START BOTU A SMYČKY
// ─────────────────────────────────────────────
client.once("ready", async () => {
  console.log(`Bot LTR Hockey nahozen!`);
  new REST({ version: '10' }).setToken(TOKEN).put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  
  await loadBackupOnStartup();
  
  fetchMatches(false); 
  setInterval(() => fetchMatches(false), 3 * 60 * 60 * 1000); 
  setInterval(sendBackup, 30 * 60 * 1000);
});

client.login(TOKEN);
