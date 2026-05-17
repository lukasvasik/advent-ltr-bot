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
const ODDS_API_KEY = process.env.ODDS_API_KEY;

// ID Kanálů
const CH_JOBS = '1149900706543833208';
const CH_MATCHES = '1505183390897279077';
const CH_BETS = '1505183898349338797';
const CH_SHOP = '1505184082898714784';
const CH_MARKET = '1505189708693770300';
const CH_CMDS = '1505236386163458119';
const CH_LOG = '1505235716693561535';

// ID Rolí
const ROLE_COLLECTOR = '1505237697533444216';
const ROLE_FAN = '1505237904233070692';
const ROLE_EXPERT = '1505238178271858788';

const EVENT_COLOR = 0xFF2C57; // Tvá sytá růžovo-červená všude

// Kategorie pro katalog obchodu
const SHOP_CATEGORIES = {
  basic: ['random', 'attack', 'defensive', 'lead', 'goal'],
  groups: ['group_a', 'group_b'],
  national: ['cze_col', 'svk_col', 'can_col', 'usa_col', 'swe_col', 'fin_col', 'sui_col', 'lat_col', 'ger_col', 'aut_col', 'hun_col', 'gbr_col', 'den_col', 'nor_col', 'slo_col', 'ita_col']
};

// ─────────────────────────────────────────────
// DATABÁZE A PAMĚŤ
// ─────────────────────────────────────────────
let usersDb = fs.existsSync(USERS_PATH) ? JSON.parse(fs.readFileSync(USERS_PATH, 'utf8')) : {};
const cardsDb = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8'));

// Dočasná paměť na zápasy a kurzy
let activeMatches = {};

const saveUsers = () => fs.writeFileSync(USERS_PATH, JSON.stringify(usersDb, null, 2));

function getUser(id, tbName = null) {
  if (!usersDb[id]) {
    usersDb[id] = { id, tbName: tbName || "Neznámý", pucks: 0, inventory: [], bets: [] };
  }
  return usersDb[id];
}

// ─────────────────────────────────────────────
// PŘÍKAZY (SLASH COMMANDS)
// ─────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName("puky").setDescription("Zobrazí tvůj aktuální stav puků."),
  new SlashCommandBuilder().setName("link").setDescription("Propojí tvůj Discord s TrucksBook nickem.")
    .addStringOption(o => o.setName("nick").setDescription("Tvůj nick na TB").setRequired(true)),
  new SlashCommandBuilder().setName("album").setDescription("Prohlédni si sbírku karet (svou nebo cizí).")
    .addStringOption(o => o.setName("tym").setDescription("Zkratka týmu (CZE, SVK, CAN...)").setRequired(true))
    .addUserOption(o => o.setName("uzivatel").setDescription("Čí album chceš vidět (nepovinné)")),
  new SlashCommandBuilder().setName("prodat").setDescription("Vystaví tvou kartu na globální tržiště.")
    .addStringOption(o => o.setName("karta_id").setDescription("ID karty (např. CZE_A1)").setRequired(true))
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
  new SlashCommandBuilder().setName("admin-zapasy").setDescription("ADMIN: Ručně vynutí stažení zápasů a kurzů.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName("admin-vyhodnot").setDescription("ADMIN: Záchranná brzda - ručně vyhodnotí sázky zápasu.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName("zapas").setDescription("Který zápas skončil?").setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName("vitez").setDescription("Kdo vyhrál?").setRequired(true).addChoices({name: 'Vyhráli Domácí', value: 'home'}, {name: 'Vyhráli Hosté', value: 'away'}))
].map(c => c.toJSON());

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ]});

// ─────────────────────────────────────────────
// AUTOCOMPLETE (NAŠEPTÁVAČ)
// ─────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isAutocomplete()) return;
  const focusedOption = interaction.options.getFocused(true);

  if (interaction.commandName === 'trade') {
    let choices = [];
    if (focusedOption.name === 'nabizim') {
      const user = getUser(interaction.user.id);
      choices = [...new Set(user.inventory)].map(id => {
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
// POMOCNÁ FUNKCE PRO VYKRESLENÍ KATALOGU OBCHODU
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

// ─────────────────────────────────────────────
// TRUCKSBOOK: SBĚR KILOMETRŮ
// ─────────────────────────────────────────────
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
      if (ziskanePuky > 0) {
        const userKey = Object.keys(usersDb).find(k => usersDb[k].tbName.toLowerCase() === driver.toLowerCase().trim());
        if (userKey) {
          usersDb[userKey].pucks += ziskanePuky;
          saveUsers();
        }
      }
    }
  }
});

// ─────────────────────────────────────────────
// HLAVNÍ LOGIKA INTERAKCÍ (Tlačítka a Příkazy)
// ─────────────────────────────────────────────
client.on("interactionCreate", async interaction => {
  if (interaction.isAutocomplete()) return;

  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_category_select') {
    await openShopCatalog(interaction, interaction.values[0], 0);
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

  if (interaction.isButton() && (interaction.customId.startsWith('tradeaccept_') || interaction.customId.startsWith('tradedecline_'))) {
    const parts = interaction.customId.split('_');
    const type = parts[0];
    const initiatorId = parts[1];
    const targetId = parts[2];
    if (interaction.user.id !== targetId) return interaction.reply({ content: "❌ Toto není pro tebe.", ephemeral: true });

    if (type === 'tradeaccept') {
      const myC = parts[3]; const theirC = parts[4];
      const ini = usersDb[initiatorId]; const tar = usersDb[targetId];
      if (!ini.inventory.includes(myC) || !tar.inventory.includes(theirC)) return interaction.reply({ content: "❌ Někdo z vás už kartu nemá.", ephemeral: true });
      ini.inventory.splice(ini.inventory.indexOf(myC), 1); ini.inventory.push(theirC);
      tar.inventory.splice(tar.inventory.indexOf(theirC), 1); tar.inventory.push(myC);
      saveUsers();
      await interaction.message.edit({ content: `✅ **Trade proběhl úspěšně!**`, components: [] });
      checkMilestones(initiatorId); checkMilestones(targetId);
    } else {
      await interaction.message.edit({ content: `❌ **Trade zrušen.**`, components: [] });
    }
  }

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "puky") interaction.reply({ content: `🏒 Máš **${getUser(interaction.user.id).pucks} puků**.`, ephemeral: true });
    
    if (interaction.commandName === "link") {
      const user = getUser(interaction.user.id); user.tbName = interaction.options.getString("nick");
      saveUsers(); interaction.reply({ content: `✅ Propojeno s TB nickem **${user.tbName}**.`, ephemeral: true });
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
      const cmdsCh = await client.channels.fetch(CH_CMDS);
      const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`tradeaccept_${interaction.user.id}_${targetUser.id}_${myCardId}_${theirCardId}`).setLabel('Souhlasím').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`tradedecline_${interaction.user.id}_${targetUser.id}`).setLabel('Odmítnout').setStyle(ButtonStyle.Danger)
      );
      await cmdsCh.send({ content: `🤝 **Návrh na Trade!** <@${targetUser.id}>, <@${interaction.user.id}> ti nabízí kartu \`${myCardId}\` za tvou \`${theirCardId}\`!`, components: [btnRow] });
      interaction.reply({ content: `✅ Návrh odeslán do chatu.`, ephemeral: true });
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

      if (odd <= 1.0) return interaction.reply({ content: "❌ K tomuto zápasu ještě API nepřiřadilo kurzy.", ephemeral: true });
      if (user.pucks < puky) return interaction.reply({ content: `❌ Nemáš dost puků! Máš ${user.pucks}.`, ephemeral: true });
      if (puky <= 0) return interaction.reply({ content: "❌ Musíš vsadit alespoň 1 puk.", ephemeral: true });

      const potWin = Math.floor(puky * odd);
      user.pucks -= puky; 
      user.bets.push({ match: matchName, tip, amount: puky, odd, potentialWin: potWin, resolved: false });
      saveUsers(); 
      
      interaction.reply({ content: `✅ Vsadil jsi **${puky} puků** s kurzem **${odd}** na zápas **${matchName}**!\nPokud tvůj tým vyhraje, vyhraješ **${potWin} puků**!`, ephemeral: true });
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
              totalPayout += bet.potentialWin;
              winnersCount++;
              giveExpertRole(userId);
            }
            bet.resolved = true;
          }
        });
      }
      saveUsers();
      
      const logCh = await client.channels.fetch(CH_LOG).catch(()=>null);
      if (logCh && winnersCount > 0) logCh.send(`💸 Sázky na zápas **${matchName}** byly ručně vyhodnoceny! Celkem si **${winnersCount} výherců** rozdělilo **${totalPayout} puků**!`);

      interaction.reply({ content: `✅ Ručně vyhodnoceno. Vyplaceno ${totalPayout} puků celkem ${winnersCount} lidem.`, ephemeral: true });
    }
    
    if (interaction.commandName === "admin-setup-shop") {
      const select = new StringSelectMenuBuilder().setCustomId('shop_category_select').setPlaceholder('Vyberte kategorii balíčků...')
        .addOptions(
          { label: 'Základní a Poziční balíčky', value: 'basic', emoji: '📦' },
          { label: 'Skupinové balíčky', value: 'groups', emoji: '🏆' },
          { label: 'Národní balíčky', value: 'national', emoji: '🌍' }
        );
      await (await client.channels.fetch(CH_SHOP)).send({ embeds: [{ title: "🛒 Hokejový Obchod LTR", description: "Vítej v obchodě!\nVyber si v menu níže kategorii.\n\n*Puky získáváš ježděním (200 km = 1 puk).*.", color: EVENT_COLOR }], components: [new ActionRowBuilder().addComponents(select)] });
      interaction.reply({ content: "✅ Obchod vykreslen.", ephemeral: true });
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
      const res = await fetchMatches();
      interaction.editReply(res === true ? "✅ Zápasy a kurzy úspěšně aktualizovány z API-Sports." : `❌ DEBUG INFO:\n\n${res}`);
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
    if (['FT', 'AET', 'AWT', 'PEN'].includes(m.status)) {
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
// API-SPORTS: ZÁPASY A KURZY
// ─────────────────────────────────────────────
async function fetchMatches() {
  if (!ODDS_API_KEY) return "Chybí klíč v Railway.";
  try {
    const headers = { 'x-apisports-key': ODDS_API_KEY };
    
    const leaguesRes = await axios.get(`https://v1.hockey.api-sports.io/leagues?search=world`, { headers });
    const targetLeague = leaguesRes.data.response?.find(l => 
        l.name.toLowerCase().includes('world championship') && 
        !l.name.toLowerCase().includes('u20') && 
        !l.name.toLowerCase().includes('women') &&
        !l.name.toLowerCase().includes('div')
    ) || leaguesRes.data.response?.[0]; 

    if (!targetLeague) return `Nenalezeno Mistrovství světa v databázi API-Sports.`;

    const leagueId = targetLeague.id;
    
    // OPRAVA: API-Sports nepoužívá rok, ale "season" v objektu sezóny
    const activeSeasonObj = targetLeague.seasons.find(s => s.current === true);
    const season = activeSeasonObj ? activeSeasonObj.season : new Date().getFullYear();

    const gamesRes = await axios.get(`https://v1.hockey.api-sports.io/games?league=${leagueId}&season=${season}`, { headers });
    const allGames = gamesRes.data.response || [];

    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const relevantGames = allGames
      .filter(g => new Date(g.date).getTime() > oneDayAgo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const displayGames = relevantGames.slice(0, 10);

    const oddsRes = await axios.get(`https://v1.hockey.api-sports.io/odds?league=${leagueId}&season=${season}`, { headers });
    const oddsData = oddsRes.data.response || [];

    let desc = "";

    displayGames.forEach(m => {
      const home = m.teams.home.name;
      const away = m.teams.away.name;
      const matchKey = `${home} - ${away}`;
      
      let oddsHome = 1.0;
      let oddsAway = 1.0;
      let oddsText = "Kurzy zatím nevypsány.";

      const gameOdds = oddsData.find(o => o.game.id === m.id);
      if (gameOdds && gameOdds.bookmakers && gameOdds.bookmakers.length > 0) {
          const betMarket = gameOdds.bookmakers[0].bets[0]; 
          if (betMarket && betMarket.values.length >= 2) {
              oddsHome = parseFloat(betMarket.values.find(v => v.value === 'Home')?.odd || betMarket.values[0].odd);
              oddsAway = parseFloat(betMarket.values.find(v => v.value === 'Away')?.odd || betMarket.values[1].odd);
              oddsText = `🏠 Domácí: **${oddsHome}** | ✈️ Hosté: **${oddsAway}**`;
          }
      }

      const s = m.status.short;
      let statusText = "";
      if (s === 'NS') statusText = "⏳ Nezačalo";
      else if (['FT', 'AET', 'AWT', 'PEN'].includes(s)) statusText = `🏁 Konec (${m.scores.home} : ${m.scores.away})`;
      else if (s === 'CANC') statusText = "❌ Zrušeno";
      else statusText = `🔴 LIVE (${m.scores.home} : ${m.scores.away})`; 

      activeMatches[matchKey] = { 
        id: m.id, 
        home, 
        away, 
        oddsHome, 
        oddsAway,
        status: s,
        startTime: new Date(m.date).getTime(),
        scoreHome: m.scores.home,
        scoreAway: m.scores.away
      };
      
      desc += `🏒 **${matchKey}**\n🕒 <t:${Math.floor(new Date(m.date).getTime()/1000)}:f>\n📊 Stav: ${statusText}\n💰 ${oddsText}\n\n`;
    });

    await evaluateBetsAutomatically();

    const matchCh = await client.channels.fetch(CH_MATCHES).catch(()=>null);
    if (!matchCh) return "Kanál pro zápasy nebyl nalezen.";

    const embed = new EmbedBuilder()
      .setTitle(`🔥 Aktuální zápasy a kurzy MS`)
      .setDescription(desc || "Žádné zápasy nenalezeny.")
      .setColor(EVENT_COLOR);
      
    const msgs = await matchCh.messages.fetch({ limit: 5 });
    if (msgs.size > 0) await msgs.first().edit({ embeds: [embed] }); else await matchCh.send({ embeds: [embed] });
    return true;

  } catch (err) { return err.message; }
}

client.once("ready", () => {
  console.log(`Bot LTR Hockey nahozen!`);
  new REST({ version: '10' }).setToken(TOKEN).put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  fetchMatches(); setInterval(fetchMatches, 60 * 60 * 1000); 
});

client.login(TOKEN);
