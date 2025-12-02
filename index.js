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

const ROUTES = [
  {
    day: 1,
    activeImage: "https://i.imgur.com/HPMLtys.png",
    expiredImage: "https://i.imgur.com/khFtCVK.png",
    mapUrl: "https://your-cdn.com/advent/map01.png",
    from: "Start den 1",
    to: "Cíl den 1",
    distance: "XXX km"
  },
  {
    day: 2,
    activeImage: "https://i.imgur.com/F42xYm8.png",
    expiredImage: "https://i.imgur.com/8MZchL2.png",
    mapUrl: "https://your-cdn.com/advent/map02.png",
    from: "Berlín",
    to: "Amsterdam",
    distance: "632 km"
  },
  {
    day: 3,
    activeImage: "https://i.imgur.com/UmaYyrl.png",
    expiredImage: "https://i.imgur.com/wwQLKHC.png",
    mapUrl: "https://your-cdn.com/advent/map03.png",
    from: "Amsterdam",
    to: "Paříž",
    distance: "534 km"
  },
  {
    day: 4,
    activeImage: "https://i.imgur.com/H6laRTj.png",
    expiredImage: "https://i.imgur.com/1VqFXCy.png",
    mapUrl: "https://your-cdn.com/advent/map04.png",
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
    mapUrl: "https://your-cdn.com/advent/map06.png",
    from: "Kolín",
    to: "Lyon",
    distance: "699 km"
  },
  {
    day: 7,
    activeImage: "https://i.imgur.com/jZMBBLG.png",
    expiredImage: "https://i.imgur.com/2sVdU9S.png",
    mapUrl: "https://your-cdn.com/advent/map07.png",
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

// ─────────────────────────────────────────────
// ŽETONY – práce s tokens.json
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

function saveTokens(tokens) {
  try {
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), 'utf8');
  } catch (err) {
    console.error('Chyba při zápisu tokens.json:', err);
  }
}

let tokens = loadTokens();

// 3 stříbrné -> 1 zlatý (automaticky)
function addTokens(userId, silver, gold) {
  if (!tokens[userId]) {
    tokens[userId] = { silver: 0, gold: 0 };
  }

  // Přičtení základních odměn
  tokens[userId].silver += silver;
  tokens[userId].gold += gold;

  // Automatická konverze 3 stříbrné -> 1 zlatý
  while (tokens[userId].silver >= 3) {
    tokens[userId].silver -= 3;
    tokens[userId].gold += 1;
  }

  saveTokens(tokens);
}

function getUserTokens(userId) {
  return tokens[userId] || { silver: 0, gold: 0 };
}

// pro leaderboard – skóre = zlaté*3 + stříbrné
function getUserScore(t) {
  return t.gold * 3 + t.silver;
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

function normalizeLocation(raw) {
  if (!raw) return '';
  return raw.replace(/^[^A-Za-zÀ-ž]+/, '').trim();
}

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
// Slash commandy: /setup, /zetony, /preview, /leaderboard, /admin-dump
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
    const userTokens = getUserTokens(interaction.user.id);

    await interaction.reply({
      content: `📣 ${interaction.user}, tady je tvůj aktuální stav žetonů:`,
      embeds: [
        {
          title: "💰 Stav žetonů",
          description:
            `🥇 Zlaté: **${userTokens.gold}**\n` +
            `🥈 Stříbrné: **${userTokens.silver}**\n` +
            `📊 Body: **${getUserScore(userTokens)}** (1🥇 = 3 body, 1🥈 = 1 bod)`,
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
        content: `📉 Zatím nikdo nezískal žádné žetony.`,
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
      const [userId, data] = top[i];
      let userTag = `<@${userId}>`;

      try {
        const user = await client.users.fetch(userId);
        userTag = user ? `<@${user.id}>` : `Neznámý uživatel (${userId})`;
      } catch {
        userTag = `Neznámý uživatel (${userId})`;
      }

      const score = getUserScore(data);
      lines.push(
        `**${i + 1}.** ${userTag} — 🥇 **${data.gold}** | 🥈 **${data.silver}** (📊 **${score}** bodů)`
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

  if (interaction.commandName === "admin-dump") {
    // bezpečnost: zkontrolujeme, že má admin práva, i když to Discord filtruje
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
    r.from === from &&
    r.to === to &&
    ts >= r.start &&
    ts < r.end
  );

  if (!reward) return;

  addTokens(message.author.id, reward.silver, reward.gold);
  console.log(`Žetony: ${message.author.tag} +${reward.silver}🥈 +${reward.gold}🥇 za trasu ${from} → ${to}`);
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
    embeds: [activeEmbed],
    components: activeButton
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
