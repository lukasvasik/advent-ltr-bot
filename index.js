import 'dotenv/config';
import {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
  EmbedBuilder, PermissionFlagsBits, AttachmentBuilder
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─────────────────────────────────────────────
// KONFIGURACE A CESTY
// ─────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_PATH = path.join(__dirname, 'users_db.json');
const SYSTEM_PATH = path.join(__dirname, 'system_db.json');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ID KANÁLŮ
const CH_JOBS_1 = '1149900706543833208'; 
const CH_JOBS_2 = '1392644970438983720'; 
const CH_LOG = '1527691949711298813';
const CH_CMDS = '1527691324231258132';
const CH_DAILY_GOAL = '1505658956775686225';
const CH_SECRET_CITY = '1527692298131865740';
const CH_ROUTES = '1505189708693770300';
const CH_BACKUP = '1505571130956578917';

// ID ROLÍ
const ROLE_KING = '1527690385822978169';
const ROLE_QUESTMASTER = '1527690306554691775';
const ROLE_3RD_ANNIVERSARY = '1392649848079257693';
const ROLE_HUNTER_DNE = '1489757276435648552';
const ROLE_SECRET_EXPLORER = '1500670331063505066';

const EVENT_COLOR = 0xFF8C00;
const EVENT_START_DATE = new Date('2026-07-17T19:00:00+02:00').getTime(); 
const EVENT_END_DATE = new Date('2026-07-25T19:00:00+02:00').getTime(); 

// DEV REŽIM
let isDevMode = false;

// ─────────────────────────────────────────────
// DATA EVENTU A QUESTY (včetně příběhů)
// ─────────────────────────────────────────────
const PROGRESS_BAR_IMAGES = [
    "https://i.imgur.com/0ykXCSw.png", "https://i.imgur.com/ztyvGOl.png", "https://i.imgur.com/gRoTYIp.png", 
    "https://i.imgur.com/07dm9dX.png", "https://i.imgur.com/Y33sOiw.png", "https://i.imgur.com/xsjB4zw.png", 
    "https://i.imgur.com/hgfThcQ.png", "https://i.imgur.com/ubs1ziZ.png", "https://i.imgur.com/wNvYdM4.png", 
    "https://i.imgur.com/eI7vsGB.png", "https://i.imgur.com/0JDLAbP.png", "https://i.imgur.com/QEzZmGW.png", 
    "https://i.imgur.com/Z5LC31T.png", "https://i.imgur.com/0Kt1Ww5.png", "https://i.imgur.com/5ZZfFW5.png", 
    "https://i.imgur.com/5ZePPlx.png", "https://i.imgur.com/QZYpTcm.png", "https://i.imgur.com/s5TDFs9.png", 
    "https://i.imgur.com/w1CU9yH.png", "https://i.imgur.com/IS65EZu.png", "https://i.imgur.com/dK4Fm8s.png"
];

const ROUTES = [
    { day: 1, start: "Praha", end: "Brno", cargos: ["Nápoje"], goal: 50, img: "https://i.imgur.com/5XTW3FA.png", story: "Přípravy na narozeninovou oslavu byly oficiálně zahájeny. Organizátoři zajistili první zásobu občerstvení. Vaším úkolem je bezpečně dopravit nápoje z Prahy na místo oslav v Brně." },
    { day: 2, start: "Hamburk", end: "Brno", cargos: ["Potřeby ke stolování"], goal: 100, img: "https://i.imgur.com/7wR8bW6.png", story: "Po zajištění občerstvení je potřeba připravit zázemí pro hosty. V Hamburku byly naloženy potřeby ke stolování, které budou využity při slavnostním občerstvení během oslav narozenin." },
    { day: 3, start: "Bratislava", end: "Brno", cargos: ["Květiny a stromy"], goal: 150, img: "https://i.imgur.com/lymELya.png", story: "Chceme, aby byla letošní oslava opravdu výjimečná. Ve spolupráci s floristy byla připravena rozsáhlá květinová výzdoba, kterou je nyní potřeba bezpečně dopravit z Bratislavy." },
    { day: 4, start: "Štětín", end: "Brno", cargos: ["Hračky"], goal: 200, img: "https://i.imgur.com/t6fcP9x.png", story: "Na oslavu byli pozváni také rodinní příslušníci a nejmladší návštěvníci. Proto bylo rozhodnuto připravit speciální zábavnou zónu. Vaším úkolem je přepravit vybavení a dárky určené pro dětské návštěvníky." },
    { day: 5, start: "Linec", end: "Brno", cargos: ["Čokolády"], goal: 250, img: "https://i.imgur.com/oWPrZey.png", story: "Každá pořádná narozeninová oslava potřebuje dostatek sladkostí. Počet potvrzených hostů překonal všechna očekávání, a proto byla objednána mimořádná zásilka čokoládových výrobků." },
    { day: 6, start: "Poznaň", end: "Brno", cargos: ["Limonády"], goal: 250, img: "https://i.imgur.com/J8tVmQU.png", story: "Po aktualizaci seznamu hostů bylo zjištěno, že původní zásoby nebudou dostačovat. Organizátoři proto zajistili dodatečnou zásilku limonád, která musí být doručena včas před zahájením oslav." },
    { day: 7, start: "Linec", end: "Brno", cargos: ["Elektroniku", "Elektronika"], goal: 250, img: "https://i.imgur.com/waiarlZ.png", story: "Blíží se vyvrcholení příprav. Do Brna je potřeba dopravit profesionální ozvučovací a světelnou techniku, která zajistí hudební doprovod a atmosféru celé narozeninové oslavy." },
    { day: 8, start: "Berlín", end: "Brno", cargos: ["Ohňostroje"], goal: 250, img: "https://i.imgur.com/BO0Rgu6.png", story: "Nastal čas na poslední a nejdůležitější úkol celé expedice. V Berlíně je připravena hlavní zásilka zábavní pyrotechniky určené pro slavnostní zakončení oslav. Vaším úkolem je bezpečně dopravit tento cenný náklad do Brna, kde po jeho doručení mohou být zahájeny oslavy." }
];

const QUESTS = [
    { id: 0, tier: "common", type: "km", target: 1000, reward: 50, desc: "Zahřívačka: Ujeď celkem 1 000 km" },
    { id: 1, tier: "common", type: "jobs", targetCount: 2, reward: 100, desc: "Novice: Odvez 2 eventové zakázky" },
    { id: 2, tier: "common", type: "truck", target: "Iveco", targetCount: 2, reward: 100, desc: "Italský styl: Odvez 2 zakázky s Ivecem" },
    { id: 3, tier: "common", type: "km", target: 3000, reward: 150, desc: "Cestovatel: Ujeď 3 000 km" },
    { id: 4, tier: "common", type: "truck", target: "Renault", targetCount: 2, reward: 100, desc: "Francouzský šarm: Odvez 2 zakázky s Renaultem" },
    { id: 5, tier: "common", type: "city", target: "Brno", targetCount: 3, reward: 250, desc: "Vítej v Brně: Doruč 3 zakázky do Brna" },
    { id: 6, tier: "common", type: "truck", target: "DAF", targetCount: 3, reward: 150, desc: "Holandská klasika: Odvez 3 zakázky s DAFem" },
    { id: 7, tier: "rare", type: "jobs", targetCount: 5, reward: 300, desc: "Párty dodávka: Odvez 5 eventových zakázek" },
    { id: 8, tier: "rare", type: "km", target: 5000, reward: 300, desc: "Vytrvalec: Ujeď celkem 5 000 km" },
    { id: 9, tier: "rare", type: "truck", target: "MAN", targetCount: 3, reward: 200, desc: "Německá síla: Odvez 3 zakázky s MANem" },
    { id: 10, tier: "rare", type: "long_jobs", targetKm: 1500, targetCount: 2, reward: 400, desc: "Dálkař: 2 zakázky delší než 1500 km" },
    { id: 11, tier: "rare", type: "truck", target: "Mercedes", targetCount: 3, reward: 250, desc: "Hvězda na cestách: Odvez 3 zakázky s Mercedesem" },
    { id: 12, tier: "rare", type: "km", target: 10000, reward: 500, desc: "Maratonec: Ujeď celkem 10 000 km" },
    { id: 13, tier: "rare", type: "city", target: "Praha", targetCount: 3, reward: 350, desc: "Pražák: Doruč 3 zakázky do Prahy" },
    { id: 14, tier: "rare", type: "truck", target: "Scania", targetCount: 4, reward: 300, desc: "Věrnost značce: Odvez 4 zakázky se Scanií" },
    { id: 15, tier: "epic", type: "jobs", targetCount: 10, reward: 500, desc: "Oslavenec: 10 eventových zakázek" },
    { id: 16, tier: "epic", type: "long_jobs", targetKm: 2000, targetCount: 2, reward: 600, desc: "Evropan: 2 zakázky nad 2000 km" },
    { id: 17, tier: "epic", type: "truck", target: "Volvo", targetCount: 4, reward: 300, desc: "Švédská ocel: Odvez 4 zakázky s Volvem" },
    { id: 18, tier: "epic", type: "jobs", targetCount: 15, reward: 800, desc: "Veterán eventu: 15 eventových zakázek" },
    { id: 19, tier: "epic", type: "long_jobs", targetKm: 2500, targetCount: 2, reward: 800, desc: "Extrém: 2 zakázky nad 2500 km" },
    { id: 20, tier: "epic", type: "km", target: 20000, reward: 1000, desc: "Těžká váha: Ujeď celkem 20 000 km" },
    { id: 21, tier: "epic", type: "jobs", targetCount: 25, reward: 1500, desc: "Hrdina výročí: 25 eventových zakázek" }
];

const SECRET_CITIES_LIST = [
    "Aberdeen", "Birmingham", "Cambridge", "Cardiff", "Carlisle", "Dover", "Edinburgh", "Felixstowe", 
    "Glasgow", "Grimsby", "Liverpool", "Londýn", "Manchester", "Newcastle-upon-Tyne", "Plymouth", 
    "Sheffield", "Southampton", "Swansea", "Berlín", "Brémy", "Dortmund", "Drážďany", "Duisburg", 
    "Düsseldorf", "Erfurt", "Frankfurt nad Mohanem", "Hamburg", "Hannover", "Kassel", "Kiel", 
    "Kolín nad Rýnem", "Lipsko", "Magdeburg", "Mannheim", "Mnichov", "Norimberk", "Osnabrück", 
    "Rostock", "Stuttgart", "Calais", "Dijon", "Lille", "Lyon", "Mety", "Paříž", "Remeš", 
    "Štrasburk", "Štýrský Hradec", "Innsbruck", "Celovec", "Linec", "Salcburk", "Vídeň", 
    "Milán", "Turín", "Benátky", "Verona", "Bern", "Ženeva", "Curych", "Amsterdam", "Groningen", 
    "Rotterdam", "Poznaň", "Štětín", "Vratislav", "Brusel", "Lutych", "Brno", "Praha", 
    "Bratislava", "Lucemburk"
];

// ─────────────────────────────────────────────
// FUNKCE PRO NÁHODNÉ LOSOVÁNÍ
// ─────────────────────────────────────────────
function getRandomQuestId() {
    const roll = Math.random() * 100;
    let targetTier = "common"; 
    if (roll > 60 && roll <= 90) targetTier = "rare"; 
    else if (roll > 90) targetTier = "epic"; 

    const validQuests = QUESTS.filter(q => q.tier === targetTier);
    if (validQuests.length === 0) return 0; 
    const randomQ = validQuests[Math.floor(Math.random() * validQuests.length)];
    return randomQ.id;
}

function getRandomDailyReward() {
    const roll = Math.random() * 100;
    if (roll <= 25) return "🎨 3x Paint Job dle výběru"; 
    if (roll <= 40) return "🚚 3x Trailer // Tuning Pack dle výběru"; 
    if (roll <= 45) return "🗺️ 1x Mapové DLC do 8,99 EUR"; 
    if (roll <= 75) return "🚚 1x Trailer // Tuning Pack dle výběru"; 
    return "🎨 1x Paint Job dle výběru"; 
}

// ─────────────────────────────────────────────
// DATABÁZE A PAMĚŤ
// ─────────────────────────────────────────────
let usersDb = fs.existsSync(USERS_PATH) ? JSON.parse(fs.readFileSync(USERS_PATH, 'utf8')) : {};
let systemDb = fs.existsSync(SYSTEM_PATH) ? JSON.parse(fs.readFileSync(SYSTEM_PATH, 'utf8')) : { 
    currentDay: 0, communityJobsToday: 0, 
    hhActiveUntil: 0, hhCountToday: 0, 
    secretCity: "", secretCityRevealed: [], secretCityFoundBy: null, nextSecretCityResetUnix: 0,
    hunterDneDay: 0, hunterDneUserId: null, secretExplorerUserId: null, currentDailyRewardText: ""
};

const saveUsers = () => fs.writeFileSync(USERS_PATH, JSON.stringify(usersDb, null, 2));
const saveSystem = () => fs.writeFileSync(SYSTEM_PATH, JSON.stringify(systemDb, null, 2));

function getUser(id, tbName = null) {
  if (!usersDb[id]) {
    usersDb[id] = { 
        id, tbName: tbName || "Neznámý", xp: 0, km: 0, eventJobs: 0, 
        processedJobs: [], recentJobHashes: [], completedRoutesDays: [], completedQuests: 0,
        currentQuestId: getRandomQuestId(), 
        questProgress: 0, lastQuestSkip: 0 
    };
  }
  if (!usersDb[id].recentJobHashes) usersDb[id].recentJobHashes = [];
  if (!usersDb[id].completedRoutesDays) usersDb[id].completedRoutesDays = [];
  if (usersDb[id].completedQuests === undefined) usersDb[id].completedQuests = 0;
  if (usersDb[id].currentQuestId === undefined || usersDb[id].currentQuestId >= QUESTS.length) usersDb[id].currentQuestId = getRandomQuestId();
  return usersDb[id];
}

const normalizeStr = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

// ─────────────────────────────────────────────
// PŘÍKAZY (SLASH COMMANDS)
// ─────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName("profil").setDescription("Zobrazí tvůj nebo cizí profil v eventu.")
    .addUserOption(o => o.setName("hrac").setDescription("Vyber hráče (volitelné)").setRequired(false)),
  new SlashCommandBuilder().setName("link").setDescription("Propojí tvůj Discord s TrucksBook/Trucky nickem.")
    .addStringOption(o => o.setName("nick").setDescription("Tvůj nick").setRequired(true)),
  new SlashCommandBuilder().setName("quest-skip").setDescription("Přeskočí aktuální quest a vylosuje ti jiný (1x denně zdarma)."),
  new SlashCommandBuilder().setName("odmeny").setDescription("Zobrazí přehled odměn, šance na drop a informace o losování."),
  new SlashCommandBuilder().setName("leaderboard").setDescription("Zobrazí žebříček eventu.")
    .addStringOption(o => o.setName("kategorie").setDescription("Podle čeho?").setRequired(true).addChoices(
        { name: '⭐ Získané XP', value: 'xp' },
        { name: '🚚 Najeté Kilometry', value: 'km' },
        { name: '📦 Doručené Zakázky', value: 'jobs' },
        { name: '📜 Splněné Questy', value: 'quests' }
    )),
  new SlashCommandBuilder().setName("test-cteni").setDescription("🛠️ (DEV) Otestuje, jak bot přečte zkopírovaný text zakázky.")
    .addStringOption(o => o.setName("text").setDescription("Vlož text zakázky z bota").setRequired(true)),
  new SlashCommandBuilder().setName("dev-override").setDescription("🛠️ (DEV) ADMIN: Zapne testovací režim bez ohledu na datum startu eventu.")
].map(c => c.toJSON());

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ]});

// ─────────────────────────────────────────────
// POMOCNÉ FUNKCE PRO TAJNÉ MĚSTO
// ─────────────────────────────────────────────
function getNextSecretCityResetUnix() {
    const now = new Date();
    const czTimeStr = now.toLocaleString("en-US", {timeZone: "Europe/Prague"});
    const czTime = new Date(czTimeStr);
    
    const nextResetCz = new Date(czTime.getTime());
    if (czTime.getHours() >= 19) {
        nextResetCz.setDate(nextResetCz.getDate() + 1);
        nextResetCz.setHours(7, 0, 0, 0); // Zítra v 7:00
    } else if (czTime.getHours() >= 7) {
        nextResetCz.setHours(19, 0, 0, 0); // Dnes v 19:00
    } else {
        nextResetCz.setHours(7, 0, 0, 0); // Dnes v 7:00
    }
    
    const msUntilReset = nextResetCz.getTime() - czTime.getTime();
    return Math.floor((now.getTime() + msUntilReset) / 1000);
}

async function transferRole(guildId, roleId, oldUserId, newUserId) {
    try {
        const guild = await client.guilds.fetch(guildId);
        if (oldUserId && oldUserId !== newUserId) {
            const oldMember = await guild.members.fetch(oldUserId).catch(()=>null);
            if (oldMember) await oldMember.roles.remove(roleId).catch(()=>null);
        }
        if (newUserId) {
            const newMember = await guild.members.fetch(newUserId).catch(()=>null);
            if (newMember) await newMember.roles.add(roleId).catch(()=>null);
        }
    } catch(e) {}
}

function startNewSecretCity() {
    const randomCity = SECRET_CITIES_LIST[Math.floor(Math.random() * SECRET_CITIES_LIST.length)];
    systemDb.secretCity = randomCity;
    systemDb.secretCityRevealed = new Array(randomCity.length).fill(false);
    if (randomCity.length > 3) {
        systemDb.secretCityRevealed[0] = true;
        systemDb.secretCityRevealed[randomCity.length - 1] = true;
    }
    systemDb.secretCityFoundBy = null;
    systemDb.nextSecretCityResetUnix = getNextSecretCityResetUnix();
    
    saveSystem();
    announceSecretCityWordle();
}

function revealNextLetter() {
    if (!systemDb.secretCity || systemDb.secretCityFoundBy) return;
    const unrevealedIndices = [];
    systemDb.secretCityRevealed.forEach((isRevealed, idx) => {
        if (!isRevealed && systemDb.secretCity[idx] !== ' ') unrevealedIndices.push(idx);
    });

    if (unrevealedIndices.length > 0) {
        const randomIdx = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
        systemDb.secretCityRevealed[randomIdx] = true;
        saveSystem();
        announceSecretCityWordle();
    }
}

async function announceSecretCityWordle() {
    const ch = await client.channels.fetch(CH_SECRET_CITY).catch(()=>null);
    if (!ch) return;

    const resetUnix = systemDb.nextSecretCityResetUnix || getNextSecretCityResetUnix();

    if (systemDb.secretCityFoundBy) {
        const embed = new EmbedBuilder()
            .setTitle("🕵️‍♂️ Tajné Město bylo odhaleno!")
            .setDescription(`Gratulujeme! <@${systemDb.secretCityFoundBy}> rozluštil záhadu a dovezl náklad do města **${systemDb.secretCity}**! Získává bonus 1000 XP a titul **Secret Explorer**.\n\n⏳ Další město se objeví **<t:${resetUnix}:R>** (<t:${resetUnix}:t>).`)
            .setColor(0x00FF00);
        return ch.send({ embeds: [embed] });
    }

    let displayStr = "";
    for (let i = 0; i < systemDb.secretCity.length; i++) {
        if (systemDb.secretCity[i] === ' ') displayStr += "   ";
        else if (systemDb.secretCityRevealed[i]) displayStr += `**${systemDb.secretCity[i].toUpperCase()}** `;
        else displayStr += "\\_ ";
    }

    const embed = new EmbedBuilder()
        .setTitle("🕵️‍♂️ Najdi Tajné Město (Wordle)!")
        .setDescription(`Doruč libovolný náklad (delší než 500 km) do tohoto města jako první a získej obří bonus **1000 XP** a titul **Secret Explorer**!\n\n⏳ **Čas do změny města:** <t:${resetUnix}:R> (<t:${resetUnix}:t>)\n💡 Nápověda se odkrývá každé 3 hodiny.\n\nMěsto: ${displayStr}`)
        .setColor(0x8A2BE2);
    
    const msgs = await ch.messages.fetch({ limit: 5 });
    const oldBotMsg = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes("Najdi Tajné Město"));
    if (oldBotMsg) await oldBotMsg.delete().catch(()=>null);
    ch.send({ embeds: [embed] });
}

// ─────────────────────────────────────────────
// PARSOVÁNÍ ZAKÁZEK A ZPRACOVÁNÍ
// ─────────────────────────────────────────────
function extractJobData(text, title) {
    const combinedText = (title + "\n" + text).replace(/\*/g, '');
    
    const kmMatch = combinedText.match(/(?:Uznaná vzdálenost:|km\n|^)\s*([\d\s.,]+)\s*(km|mi)/im) || combinedText.match(/([\d\s.,]+)\s*(km|mi)/i);
    let km = 0;
    if (kmMatch) {
        km = parseInt(kmMatch[1].replace(/[^\d]/g, ''), 10);
        if (kmMatch[2].toLowerCase().includes('mi')) km = Math.round(km * 1.60934);
    }

    let origin = "neznáme", dest = "neznáme";
    const tbCitiesMatch = combinedText.match(/Odkud\s*Kam\n(?:.*?\s+)?(.*?)\s+(?:.*?\s+)?(.*)\n/i);
    const truckyCitiesMatch = combinedText.match(/to\s*\n\s*(.*?)\n/i); 
    
    if (tbCitiesMatch) {
        origin = tbCitiesMatch[1].replace(/🚚|🏁|🚩/g, '').trim();
        dest = tbCitiesMatch[2].replace(/🚚|🏁|🚩/g, '').trim();
    } else if (truckyCitiesMatch) {
        dest = truckyCitiesMatch[1].trim(); 
    } else {
        const destMatch = combinedText.match(/(?:do|kam|destination):\s*([a-zA-Zá-žÁ-Ž ]+)/i);
        if (destMatch) dest = destMatch[1];
    }

    const cargoMatch = combinedText.match(/(?:Náklad|Cargo):\s*([a-zA-Zá-žÁ-Ž0-9 ]+)/i);
    const truckMatch = combinedText.match(/(?:Tahač|Truck):\s*([a-zA-Z0-9 -]+)/i);

    if (km <= 0) return null;

    return {
        km, origin: normalizeStr(origin), dest: normalizeStr(dest),
        cargo: cargoMatch ? normalizeStr(cargoMatch[1].split('(')[0]) : "neznáme",
        truck: truckMatch ? normalizeStr(truckMatch[1]) : "neznáme"
    };
}

async function processJobMessage(m) {
    if (!isDevMode && m.createdTimestamp < EVENT_START_DATE) return { status: 'ignored_old' };
    if (!isDevMode && Date.now() > EVENT_END_DATE) return { status: 'event_ended' }; 
    if (!m.embeds.length) return { status: 'ignored' };
    
    const e = m.embeds[0];
    const driver = e.author?.name || "Neznámý";
    const titleText = e.title || "";
    const allText = [e.description, ...(e.fields?.map(f => f.name + '\n' + f.value) || [])].join('\n');
    
    const jobIdMatch = titleText.match(/#(\d+)/) || allText.match(/#(\d+)/);
    const jobId = jobIdMatch ? jobIdMatch[1] : `msg_${m.id}`;
    const jobData = extractJobData(allText, titleText);
    if (!jobData) return { status: 'ignored' };

    const jobHash = `${jobData.km}_${jobData.dest}_${jobData.cargo}`;
    const driverNorm = normalizeStr(driver);
    let userKey = Object.keys(usersDb).find(k => {
        if (k.startsWith('UNLINKED_')) return false;
        const dbNick = normalizeStr(usersDb[k].tbName);
        return driverNorm.includes(dbNick) || dbNick.includes(driverNorm);
    });

    if (!userKey) userKey = 'UNLINKED_' + driver;
    const u = getUser(userKey, driver);

    if (u.processedJobs.includes(jobId) || u.recentJobHashes.includes(jobHash)) {
        return { status: 'duplicate' };
    }

    let isEventRoute = false;
    let earnedXP = 100; 
    let isHappyHourJob = false;
    let secretCityFound = false;
    let isNewHunterDne = false;

    if (systemDb.secretCity && !systemDb.secretCityFoundBy && jobData.dest === normalizeStr(systemDb.secretCity) && jobData.km >= 500) {
        secretCityFound = true;
        earnedXP += 1000;
        if (!userKey.startsWith('UNLINKED_')) {
            systemDb.secretCityFoundBy = u.id;
            saveSystem();
            announceSecretCityWordle(); 
        }
    }

    if (systemDb.currentDay > 0 && systemDb.currentDay <= ROUTES.length) {
        const dailyRoute = ROUTES[systemDb.currentDay - 1];
        const allowedCargosNorm = dailyRoute.cargos.map(normalizeStr);
        
        if (jobData.dest === normalizeStr(dailyRoute.end) && allowedCargosNorm.some(c => jobData.cargo.includes(c))) {
            isEventRoute = true;
            u.eventJobs += 1;
            systemDb.communityJobsToday += 1;
            if (!u.completedRoutesDays.includes(systemDb.currentDay)) u.completedRoutesDays.push(systemDb.currentDay);
            
            if (systemDb.hunterDneDay !== systemDb.currentDay && !userKey.startsWith('UNLINKED_')) {
                isNewHunterDne = true;
                systemDb.hunterDneDay = systemDb.currentDay;
            }
            saveSystem();
            updateCommunityProgressBar();
        }
    }

    if (Date.now() < systemDb.hhActiveUntil) {
        isHappyHourJob = true;
        earnedXP = Math.floor(earnedXP * 1.5);
    }

    u.xp += earnedXP;
    u.km += jobData.km;
    u.processedJobs.push(jobId);
    u.recentJobHashes.push(jobHash);
    if (u.recentJobHashes.length > 10) u.recentJobHashes.shift(); 

    // GACHA Quest systém
    let questCompleted = false;
    let earnedQuestXP = 0;
    const q = QUESTS.find(quest => quest.id === u.currentQuestId);
    
    if (q) {
        if (q.type === "km") u.questProgress += jobData.km;
        if (q.type === "jobs" && isEventRoute) u.questProgress += 1;
        if (q.type === "city" && jobData.dest === normalizeStr(q.target)) u.questProgress += 1;
        if (q.type === "truck" && jobData.truck.includes(normalizeStr(q.target))) u.questProgress += 1;
        if (q.type === "long_jobs" && jobData.km >= q.targetKm) u.questProgress += 1;

        const targetRequired = q.targetCount || q.targetKm || q.target;
        if (u.questProgress >= targetRequired) {
            u.xp += q.reward;
            earnedQuestXP = q.reward;
            u.completedQuests += 1;
            u.questProgress = 0;
            u.currentQuestId = getRandomQuestId(); 
            questCompleted = true;
        }
    }

    saveUsers();
    if (!userKey.startsWith('UNLINKED_')) checkMilestoneRoles(userKey);

    return { 
        status: 'added', km: jobData.km, isEventRoute, questCompleted, earnedXP, 
        earnedQuestXP, driver, userKey, secretCityFound, isHappyHourJob, isNewHunterDne 
    };
}

client.on('messageCreate', async (m) => {
    if (m.channel.id !== CH_JOBS_1 && m.channel.id !== CH_JOBS_2) return;
    const res = await processJobMessage(m);
    
    if (res.status === 'added' && !res.userKey.startsWith('UNLINKED_')) {
        if (res.secretCityFound) {
            await transferRole(GUILD_ID, ROLE_SECRET_EXPLORER, systemDb.secretExplorerUserId, res.userKey);
            systemDb.secretExplorerUserId = res.userKey;
            saveSystem();
        }
        if (res.isNewHunterDne) {
            await transferRole(GUILD_ID, ROLE_HUNTER_DNE, systemDb.hunterDneUserId, res.userKey);
            systemDb.hunterDneUserId = res.userKey;
            saveSystem();
        }

        const logCh = await client.channels.fetch(CH_LOG).catch(()=>null);
        if (logCh) {
            let msg = `✅ **${res.driver}** dovezl zakázku (${res.km} km).`;
            if (res.isEventRoute) msg += ` 🎯 Eventová trasa (+ XP).`;
            if (res.isNewHunterDne) msg += ` 🏹 Získává titul **HUNTER DNE**!`;
            if (res.isHappyHourJob) msg += ` 🌟 **HAPPY HOUR 1.5x XP!**`;
            msg += ` Získal **+${res.earnedXP} XP**.`;
            if (res.questCompleted) msg += ` 🏆 Splnil QUEST a získal **+${res.earnedQuestXP} XP** (Byl mu vylosován nový)!`;
            if (res.secretCityFound) msg += ` 🕵️‍♂️ **ODHALIL TAJNÉ MĚSTO (+1000 XP) a získal titul SECRET EXPLORER!**`;
            logCh.send(msg);
        }
    }
});

// ─────────────────────────────────────────────
// MECHANIKA TRAS A PROGRESS BARU
// ─────────────────────────────────────────────
async function announceDailyRoute(day) {
    if (day > 8) return; 

    const route = ROUTES[day - 1];
    
    systemDb.currentDailyRewardText = getRandomDailyReward();
    saveSystem();

    const embed = new EmbedBuilder()
        .setTitle(`🚚 EVENT DEN ${day}/8: Nová trasa!`)
        // ZDE JE ZABUDOVÁN PŘÍBĚH Z POLE ROUTES:
        .setDescription(`📖 **Příběh etapy:**\n*${route.story}*\n\n` +
                        `Dnes svážíme zásoby na oslavu z města **${route.start}** do **${route.end}**!\n\n` +
                        `📦 **Povolené náklady:**\n${route.cargos.map(c => `- ${c}`).join('\n')}\n\n` +
                        `🎯 **Komunitní cíl:** Doručit **${route.goal}** zakázek!\n` +
                        `🎁 **Odměna kom.cíle:** Systém vylosoval **${systemDb.currentDailyRewardText}**!\n` +
                        `🏹 První, získá roli **HUNTER DNE**!`)
        .setImage(route.img)
        .setColor(EVENT_COLOR);

    const annCh = await client.channels.fetch(CH_ROUTES).catch(()=>null);
    if (annCh) {
        await annCh.send({ content: "@everyone 🚨 **Nová trasa vyhlášena!** 🚨", embeds: [embed] });
        updateCommunityProgressBar(true);
    }
}

async function updateCommunityProgressBar(forceNew = false) {
    if (systemDb.currentDay === 0 || systemDb.currentDay > 8) return;
    
    const route = ROUTES[systemDb.currentDay - 1];
    const percent = Math.min(100, Math.floor((systemDb.communityJobsToday / route.goal) * 100));
    const imageIndex = Math.floor(percent / 5);
    const imgUrl = PROGRESS_BAR_IMAGES[imageIndex] || PROGRESS_BAR_IMAGES[0];

    const annCh = await client.channels.fetch(CH_DAILY_GOAL).catch(()=>null);
    if (!annCh) return;

    const embed = new EmbedBuilder()
        .setTitle(`📊 Komunitní Gól - Den ${systemDb.currentDay}`)
        .setDescription(`**Stav:** ${systemDb.communityJobsToday} / ${route.goal} zakázek (${percent}%)\n**Dnešní drop šance:** ${systemDb.currentDailyRewardText}`)
        .setImage(imgUrl)
        .setColor(EVENT_COLOR);

    if (systemDb.communityJobsToday === route.goal && !forceNew) {
        annCh.send(`🎉 **CÍL SPLNĚN!** Dokázali jste to! Zítra vylosujeme výherce **${systemDb.currentDailyRewardText}**!`);
    }

    const msgs = await annCh.messages.fetch({ limit: 10 });
    const botMsg = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes("Komunitní Gól"));

    if (botMsg && !forceNew) await botMsg.edit({ embeds: [embed] });
    else await annCh.send({ embeds: [embed] });
}

// ─────────────────────────────────────────────
// ČASOVAČ (Zálohy, Event Logika, Happy Hour)
// ─────────────────────────────────────────────
setInterval(async () => {
    try {
        const backupCh = await client.channels.fetch(CH_BACKUP).catch(()=>null);
        if (backupCh) {
            const files = [];
            if (fs.existsSync(USERS_PATH)) files.push(new AttachmentBuilder(USERS_PATH));
            if (fs.existsSync(SYSTEM_PATH)) files.push(new AttachmentBuilder(SYSTEM_PATH));
            if (files.length > 0) await backupCh.send({ content: `💾 Automatická záloha databáze (${new Date().toLocaleString('cs-CZ')})`, files });
        }
    } catch(e) {}
}, 15 * 60 * 1000); 

setInterval(() => {
    const now = Date.now();
    const czTime = new Date(new Date(now).toLocaleString("en-US", {timeZone: "Europe/Prague"}));
    
    if (now >= EVENT_END_DATE && !isDevMode && !systemDb.eventClosedAnnounced) {
        systemDb.eventClosedAnnounced = true;
        saveSystem();
        client.channels.fetch(CH_ROUTES).then(ch => {
            ch.send("🏁 **EVENT JE OFICIÁLNĚ U KONCE!** 🏁\n\nDěkujeme všem za účast! Přijímání zakázek bylo právě ukončeno. Nyní zpracováváme data a vyhlášení vítězů proběhne po 20:00!");
        }).catch(()=>null);
        return; 
    }

    if ((now >= EVENT_START_DATE || isDevMode) && systemDb.currentDay === 0) {
        systemDb.currentDay = 1; saveSystem();
        announceDailyRoute(1); startNewSecretCity();
    } 
    else if (czTime.getHours() === 19 && czTime.getMinutes() === 0 && systemDb.currentDay > 0 && systemDb.currentDay < 8) {
        systemDb.currentDay += 1;
        systemDb.communityJobsToday = 0; systemDb.hhCountToday = 0;
        saveSystem();
        announceDailyRoute(systemDb.currentDay); 
        for (const key in usersDb) usersDb[key].lastQuestSkip = 0; saveUsers();
    }

    if ((czTime.getHours() === 8 || czTime.getHours() === 19) && czTime.getMinutes() === 0 && systemDb.currentDay > 0 && now < EVENT_END_DATE) {
        startNewSecretCity();
    }

    if (czTime.getHours() % 3 === 0 && czTime.getHours() !== 19 && czTime.getMinutes() === 0 && systemDb.currentDay > 0 && systemDb.currentDay <= 8 && now < EVENT_END_DATE) {
        revealNextLetter();
    }

    if (czTime.getMinutes() === 0 && systemDb.currentDay > 0 && systemDb.currentDay <= 8 && now < EVENT_END_DATE) {
        if (now >= systemDb.hhActiveUntil && systemDb.hhCountToday < 2) {
            if (Math.random() < 0.10) { 
                systemDb.hhActiveUntil = now + (60 * 60 * 1000);
                systemDb.hhCountToday += 1; saveSystem();
                client.channels.fetch(CH_ROUTES).then(ch => {
                    ch.send("🌟 **HAPPY HOUR PRÁVĚ ZAČALA!** Následující 1 hodinu jsou ziskované XP u všech zakázek násobeny 1.5x!");
                }).catch(()=>null);
            }
        }
    }
}, 60 * 1000);

// ─────────────────────────────────────────────
// ROLE SYSTÉM (Milníky)
// ─────────────────────────────────────────────
async function checkMilestoneRoles(userId) {
    try {
        const u = usersDb[userId];
        if (!u) return;
        const guild = await client.guilds.fetch(GUILD_ID);
        const member = await guild.members.fetch(userId);
        const logCh = await client.channels.fetch(CH_LOG);

        if (u.xp >= 10000 && !member.roles.cache.has(ROLE_KING)) {
            await member.roles.add(ROLE_KING);
            logCh.send(`👑 <@${userId}> dosáhl 10 000 XP a získává roli **Výroční Král**!`);
        }
        if (u.completedQuests >= 10 && !member.roles.cache.has(ROLE_QUESTMASTER)) {
            await member.roles.add(ROLE_QUESTMASTER);
            logCh.send(`📜 <@${userId}> splnil 10 úkolů a stává se z něj **Quest Master**!`);
        }
        if (u.completedRoutesDays.length >= 4 && !member.roles.cache.has(ROLE_3RD_ANNIVERSARY)) {
            await member.roles.add(ROLE_3RD_ANNIVERSARY);
            logCh.send(`🎉 <@${userId}> absolvoval polovinu eventu a získává roli **3rd Anniversary**!`);
        }
    } catch(e) {}
}

// ─────────────────────────────────────────────
// SLASH INTERAKCE
// ─────────────────────────────────────────────
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // PROFIL
  if (interaction.commandName === "profil") {
      const targetUser = interaction.options.getUser("hrac") || interaction.user;
      const u = usersDb[targetUser.id];
      if (!u) return interaction.reply({ content: "❌ Tento hráč nemá v eventu žádný profil.", ephemeral: true });
      const q = QUESTS.find(quest => quest.id === u.currentQuestId);
      
      const embed = new EmbedBuilder()
          .setTitle(`📊 Profil hráče - ${u.tbName}`)
          .addFields(
              { name: "⭐ Získané XP", value: `${u.xp} XP`, inline: true },
              { name: "🚚 Najeté kilometry", value: `${u.km} km`, inline: true },
              { name: "📦 Eventové zakázky", value: `${u.eventJobs}`, inline: true },
              { name: "📜 Splněné questy", value: `${u.completedQuests}`, inline: true },
              { name: "🎯 Aktuální Quest", value: q ? `${q.desc}\nProgres: ${u.questProgress} / ${q.targetCount || q.targetKm || q.target}` : "Žádný", inline: false }
          )
          .setColor(EVENT_COLOR);
      return interaction.reply({ embeds: [embed] });
  }

  // LINK
  if (interaction.commandName === "link") {
      const nick = interaction.options.getString("nick");
      const u = getUser(interaction.user.id, nick);
      u.tbName = nick;
      saveUsers();
      return interaction.reply({ content: `✅ Tvůj Discord byl úspěšně propojen s TrucksBook nickem **${nick}**.`, ephemeral: true });
  }

  // QUEST SKIP
  if (interaction.commandName === "quest-skip") {
      const u = getUser(interaction.user.id, interaction.user.username);
      if (u.lastQuestSkip === 1) return interaction.reply({ content: "❌ Dnes už jsi quest jednou přeskočil. Další skip bude možný až po 19:00.", ephemeral: true });
      
      u.currentQuestId = getRandomQuestId();
      u.questProgress = 0;
      u.lastQuestSkip = 1;
      saveUsers();
      
      const q = QUESTS.find(quest => quest.id === u.currentQuestId);
      return interaction.reply({ content: `✅ Quest byl přeskočen! Tvůj nový úkol:\n**${q ? q.desc : "Neznámý"}**`, ephemeral: true });
  }

  // ODMENY
  if (interaction.commandName === "odmeny") {
      const embed = new EmbedBuilder()
          .setTitle("🎁 Přehled denních odměn & šancí")
          .setDescription("Každý den při splnění komunitního cíle losujeme jednu z těchto odměn pro náhodného řidiče, co dnes odjel trasu:\n\n" +
                          "🎨 **25%** - 3x Paint Job dle výběru\n" +
                          "🚚 **15%** - 3x Trailer // Tuning Pack dle výběru\n" +
                          "🗺️ **5%** - 1x Mapové DLC do 8,99 EUR\n" +
                          "🚚 **30%** - 1x Trailer // Tuning Pack dle výběru\n" +
                          "🎨 **25%** - 1x Paint Job dle výběru")
          .setColor(EVENT_COLOR);
      return interaction.reply({ embeds: [embed] });
  }

  // LEADERBOARD
  if (interaction.commandName === "leaderboard") {
      const kategorie = interaction.options.getString("kategorie");
      const sorted = Object.values(usersDb)
          .filter(u => !u.id.startsWith("UNLINKED_"))
          .sort((a, b) => {
              if (kategorie === "xp") return b.xp - a.xp;
              if (kategorie === "km") return b.km - a.km;
              if (kategorie === "jobs") return b.eventJobs - a.eventJobs;
              if (kategorie === "quests") return b.completedQuests - a.completedQuests;
              return 0;
          }).slice(0, 10);

      if (sorted.length === 0) return interaction.reply({ content: "Žebříček je zatím prázdný.", ephemeral: true });

      let desc = "";
      sorted.forEach((u, index) => {
          let val = 0;
          if (kategorie === "xp") val = `${u.xp} XP`;
          if (kategorie === "km") val = `${u.km} km`;
          if (kategorie === "jobs") val = `${u.eventJobs} zakázek`;
          if (kategorie === "quests") val = `${u.completedQuests} questů`;
          desc += `${index + 1}. **${u.tbName}** - ${val}\n`;
      });

      const embed = new EmbedBuilder()
          .setTitle(`🏆 TOP 10 Žebříček - podle ${kategorie.toUpperCase()}`)
          .setDescription(desc)
          .setColor(EVENT_COLOR);
      return interaction.reply({ embeds: [embed] });
  }

  // TESTOVACÍ ČTENÍ
  if (interaction.commandName === "test-cteni") {
      const text = interaction.options.getString("text");
      const jobData = extractJobData(text, "TEST ZAKÁZKA");
      
      if (!jobData) return interaction.reply({ content: "❌ Bot v textu nenašel platná data zakázky (chybí km, města nebo náklad). Zkus zkopírovat celý text zprávy.", ephemeral: true });

      const dayIndex = systemDb.currentDay > 0 ? systemDb.currentDay - 1 : 0;
      const route = ROUTES[dayIndex];
      const allowedCargos = route.cargos.map(normalizeStr);
      const isEventCargo = allowedCargos.some(c => jobData.cargo.includes(c));
      const isEventDest = jobData.dest === normalizeStr(route.end);

      const embed = new EmbedBuilder()
          .setTitle("🛠️ (DEV) Výsledek testu čtení")
          .setDescription("Zde je přesný výpis toho, jak bot pochopil tvůj text.")
          .addFields(
              { name: "🚚 Tahač", value: jobData.truck, inline: true },
              { name: "📦 Náklad", value: jobData.cargo, inline: true },
              { name: "📏 Vzdálenost", value: `${jobData.km} km`, inline: true },
              { name: "🏁 Trasa", value: `${jobData.origin} -> ${jobData.dest}`, inline: false },
              { name: "🎯 Eventová trasa (Dnešní cíl)?", value: (isEventDest && isEventCargo) ? "✅ **ANO** (Započítalo by se do eventu a přidalo XP)" : "❌ **NE** (Dostal bys pouze běžné XP za dojetí)", inline: false }
          )
          .setColor(0x00FF00);
          
      return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // DEV OVERRIDE
  if (interaction.commandName === "dev-override") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ Na tento příkaz nemáš práva.", ephemeral: true });
      }
      isDevMode = !isDevMode;
      return interaction.reply({ content: `🛠️ Testovací režim (DEV) byl přepnut na: **${isDevMode ? "ZAPNUTO" : "VYPNUTO"}**.`, ephemeral: true });
  }
});

// REGISTRACE PŘÍKAZŮ PŘI SPUŠTĚNÍ A OBNOVA ZÁLOHY
client.on("ready", async () => {
    console.log(`Bot úspěšně běží jako ${client.user.tag}`);

    // --- AUTOMATICKÉ NAČTENÍ ZÁLOHY Z DISCORD ROOMKY ---
    try {
        const backupCh = await client.channels.fetch(CH_BACKUP).catch(() => null);
        if (backupCh) {
            const messages = await backupCh.messages.fetch({ limit: 10 });
            const latestBackup = messages.find(m => m.attachments.size > 0 && m.author.id === client.user.id);
            
            if (latestBackup) {
                console.log("Hledám poslední zálohu na Discordu... Nalezena, stahuji...");
                for (const [id, attachment] of latestBackup.attachments) {
                    try {
                        const response = await fetch(attachment.url);
                        const data = await response.text();
                        
                        if (attachment.name === 'users_db.json') {
                            usersDb = JSON.parse(data);
                            saveUsers();
                            console.log("✅ Úspěšně stažena a načtena záloha: users_db.json");
                        } else if (attachment.name === 'system_db.json') {
                            systemDb = JSON.parse(data);
                            saveSystem();
                            console.log("✅ Úspěšně stažena a načtena záloha: system_db.json");
                        }
                    } catch (err) {
                        console.error(`❌ Chyba při stahování zálohy ${attachment.name}:`, err);
                    }
                }
            } else {
                console.log("Žádná záloha ke stažení nebyla nalezena (začínám s čistými daty nebo existujícím souborem).");
            }
        }
    } catch (err) {
        console.error("Chyba při přístupu k zálohovací místnosti. Nelze stáhnout zálohu.", err);
    }

    // Registrace příkazů
    try {
        const rest = new REST({ version: '10' }).setToken(TOKEN);
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log("Slash příkazy byly úspěšně zaregistrovány na Discordu.");
    } catch (error) {
        console.error(error);
    }
});

client.login(TOKEN);
