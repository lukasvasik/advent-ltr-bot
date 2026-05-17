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

const BRAND_COLOR = 0x00529B; // Hokejová modrá
const SHOP_COLOR = 0xFF2C57; // Nová LTR růžová

// Kategorie pro katalog obchodu
const SHOP_CATEGORIES = {
  basic: ['random', 'attack', 'defensive', 'lead', 'goal'],
  groups: ['group_a', 'group_b'],
  national: ['cze_col', 'svk_col', 'can_col', 'usa_col', 'swe_col', 'fin_col', 'sui_col', 'lat_col', 'ger_col', 'aut_col', 'hun_col', 'gbr_col', 'den_col', 'nor_col', 'slo_col', 'ita_col']
};

// ─────────────────────────────────────────────
// DATABÁZE
// ─────────────────────────────────────────────
let usersDb = fs.existsSync(USERS_PATH) ? JSON.parse(fs.readFileSync(USERS_PATH, 'utf8')) : {};
const cardsDb = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8'));

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
    .addStringOption(o => o.setName("nabizim").setDescription("ID tvé karty (např. CZE_A1)").setRequired(true))
    .addStringOption(o => o.setName("chci").setDescription("ID karty, kterou chceš od něj").setRequired(true)),
  new SlashCommandBuilder().setName("vsadit").setDescription("Vsadí puky na zápas.")
    .addStringOption(o => o.setName("zapas").setDescription("Týmy (např. CZE-CAN)").setRequired(true))
    .addStringOption(o => o.setName("tip").setDescription("Tvůj tip na vítěze").setRequired(true))
    .addIntegerOption(o => o.setName("puky").setDescription("Kolik puků sázíš").setRequired(true)),
  new SlashCommandBuilder().setName("admin-setup-shop").setDescription("ADMIN: Vykreslí nástěnku do obchodu.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  // NOVÉ ADMIN PŘÍKAZY
  new SlashCommandBuilder().setName("admin-puky").setDescription("ADMIN: Přidá nebo odebere puky.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName("uzivatel").setDescription("Komu").setRequired(true))
    .addIntegerOption(o => o.setName("pocet").setDescription("Počet puků (+ přidá, - ubere)").setRequired(true)),
  new SlashCommandBuilder().setName("admin-karta").setDescription("ADMIN: Přidá konkrétní kartu hráči.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName("uzivatel").setDescription("Komu").setRequired(true))
    .addStringOption(o => o.setName("karta_id").setDescription("ID karty (např. CZE_A1)").setRequired(true)),
  new SlashCommandBuilder().setName("admin-zapasy").setDescription("ADMIN: Ručně vynutí stažení zápasů a ukáže případnou chybu z API.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(c => c.toJSON());

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ]});

// ─────────────────────────────────────────────
// POMOCNÁ FUNKCE PRO VYKRESLENÍ KATALOGU OBCHODU
// ─────────────────────────────────────────────
async function openShopCatalog(interaction, category, index) {
  const packKeys = SHOP_CATEGORIES[category];
  const packKey = packKeys[index];
  const pack = cardsDb.packages[packKey];

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`browse_shop_${category}_${index - 1}`)
      .setLabel('◀ Předchozí')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId(`buy_pack_${packKey}`)
      .setLabel(`Koupit za ${pack.price} puků`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`browse_shop_${category}_${index + 1}`)
      .setLabel('Další ▶')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === packKeys.length - 1)
  );

  const embed = new EmbedBuilder()
    .setTitle(`📦 ${pack.name}`)
    .setDescription(`Cena: **${pack.price} puků**\n*Balíček ${index + 1} z ${packKeys.length}*`)
    .setImage(pack.image)
    .setColor(SHOP_COLOR);

  if (interaction.replied || interaction.deferred) {
    await interaction.update({ embeds: [embed], components: [row] });
  } else {
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
}

// ─────────────────────────────────────────────
// TRUCKSBOOK: PUKY ZA KILOMETRY
// ─────────────────────────────────────────────
client.on('messageCreate', async (m) => {
  if (m.channel.id !== CH_JOBS || !m.embeds.length) return;
  
  const e = m.embeds[0];
  const ujetaVzdalenost = e.fields?.find(f => f.name?.toLowerCase()?.includes('vzdálenost'))?.value;
  const ridic = e.author?.name || e.fields?.find(f => f.name?.toLowerCase()?.includes('řidič'))?.value;
  
  if (ujetaVzdalenost && ridic) {
    const kmMatches = ujetaVzdalenost.match(/(\d+)/g);
    if (kmMatches) {
      const km = parseInt(kmMatches.join(''), 10);
      const ziskanePuky = Math.floor(km / 200);
      
      if (ziskanePuky > 0) {
        const userKey = Object.keys(usersDb).find(k => usersDb[k].tbName.toLowerCase() === ridic.toLowerCase().trim());
        if (userKey) {
          usersDb[userKey].pucks += ziskanePuky;
          saveUsers();
        }
      }
    }
  }
});

// ─────────────────────────────────────────────
// INTERAKCE A PŘÍKAZY
// ─────────────────────────────────────────────
client.on("interactionCreate", async interaction => {
  
  // --- DROP-DOWN MENU: OBCHOD ---
  if (interaction.isStringSelectMenu() && interaction.customId === 'shop_category_select') {
    const category = interaction.values[0];
    await openShopCatalog(interaction, category, 0);
    return;
  }

  // --- TLAČÍTKA: LISTOVÁNÍ V KATALOGU OBCHODU ---
  if (interaction.isButton() && interaction.customId.startsWith('browse_shop_')) {
    const parts = interaction.customId.split('_');
    const category = parts[2];
    const targetIndex = parseInt(parts[3], 10);
    await openShopCatalog(interaction, category, targetIndex);
    return;
  }

  // --- TLAČÍTKA: KOUPIT BALÍČEK (OBCHOD) ---
  if (interaction.isButton() && interaction.customId.startsWith('buy_pack_')) {
    const packKey = interaction.customId.replace('buy_pack_', '');
    const pack = cardsDb.packages[packKey];
    const user = getUser(interaction.user.id);

    if (user.pucks < pack.price) {
      return interaction.reply({ content: `❌ Nemáš dostatek puků! Potřebuješ jich ${pack.price}, ale máš jen ${user.pucks}.`, ephemeral: true });
    }

    user.pucks -= pack.price;
    saveUsers();

    let possibleCards = cardsDb.cards;
    if (pack.type === "role") {
      const targets = Array.isArray(pack.target) ? pack.target : [pack.target];
      possibleCards = possibleCards.filter(c => targets.includes(c.role));
    } else if (pack.type === "group") {
      possibleCards = possibleCards.filter(c => c.group === pack.target);
    } else if (pack.type === "team") {
      possibleCards = possibleCards.filter(c => c.team === pack.target);
    }

    const selectedCard = possibleCards[Math.floor(Math.random() * possibleCards.length)];

    await interaction.update({ content: "⏳ Otevírám balíček...", embeds: [{ image: { url: cardsDb.animations[0] }, color: SHOP_COLOR }], components: [] });
    
    setTimeout(() => interaction.editReply({ embeds: [{ image: { url: cardsDb.animations[1] }, color: SHOP_COLOR }] }), 2500);
    setTimeout(() => interaction.editReply({ embeds: [{ image: { url: cardsDb.animations[2] }, color: SHOP_COLOR }] }), 5000);
    setTimeout(() => interaction.editReply({ embeds: [{ image: { url: cardsDb.animations[0] }, color: SHOP_COLOR }] }), 7500);
    
    setTimeout(async () => {
      user.inventory.push(selectedCard.id);
      saveUsers();
      
      const flipBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`flip_${selectedCard.id}_back`).setLabel('🔄 Otočit kartu').setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({
        content: `🎉 Získal jsi novou kartu do své sbírky!`,
        embeds: [{
          title: `${selectedCard.team} | ${selectedCard.name}`,
          description: `Pozice: **${selectedCard.role}**\nID Karty: \`${selectedCard.id}\``,
          image: { url: selectedCard.front },
          color: SHOP_COLOR
        }],
        components: [flipBtn]
      });

      const logCh = await client.channels.fetch(CH_LOG).catch(()=>null);
      if (logCh) logCh.send(`👀 Hráč <@${user.id}> právě rozbalil **${pack.name}** a získal nového hokejistu!`);
      
      checkMilestones(interaction.user.id);
    }, 10000);
    return;
  }

  // --- TLAČÍTKA: GALERIE KARET V ALBU ---
  if (interaction.isButton() && interaction.customId.startsWith('view_album_')) {
    const parts = interaction.customId.split('_');
    const team = parts[2];
    const targetIndex = parseInt(parts[3], 10);
    
    const user = getUser(interaction.user.id);
    const ownedTeamCards = cardsDb.cards.filter(c => c.team === team && user.inventory.includes(c.id));

    if (ownedTeamCards.length === 0) return interaction.reply({ content: "❌ Zatím nemáš žádné karty tohoto týmu.", ephemeral: true });

    const card = ownedTeamCards[targetIndex];

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`view_album_${team}_${targetIndex - 1}`)
        .setLabel('◀ Předchozí')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(targetIndex === 0),
      new ButtonBuilder()
        .setCustomId(`flip_${card.id}_back`)
        .setLabel('🔄 Otočit kartu')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`view_album_${team}_${targetIndex + 1}`)
        .setLabel('Další ▶')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(targetIndex === ownedTeamCards.length - 1)
    );

    const embed = new EmbedBuilder()
      .setTitle(`${card.team} | ${card.name}`)
      .setDescription(`Pozice: **${card.role}**\nID Karty: \`${card.id}\`\n*Karta ${targetIndex + 1} z ${ownedTeamCards.length}*`)
      .setImage(card.front)
      .setColor(BRAND_COLOR);

    if (interaction.replied || interaction.deferred) {
      await interaction.update({ embeds: [embed], components: [row] });
    } else {
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
    return;
  }

  // --- TLAČÍTKA: OTOČENÍ KARTY (UNIVERZÁLNÍ) ---
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
          newRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`flip_${cardId}_${newFace}`)
              .setLabel(newFace === 'back' ? '🔄 Otočit kartu' : '🔄 Otočit zpět')
              .setStyle(ButtonStyle.Secondary)
          );
        } else {
          newRow.addComponents(ButtonBuilder.from(comp));
        }
      });
    } else {
      newRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`flip_${cardId}_${newFace}`)
          .setLabel(newFace === 'back' ? '🔄 Otočit kartu' : '🔄 Otočit zpět')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    await interaction.update({
      embeds: [{
        title: `${card.team} | ${card.name}`,
        description: interaction.message.embeds[0].description,
        image: { url: targetFace === 'back' ? card.back : card.front },
        color: interaction.message.embeds[0].color 
      }],
      components: [newRow]
    });
    return;
  }

  // --- TLAČÍTKA: TRŽIŠTĚ ---
  if (interaction.isButton() && interaction.customId.startsWith('marketbuy_')) {
    const [, sellerId, cardId, priceStr] = interaction.customId.split('_');
    const price = parseInt(priceStr, 10);
    const buyer = getUser(interaction.user.id);

    if (buyer.id === sellerId) return interaction.reply({ content: "❌ Nemůžeš koupit vlastní kartu.", ephemeral: true });
    if (buyer.pucks < price) return interaction.reply({ content: "❌ Nemáš dost puků.", ephemeral: true });

    const seller = usersDb[sellerId];
    if (!seller || !seller.inventory.includes(cardId)) {
      await interaction.message.delete().catch(()=>null);
      return interaction.reply({ content: "❌ Tato karta už není k dispozici.", ephemeral: true });
    }

    buyer.pucks -= price;
    seller.pucks += price;
    seller.inventory.splice(seller.inventory.indexOf(cardId), 1);
    buyer.inventory.push(cardId);
    saveUsers();

    await interaction.message.delete().catch(()=>null);
    interaction.reply({ content: `✅ Úspěšně jsi zakoupil kartu za ${price} puků!`, ephemeral: true });
    
    checkMilestones(buyer.id);
    
    const logCh = await client.channels.fetch(CH_LOG).catch(()=>null);
    if (logCh) logCh.send(`🤝 <@${buyer.id}> koupil kartu od <@${seller.id}> za **${price} puků** na tržišti!`);
    return;
  }

  // --- TLAČÍTKA: TRADE ---
  if (interaction.isButton() && interaction.customId.startsWith('tradeaccept_')) {
    const [, initiatorId, targetId, myCardId, theirCardId] = interaction.customId.split('_');
    if (interaction.user.id !== targetId) return interaction.reply({ content: "❌ Tento trade není pro tebe.", ephemeral: true });

    const initiator = usersDb[initiatorId];
    const target = usersDb[targetId];

    if (!initiator.inventory.includes(myCardId) || !target.inventory.includes(theirCardId)) {
      await interaction.message.delete().catch(()=>null);
      return interaction.reply({ content: "❌ Trade už není možný, některý z hráčů už kartu nemá.", ephemeral: true });
    }

    initiator.inventory.splice(initiator.inventory.indexOf(myCardId), 1);
    initiator.inventory.push(theirCardId);
    target.inventory.splice(target.inventory.indexOf(theirCardId), 1);
    target.inventory.push(myCardId);
    saveUsers();

    await interaction.message.edit({ content: `✅ **Trade úspěšně proběhl!**\n<@${initiatorId}> získal \`${theirCardId}\` a <@${targetId}> získal \`${myCardId}\`.`, components: [] });
    interaction.reply({ content: "Úspěšně potvrzeno.", ephemeral: true });
    
    checkMilestones(initiatorId);
    checkMilestones(targetId);
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith('tradedecline_')) {
    const [, targetId] = interaction.customId.split('_');
    if (interaction.user.id !== targetId) return interaction.reply({ content: "❌ Tento trade není pro tebe.", ephemeral: true });
    
    await interaction.message.edit({ content: `❌ **Trade zrušen.** <@${targetId}> nabídku odmítl.`, components: [] });
    return interaction.reply({ content: "Nabídka odmítnuta.", ephemeral: true });
  }

  // --- SLASH COMMANDS ---
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "link") {
      const nick = interaction.options.getString("nick");
      const user = getUser(interaction.user.id, nick);
      user.tbName = nick;
      saveUsers();
      return interaction.reply({ content: `✅ Tvůj Discord účet byl propojen s TrucksBook nickem **${nick}**.`, ephemeral: true });
    }

    if (interaction.commandName === "puky") {
      const user = getUser(interaction.user.id);
      return interaction.reply({ content: `🏒 Aktuálně máš **${user.pucks} puků**.`, ephemeral: true });
    }

    if (interaction.commandName === "album") {
      const team = interaction.options.getString("tym").toUpperCase();
      const targetUser = interaction.options.getUser("uzivatel") || interaction.user;
      const userObj = getUser(targetUser.id);
      const teamCards = cardsDb.cards.filter(c => c.team === team);
      
      if (teamCards.length === 0) return interaction.reply({ content: "❌ Tento tým neexistuje (Zkus např. CZE, SVK, CAN).", ephemeral: true });

      let desc = "";
      let ownedCount = 0;
      
      teamCards.forEach(c => {
        if (userObj.inventory.includes(c.id)) {
          desc += `✅ **${c.role}** - ${c.name} \`[${c.id}]\`\n\n`;
          ownedCount++;
        } else {
          desc += `❌ **${c.role}** - *???*\n\n`;
        }
      });

      const embed = new EmbedBuilder()
        .setTitle(`📖 Album: ${team} (${targetUser.username})`)
        .setDescription(desc)
        .setFooter({ text: `Zkompletováno: ${ownedCount}/${teamCards.length}` })
        .setColor(BRAND_COLOR);

      const components = [];
      if (targetUser.id === interaction.user.id && ownedCount > 0) {
        components.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`view_album_${team}_0`)
              .setLabel('🖼️ Prohlédnout mé karty')
              .setStyle(ButtonStyle.Success)
          )
        );
      }

      return interaction.reply({ embeds: [embed], components: components });
    }

    if (interaction.commandName === "prodat") {
      const cardId = interaction.options.getString("karta_id").toUpperCase();
      const price = interaction.options.getInteger("cena");
      const user = getUser(interaction.user.id);

      if (!user.inventory.includes(cardId)) return interaction.reply({ content: "❌ Tuto kartu nevlastníš.", ephemeral: true });

      const card = cardsDb.cards.find(c => c.id === cardId);
      const marketCh = await client.channels.fetch(CH_MARKET).catch(()=>null);
      
      if (marketCh) {
        const btn = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`marketbuy_${user.id}_${cardId}_${price}`).setLabel(`Koupit za ${price} puků`).setStyle(ButtonStyle.Success)
        );
        
        await marketCh.send({
          content: `🛒 **Nová nabídka na trhu!**\nProdejce: <@${user.id}>`,
          embeds: [{ title: `${card.team} | ${card.name}`, image: { url: card.front }, color: 0x2ECC71 }],
          components: [btn]
        });
        return interaction.reply({ content: `✅ Tvá karta byla vystavena na tržiště.`, ephemeral: true });
      }
    }

    if (interaction.commandName === "trade") {
      const targetUser = interaction.options.getUser("uzivatel");
      const myCardId = interaction.options.getString("nabizim").toUpperCase();
      const theirCardId = interaction.options.getString("chci").toUpperCase();
      const user = getUser(interaction.user.id);
      const target = getUser(targetUser.id);

      if (targetUser.id === interaction.user.id) return interaction.reply({ content: "❌ Nemůžeš měnit sám se sebou.", ephemeral: true });
      if (!user.inventory.includes(myCardId)) return interaction.reply({ content: `❌ Kartu \`${myCardId}\` nevlastníš.`, ephemeral: true });
      if (!target.inventory.includes(theirCardId)) return interaction.reply({ content: `❌ Hráč ${targetUser.username} kartu \`${theirCardId}\` nevlastní.`, ephemeral: true });

      const cmdsCh = await client.channels.fetch(CH_CMDS).catch(()=>null);
      if (cmdsCh) {
        const btnRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`tradeaccept_${interaction.user.id}_${targetUser.id}_${myCardId}_${theirCardId}`).setLabel('Souhlasím s výměnou').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`tradedecline_${targetUser.id}`).setLabel('Odmítnout').setStyle(ButtonStyle.Danger)
        );

        await cmdsCh.send({
          content: `🤝 **Návrh na Trade!**\n<@${targetUser.id}>, hráč <@${interaction.user.id}> ti nabízí kartu \`${myCardId}\` výměnou za tvou kartu \`${theirCardId}\`!`,
          components: [btnRow]
        });
        return interaction.reply({ content: `✅ Návrh na trade odeslán.`, ephemeral: true });
      }
    }

    if (interaction.commandName === "vsadit") {
      const matchName = interaction.options.getString("zapas");
      const tip = interaction.options.getString("tip");
      const puky = interaction.options.getInteger("puky");
      const user = getUser(interaction.user.id);

      if (user.pucks < puky) return interaction.reply({ content: `❌ Nemáš dost puků! Máš jen ${user.pucks}.`, ephemeral: true });
      if (puky <= 0) return interaction.reply({ content: `❌ Musíš vsadit alespoň 1 puk.`, ephemeral: true });

      user.pucks -= puky;
      user.bets.push({ match: matchName, tip: tip, amount: puky });
      saveUsers();

      return interaction.reply({ content: `✅ Vsadil jsi **${puky} puků** na tip **${tip}** v zápase **${matchName}**!\n(Když tvůj tým vyhraje, bot ti později rozdá výhru a odznak Experta!)`, ephemeral: true });
    }

    if (interaction.commandName === "admin-setup-shop") {
      await interaction.deferReply({ ephemeral: true });
      const shopCh = await client.channels.fetch(CH_SHOP).catch(()=>null);
      if (!shopCh) return interaction.editReply("Chyba kanálu.");

      const select = new StringSelectMenuBuilder()
        .setCustomId('shop_category_select')
        .setPlaceholder('Vyberte kategorii balíčků...')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Základní a Poziční balíčky').setValue('basic').setEmoji('📦'),
          new StringSelectMenuOptionBuilder().setLabel('Skupinové balíčky').setValue('groups').setEmoji('🏆'),
          new StringSelectMenuOptionBuilder().setLabel('Národní balíčky').setValue('national').setEmoji('🌍')
        );

      const row = new ActionRowBuilder().addComponents(select);

      await shopCh.send({ 
        embeds: [{ 
          title: "🛒 Hokejový Obchod LTR", 
          description: "Vítej v obchodě s hokejovými kartičkami!\n\nVyber si v menu níže kategorii a otevři si svůj soukromý katalog, kde si můžeš v klidu prohlédnout a zakoupit všechny dostupné balíčky.\n\n*Puky získáváš ježděním (200 km = 1 puk).*.", 
          color: SHOP_COLOR
        }], 
        components: [row] 
      });

      return interaction.editReply("✅ Nový katalog obchodu s výběrem kategorií byl úspěšně vykreslen.");
    }

    if (interaction.commandName === "admin-puky") {
      const targetUser = interaction.options.getUser("uzivatel");
      const amount = interaction.options.getInteger("pocet");
      const userObj = getUser(targetUser.id);
      
      userObj.pucks += amount;
      saveUsers();
      
      return interaction.reply({ content: `✅ Hráči ${targetUser.username} bylo přidáno/odebráno ${amount} puků. Nyní má **${userObj.pucks} puků**.`, ephemeral: true });
    }

    if (interaction.commandName === "admin-karta") {
      const targetUser = interaction.options.getUser("uzivatel");
      const cardId = interaction.options.getString("karta_id").toUpperCase();
      
      const card = cardsDb.cards.find(c => c.id === cardId);
      if (!card) return interaction.reply({ content: `❌ Karta s ID \`${cardId}\` v databázi neexistuje.`, ephemeral: true });
      
      const userObj = getUser(targetUser.id);
      userObj.inventory.push(cardId);
      saveUsers();
      
      return interaction.reply({ content: `✅ Hráči ${targetUser.username} byla přímo do inventáře přidána karta \`${cardId}\`.`, ephemeral: true });
    }

    if (interaction.commandName === "admin-zapasy") {
      await interaction.deferReply({ ephemeral: true });
      const result = await fetchMatches();
      if (result === true) {
        return interaction.editReply("✅ Zápasy byly úspěšně staženy a kanál `#zápasy` byl aktualizován.");
      } else {
        return interaction.editReply(`❌ Nastala chyba při stahování zápasů z API. Tohle se API nelíbilo:\n\`\`\`${result}\`\`\``);
      }
    }
  }
});

// ─────────────────────────────────────────────
// MECHANIKA MILNÍKŮ (ROLE)
// ─────────────────────────────────────────────
async function checkMilestones(userId) {
  const user = usersDb[userId];
  if (!user) return;

  const userCards = user.inventory;
  const teams = [...new Set(cardsDb.cards.map(c => c.team))];
  let completedSets = 0;

  for (const team of teams) {
    const requiredCards = cardsDb.cards.filter(c => c.team === team).map(c => c.id);
    const hasAll = requiredCards.every(id => userCards.includes(id));
    if (hasAll) completedSets++;
  }

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(userId);
    const logCh = await client.channels.fetch(CH_LOG);

    if (completedSets >= 1 && !member.roles.cache.has(ROLE_FAN)) {
      await member.roles.add(ROLE_FAN);
      if(logCh) logCh.send(`🏆 Hráč <@${userId}> zkompletoval svůj první tým a získává roli **HOKEJOVÝ FANOUŠEK**!`);
    }

    if (completedSets >= 8 && !member.roles.cache.has(ROLE_COLLECTOR)) {
      await member.roles.add(ROLE_COLLECTOR);
      if(logCh) logCh.send(`👑 NEUVĚŘITELNÉ! <@${userId}> zkompletoval 8 týmů a stává se **SBĚRATELEM**!`);
    }
  } catch(e) {}
}

// ─────────────────────────────────────────────
// THE ODDS API - AKTUALIZACE ZÁPASŮ (CHYTRÁ DETEKCE)
// ─────────────────────────────────────────────
async function fetchMatches() {
  if (!ODDS_API_KEY) return "Chybí API klíč v .env souboru.";
  try {
    // 1. Zjistíme, jaké hokejové ligy API aktuálně sleduje
    const sportsRes = await axios.get(`https://api.the-odds-api.com/v4/sports/?apiKey=${ODDS_API_KEY}`);
    const hockeyLeagues = sportsRes.data.filter(s => s.group === "Ice Hockey" || s.key.includes('icehockey'));

    // 2. Najdeme klíč pro Mistrovství světa
    const targetLeague = hockeyLeagues.find(s => s.key.includes('world') || s.key.includes('iihf') || s.key.includes('champ'));

    if (!targetLeague) {
       const available = hockeyLeagues.map(l => l.key).join(", ");
       return `API aktuálně pod tímto free klíčem nevidí MS v hokeji. Dostupné hokejové ligy jsou: ${available || "Žádné"}`;
    }

    const sportKey = targetLeague.key; // Správný interní název z API

    // 3. Stáhneme kurzy pro správnou ligu
    const res = await axios.get(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h`);
    const matches = res.data.slice(0, 10); 

    const matchCh = await client.channels.fetch(CH_MATCHES).catch(()=>null);
    if (!matchCh) return "Kanál pro zápasy nebyl nalezen.";

    let desc = "";
    matches.forEach(m => {
      const bookmaker = m.bookmakers[0];
      const h2h = bookmaker ? bookmaker.markets[0].outcomes : [];
      let oddsText = "Kurzy zatím nejsou k dispozici.";
      if (h2h.length >= 2) {
         oddsText = `🏠 Domácí (${h2h[0].name}): **${h2h[0].price}** | ✈️ Hosté (${h2h[1].name}): **${h2h[1].price}**`;
      }
      desc += `🏒 **${m.home_team} vs ${m.away_team}**\n🕒 Začátek: <t:${Math.floor(new Date(m.commence_time).getTime()/1000)}:f>\n💰 ${oddsText}\n\n`;
    });

    const embed = new EmbedBuilder().setTitle(`🔥 Aktuální zápasy a kurzy (${targetLeague.title})`).setDescription(desc || "Žádné zápasy nenalezeny.").setColor(BRAND_COLOR);
    
    const msgs = await matchCh.messages.fetch({ limit: 5 });
    if (msgs.size > 0) {
      await msgs.first().edit({ embeds: [embed] });
    } else {
      await matchCh.send({ embeds: [embed] });
    }
    return true;
  } catch (err) {
    console.error("Chyba API:", err.message);
    if(err.response && err.response.data) {
        return err.response.data.message || err.message;
    }
    return err.message;
  }
}

client.once("ready", () => {
  console.log(`Bot LTR Hockey nahozen!`);
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  
  fetchMatches();
  setInterval(fetchMatches, 60 * 60 * 1000); 
});

client.login(TOKEN);
