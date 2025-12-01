import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';

// ====== KONFIGURACE Z ENV ======
const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!TOKEN) {
  throw new Error('Chybí DISCORD_TOKEN v env proměnných.');
}
if (!CHANNEL_ID) {
  console.warn('⚠️ CHYBÍ CHANNEL_ID – bot nebude mít kam posílat kalendář.');
}

const YEAR = new Date().getFullYear(); // aktuální rok (prosinec)

// ====== NASTAVENÍ TRAS ======
// Tady si doplníš svoje data pro jednotlivé dny.
// Zatím je ukázaný jen Den 1 – zbytek si zkopíruješ a přepíšeš.
const ROUTES = [
  {
    day: 1,
    mapUrl: 'https://example.com/mapa-den-1', // odkaz na mapu trasy
    teaserImage: 'https://example.com/den1-teaser.png',   // otazník
    activeImage: 'https://example.com/den1-aktivni.png',  // detail trasy
    expiredImage: 'https://example.com/den1-expired.png', // po termínu
    from: 'TruckersMP HQ',
    to: 'Brno',
    distance: '500 km'
  },

  // ZKOPÍRUJ A UPRAV PRO DNY 2–24
  // {
  //   day: 2,
  //   mapUrl: 'https://example.com/mapa-den-2',
  //   teaserImage: 'https://example.com/den2-teaser.png',
  //   activeImage: 'https://example.com/den2-aktivni.png',
  //   expiredImage: 'https://example.com/den2-expired.png',
  //   from: 'Místo A',
  //   to: 'Místo B',
  //   distance: 'xxx km'
  // },
];

// 10:00 CET = 09:00 UTC → Railway jede v UTC
function getActiveWindow(day) {
  const start = Date.UTC(YEAR, 11, day, 9, 0, 0);        // den, 10:00 našeho času
  const end = Date.UTC(YEAR, 11, day + 1, 9, 0, 0);      // další den, 10:00
  return { start, end };
}

// Vrací: { route, phase } nebo null
// phase = 'TEASER' | 'ACTIVE' | 'NONE'
function getCurrentState(now = new Date()) {
  const nowMs = now.getTime();

  // Najdeme nejbližší den, který ještě neskončil
  let currentRoute = null;
  let phase = 'NONE';

  for (const route of ROUTES) {
    const { start, end } = getActiveWindow(route.day);

    if (nowMs < start) {
      // Ještě před začátkem okna tohoto dne → teaser tohoto dne
      currentRoute = route;
      phase = 'TEASER';
      break;
    } else if (nowMs >= start && nowMs < end) {
      // Jsme přímo v okně → aktivní verze
      currentRoute = route;
      phase = 'ACTIVE';
      break;
    } else {
      // okno tohoto dne skončilo, zkusíme další den
      continue;
    }
  }

  if (!currentRoute) {
    // Všechny dny už skončily → žádná aktivní trasa
    return null;
  }

  return { route: currentRoute, phase };
}

function buildEmbed(state) {
  const { route, phase } = state;

  let description = '';
  let imageUrl = '';
  let color = 0xffc04d; // zlatavá

  const { start, end } = getActiveWindow(route.day);
  const startDate = new Date(start);
  const endDate = new Date(end);

  const timeText = `${startDate.getUTCDate()}.12. ${String(
    startDate.getUTCHours() + 1
  ).padStart(2, '0')}:00 – ${endDate.getUTCDate()}.12. ${String(
    endDate.getUTCHours() + 1
  ).padStart(2, '0')}:00`;

  if (phase === 'TEASER') {
    description =
      `Adventní trasa **#${route.day}** se odemkne v **${timeText}**.\n` +
      `Připrav se, za odjetí získáš TICKET do tomboly! 🎟️`;
    imageUrl = route.teaserImage;
  } else if (phase === 'ACTIVE') {
    description =
      `**Start:** ${route.from}\n` +
      `**Cíl:** ${route.to}\n` +
      `**Délka:** ${route.distance}\n` +
      `**Čas:** ${timeText}\n\n` +
      `Klikni na odkaz nahoře a otevři si mapu trasy 👇`;
    imageUrl = route.activeImage;
    color = 0x4caf50; // zelená pro aktivní
  }

  return {
    title: `🎄 Adventní trasa #${route.day}`,
    description,
    url: route.mapUrl,
    color,
    image: imageUrl ? { url: imageUrl } : undefined,
    footer: {
      text: 'Merry Christmas from LTR <3',
    },
  };
}

// ====== DISCORD BOT ======
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

let lastKey = null; // abychom neposílali stejné embed pořád dokola

async function checkAndUpdate() {
  if (!CHANNEL_ID) return;

  const now = new Date();
  const state = getCurrentState(now);

  if (!state) {
    // všechno proběhlo – nic neposíláme
    return;
  }

  const key = `${state.route.day}-${state.phase}`;
  if (key === lastKey) {
    // nic nového, stav se nezměnil
    return;
  }

  lastKey = key;

  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel) {
    console.warn('Kanál s CHANNEL_ID nenalezen.');
    return;
  }

  const embed = buildEmbed(state);

  await channel.send({ embeds: [embed] });
  console.log(
    `[${now.toISOString()}] Posílám nový embed: den ${state.route.day}, fáze ${state.phase}`
  );
}

client.once('ready', () => {
  console.log(`✅ Přihlášen jako ${client.user.tag}`);

  // zkusíme hned po startu
  checkAndUpdate().catch(console.error);

  // potom kontrola každou minutu
  setInterval(() => {
    checkAndUpdate().catch(console.error);
  }, 60 * 1000);
});

client.login(TOKEN);
