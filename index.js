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
const EVENT_START_DATE = new Date('2026-07-17T18:00:00+02:00').getTime(); 
const EVENT_END_DATE = new Date('2026-07-25T19:00:00+02:00').getTime(); 

// DEV REŽIM
let isDevMode = false;

// ─────────────────────────────────────────────
// DATA EVENTU A QUESTY
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
    { day: 1, start: "Praha", end: "Brno", cargos: ["Nápoje"], goal: 50, img: "https://i.imgur.com/5XTW3FA.png" },
    { day: 2, start: "Hamburk", end: "Brno", cargos: ["Potřeby ke stolování"], goal: 100, img: "https://i.imgur.com/7wR8bW6.png" },
    { day: 3, start: "Bratislava", end: "Brno", cargos: ["Květiny a stromy"], goal: 150, img: "https://i.imgur.com/lymELya.png" },
    { day: 4, start: "Štětín", end: "Brno", cargos: ["Hračky"], goal: 200, img: "https://i.imgur.com/t6fcP9x.png" },
    { day: 5, start: "Linec", end: "Brno", cargos: ["Čokolády"], goal: 250, img: "https://i.imgur.com/oWPrZey.png" },
    { day: 6, start: "Poznaň", end: "Brno", cargos: ["Limonády"], goal: 250, img: "https://i.imgur.com/J8tVmQU.png" },
    { day: 7, start: "Linec", end: "Brno", cargos: ["Elektroniku", "Elektronika"], goal: 250, img: "https://i.imgur.com/waiarlZ.png" },
    { day: 8, start: "Berlín", end: "Brno", cargos: ["Ohňostroje"], goal: 250, img: "https://i.imgur.com/BO0Rgu6.png" }
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
    hunterDneDay: 0, hunterDneUserId: null, currentDailyRewardText: ""
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
  // 🛠️ TESTOVACÍ PŘÍKAZY (NOVÉ)
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
    if (czTime.getHours() >= 18) {
        nextResetCz.setDate(nextResetCz.getDate() + 1);
        nextResetCz.setHours(8, 0, 0, 0); // Zítra v 8:00
    } else if (czTime.getHours() >= 8) {
        nextResetCz.setHours(18, 0, 0, 0); // Dnes v 18:00
    } else {
        nextResetCz.setHours(8, 0, 0, 0); // Dnes v 8:00
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
    // DEV MODE kontrola
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
        .setDescription(`Dnes svážíme zásoby na oslavu z města **${route.start}** do **${route.end}**!\n\n` +
                        `📦 **Povolené náklady:**\n${route.cargos.map(c => `- ${c}`).join('\n')}\n\n` +
                        `🎯 **Komunitní cíl:** Doručit **${route.goal}** zakázek!\n` +
                        `🎁 **Odměna za splnění cíle:** Systém vylosoval **${systemDb.currentDailyRewardText}**!\n` +
                        `🏹 Kdo doveze trasu dnes jako první, získá roli **HUNTER DNE**!`)
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
    // Přepnutí na další den trasy v 18:00
    else if (czTime.getHours() === 18 && czTime.getMinutes() === 0 && systemDb.currentDay > 0 && systemDb.currentDay < 8) {
        systemDb.currentDay += 1;
        systemDb.communityJobsToday = 0; systemDb.hhCountToday = 0;
        saveSystem();
        announceDailyRoute(systemDb.currentDay); 
        for (const key in usersDb) usersDb[key].lastQuestSkip = 0; saveUsers();
    }

    // Generování nového Tajného města (vždy 8:00 ráno a 18:00 večer)
    if ((czTime.getHours() === 8 || czTime.getHours() === 18) && czTime.getMinutes() === 0 && systemDb.currentDay > 0 && now < EVENT_END_DATE) {
        startNewSecretCity();
    }

    // Odkrývání nápovědy u Tajného města (Každé 3 hodiny, vyjma 18:00 kdy se generuje nové)
    if (czTime.getHours() % 3 === 0 && czTime.getHours() !== 18 && czTime.getMinutes() === 0 && systemDb.currentDay > 0 && systemDb.currentDay <= 8 && now < EVENT_END_DATE) {
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
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "❌ Nemáš oprávnění na tento příkaz.", ephemeral: true });
      
      isDevMode = !isDevMode;
      return interaction.reply({ content: `🛠️ **DEV REŽIM:** ${isDevMode ? "✅ ZAPNUTO (Datum eventu se ignoruje, bot přijímá zakázky z kanálů)" : "❌ VYPNUTO (Bot čeká na 17. 7. 2026)"}`, ephemeral: true });
  }

  if (interaction.commandName === "profil") {
      if (interaction.channelId !== CH_CMDS) return interaction.reply({ content: `❌ Příkazy fungují pouze v kanále <#${CH_CMDS}>.`, ephemeral: true });
      
      const targetUser = interaction.options.getUser("hrac") || interaction.user;
      const u = getUser(targetUser.id);
      
      let questText = "Žádný aktivní úkol. (Bug?)";
      const q = QUESTS.find(quest => quest.id === u.currentQuestId);
      if (q) {
          const target = q.targetCount || q.targetKm || q.target;
          questText = `**${q.desc}**\nPostup: ${u.questProgress} / ${target}\nOdměna: ${q.reward} XP`;
      }

      const embed = new EmbedBuilder()
          .setTitle(`👤 Řidič: ${targetUser.username}`)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
          .setColor(EVENT_COLOR)
          .addFields(
              { name: '⭐ Získané XP', value: `**${u.xp}**`, inline: true },
              { name: '📦 Eventové zakázky', value: `**${u.eventJobs}**`, inline: true },
              { name: '🚚 Celkem najeto', value: `**${u.km}** km`, inline: true },
              { name: '🗺️ Unikátních tras', value: `**${u.completedRoutesDays.length}/8**`, inline: true },
              { name: '📜 Splněno questů', value: `**${u.completedQuests}**`, inline: true },
              { name: '🎯 Aktuální vylosovaný Quest', value: questText, inline: false }
          );
      
      interaction.reply({ embeds: [embed] }); 
  }

  if (interaction.commandName === "quest-skip") {
      if (interaction.channelId !== CH_CMDS) return interaction.reply({ content: `❌ Mimo command kanál.`, ephemeral: true });
      
      const u = getUser(interaction.user.id);
      const todayDate = new Date().toLocaleDateString("cs-CZ", {timeZone: "Europe/Prague"});
      if (u.lastQuestSkip === todayDate) return interaction.reply({ content: "❌ Dnes už jsi quest přeskočil. Další losování zdarma máš zítra po půlnoci.", ephemeral: true });

      u.lastQuestSkip = todayDate;
      u.currentQuestId = getRandomQuestId(); 
      u.questProgress = 0;
      saveUsers();
      interaction.reply({ content: `✅ Quest přeskočen! Systém ti vylosoval nový úkol z gacha poolu. Zkontroluj si ho přes \`/profil\`.`, ephemeral: true }); 
  }

  if (interaction.commandName === "odmeny") {
      if (interaction.channelId !== CH_CMDS) return interaction.reply({ content: `❌ Mimo command kanál.`, ephemeral: true });
      
      const embed = new EmbedBuilder()
          .setTitle("🎁 Odměny a Pravidla Losování")
          .setDescription("Zde je přehled toho, co můžeš v rámci narozeninového eventu vyhrát a jaké jsou šance na drop!\n\n" +
                          "**🏆 HLAVNÍ CENY (Losování po skončení eventu)**\n" +
                          "Pro zařazení do slosování musíš ujet alespoň 4 z 8 tras. Čím více máš XP, tím máš větší šanci u losování.\n" +
                          "• 1x Mapové DLC (do 8,99 EUR)\n" +
                          "• 3x Trailer // Tuning Pack\n" +
                          "• 9x Window Flags DLC\n" +
                          "• 5x 10th Anniversary Paint Job Set\n\n" +
                          "**🎯 KOMUNITNÍ ODMĚNY (Za denní góly)**\n" +
                          "Každý den se na začátku vyhlášení trasy losuje, o co se pojede. Odměna padne pouze, pokud komunita splní společný počet zakázek (Goal).\n\n" +
                          "**Šance při losování 3 ks výhry:**\n" +
                          "• 25 % šance: 3x Paint Job\n" +
                          "• 15 % šance: 3x Trailer // Tuning Pack\n\n" +
                          "**Šance při losování 1 ks výhry:**\n" +
                          "• 30 % šance: 1x Trailer // Tuning Pack\n" +
                          "• 25 % šance: 1x Paint Job\n" +
                          "• 5 % šance: 1x Mapové DLC (do 8,99 EUR)")
          .setColor(EVENT_COLOR);
      
      // Zde odebráno problematické pole 'files' pro obrázek!
      interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "link") {
      const nick = interaction.options.getString("nick");
      const user = getUser(interaction.user.id, nick);
      user.tbName = nick;

      const ghostKeys = Object.keys(usersDb).filter(k => k.startsWith('UNLINKED_'));
      let addedKm = 0; 
      const nickNormalized = normalizeStr(nick);

      for (const gk of ghostKeys) {
          const ghostTbName = normalizeStr(usersDb[gk].tbName);
          if (ghostTbName.includes(nickNormalized) || nickNormalized.includes(ghostTbName)) {
              addedKm += usersDb[gk].km;
              user.km += usersDb[gk].km;
              user.eventJobs += usersDb[gk].eventJobs || 0;
              user.xp += usersDb[gk].xp || 0;
              user.processedJobs = [...new Set([...user.processedJobs, ...usersDb[gk].processedJobs])]; 
              delete usersDb[gk];
          }
      }
      saveUsers(); 
      let msg = `✅ Propojeno s nickem **${user.tbName}**.`;
      if (addedKm > 0) msg += `\n🎉 Bylo nalezeno tvé ježdění před propojením! Tvé statistiky byly sloučeny.`;
      interaction.reply({ content: msg, ephemeral: true }); 
      checkMilestoneRoles(user.id);
  }

  if (interaction.commandName === "leaderboard") {
      if (interaction.channelId !== CH_CMDS) return interaction.reply({ content: `❌ Mimo command kanál.`, ephemeral: true });

      const category = interaction.options.getString("kategorie");
      let usersArray = Object.values(usersDb).filter(u => u.tbName !== "Neznámý" && !u.id.startsWith('UNLINKED_'));
      
      let title = ""; let valFunc;
      if (category === "xp") { usersArray.sort((a,b) => b.xp - a.xp); title = "🏆 Top XP v Eventu"; valFunc = u => `**${u.xp}** XP`; }
      if (category === "km") { usersArray.sort((a,b) => b.km - a.km); title = "🏆 Nejvíce najeto"; valFunc = u => `**${u.km}** km`; }
      if (category === "jobs") { usersArray.sort((a,b) => b.eventJobs - a.eventJobs); title = "🏆 Nejvíc Event Zakázek"; valFunc = u => `**${u.eventJobs}** zakázek`; }
      if (category === "quests") { usersArray.sort((a,b) => b.completedQuests - a.completedQuests); title = "🏆 Nejvíce splněných questů"; valFunc = u => `**${u.completedQuests}** questů`; }

      const top10 = usersArray.slice(0, 10);
      let desc = top10.map((u, i) => `**${i+1}.** <@${u.id}> (\`${u.tbName}\`) - ${valFunc(u)}`).join('\n\n') || "Zatím žádná data.";

      const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor(EVENT_COLOR);
      interaction.reply({ embeds: [embed] }); 
  }
});

client.once("ready", () => {
  console.log(`Narozeninový TruckBot je online!`);
  new REST({ version: '10' }).setToken(TOKEN).put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
});

process.on('unhandledRejection', error => console.error('🚨 CHYBA:', error));
client.login(TOKEN);
