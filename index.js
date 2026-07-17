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
    { day: 1, start: "Praha", end: "Brno", cargos: ["Nápoje"], goal: 50, img: "https://i.imgur.com/5XTW3FA.png", desc: "Přípravy na narozeninovou oslavu byly oficiálně zahájeny. Organizátoři zajistili první zásobu občerstvení. Vaším úkolem je bezpečně dopravit nápoje z Prahy na místo oslav v Brně." },
    { day: 2, start: "Hamburk", end: "Brno", cargos: ["Potřeby ke stolování"], goal: 100, img: "https://i.imgur.com/7wR8bW6.png", desc: "Po zajištění občerstvení je potřeba připravit zázemí pro hosty. V Hamburku byly naloženy potřeby ke stolování, které budou využity při slavnostním občerstvení během oslav narozenin." },
    { day: 3, start: "Bratislava", end: "Brno", cargos: ["Květiny a stromy", "Řezané květiny"], goal: 150, img: "https://i.imgur.com/lymELya.png", desc: "Chceme, aby byla letošní oslava opravdu výjimečná. Ve spolupráci s floristy byla připravena rozsáhlá květinová výzdoba, kterou je nyní potřeba bezpečně dopravit z Bratislavy." },
    { day: 4, start: "Štětín", end: "Brno", cargos: ["Hračky"], goal: 200, img: "https://i.imgur.com/t6fcP9x.png", desc: "Na oslavu byli pozváni také rodinní příslušníci a nejmladší návštěvníci. Proto bylo rozhodnuto připravit speciální zábavnou zónu. Vaším úkolem je přepravit vybavení a dárky určené pro dětské návštěvníky." },
    { day: 5, start: "Linec", end: "Brno", cargos: ["Čokolády", "Čokoláda"], goal: 250, img: "https://i.imgur.com/oWPrZey.png", desc: "Každá pořádná narozeninová oslava potřebuje dostatek sladkostí. Počet potvrzených hostů překonal všechna očekávání, a proto byla objednána mimořádná zásilka čokoládových výrobků." },
    { day: 6, start: "Poznaň", end: "Brno", cargos: ["Limonády", "Limonáda"], goal: 250, img: "https://i.imgur.com/J8tVmQU.png", desc: "Po aktualizaci seznamu hostů bylo zjištěno, že původní zásoby nebudou dostačovat. Organizátoři proto zajistili dodatečnou zásilku limonád, která musí být doručena včas před zahájením oslav." },
    { day: 7, start: "Linec", end: "Brno", cargos: ["Elektroniku", "Elektronika"], goal: 250, img: "https://i.imgur.com/waiarlZ.png", desc: "Blíží se vyvrcholení příprav. Do Brna je potřeba dopravit profesionální ozvučovací a světelnou techniku, která zajistí hudební doprovod a atmosféru celé narozeninové oslavy." },
    { day: 8, start: "Berlín", end: "Brno", cargos: ["Ohňostroje", "Zábavní pyrotechnika"], goal: 250, img: "https://i.imgur.com/BO0Rgu6.png", desc: "Nastal čas na poslední a nejdůležitější úkol celé expedice. V Berlíně je připravena hlavní zásilka zábavní pyrotechniky určené pro slavnostní zakončení oslav. Vaším úkolem je bezpečně dopravit tento cenný náklad do Brna, kde po jeho doručení mohou být zahájeny oslavy." }
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
let usersDb = {};
let systemDb = {
    currentDay: 0, communityJobsToday: 0,
    hhActiveUntil: 0, hhCountToday: 0,
    secretCity: "", secretCityRevealed: [], secretCityFoundBy: null, nextSecretCityResetUnix: 0,
    hunterDneDay: 0, hunterDneUserId: null, secretExplorerUserId: null, currentDailyRewardText: "",
    eventClosedAnnounced: false, globalProcessedJobs: [], globalJobHashes: []
};

function loadDatabases() {
    try {
        if (fs.existsSync(USERS_PATH)) {
            usersDb = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
            console.log(`✅ Načteno ${Object.keys(usersDb).length} uživatelů`);
        }
        if (fs.existsSync(SYSTEM_PATH)) {
            const loadedSystem = JSON.parse(fs.readFileSync(SYSTEM_PATH, 'utf8'));
            systemDb = { ...systemDb, ...loadedSystem };
            console.log(`✅ Načten systémový stav (den ${systemDb.currentDay})`);
        }
    } catch (error) {
        console.error('❌ Chyba při načítání databází:', error);
    }
}

const saveUsers = () => {
    try {
        fs.writeFileSync(USERS_PATH, JSON.stringify(usersDb, null, 2));
    } catch (error) {
        console.error('❌ Chyba při ukládání users_db.json:', error);
    }
};

const saveSystem = () => {
    try {
        fs.writeFileSync(SYSTEM_PATH, JSON.stringify(systemDb, null, 2));
    } catch (error) {
        console.error('❌ Chyba při ukládání system_db.json:', error);
    }
};

// ─────────────────────────────────────────────
// NORMALIZACE TEXTU
// ─────────────────────────────────────────────
const normalizeStr = (str) => {
    if (!str) return "";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s\-]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
};

// ─────────────────────────────────────────────
// ZÍSKÁNÍ UŽIVATELE
// ─────────────────────────────────────────────
function getUser(userId, tbName = null) {
    if (!usersDb[userId]) {
        usersDb[userId] = {
            id: userId,
            tbName: tbName || "Neznámý",
            xp: 0,
            km: 0,
            eventJobs: 0,
            processedJobs: [],
            recentJobHashes: [],
            completedRoutesDays: [],
            completedQuests: 0,
            currentQuestId: getRandomQuestId(),
            questProgress: 0,
            lastQuestSkip: 0
        };
    }

    const u = usersDb[userId];
    if (!u.recentJobHashes) u.recentJobHashes = [];
    if (!u.completedRoutesDays) u.completedRoutesDays = [];
    if (u.completedQuests === undefined || u.completedQuests === null) u.completedQuests = 0;
    if (u.currentQuestId === undefined || u.currentQuestId === null || u.currentQuestId >= QUESTS.length) {
        u.currentQuestId = getRandomQuestId();
    }
    if (u.questProgress === undefined || u.questProgress === null) u.questProgress = 0;
    if (u.lastQuestSkip === undefined || u.lastQuestSkip === null) u.lastQuestSkip = 0;
    if (!u.processedJobs) u.processedJobs = [];

    return u;
}

// ─────────────────────────────────────────────
// EXTRAKCE DAT ZAKÁZKY
// ─────────────────────────────────────────────
function extractJobData(text, title) {
    const combinedText = (title + "\n" + text).replace(/\*/g, '');

    let km = 0;
    const kmPatterns = [
        /(?:Uznaná vzdálenost|Distance):\s*([\d\s.,]+)\s*(km|mi)/im,
        /([\d\s.,]{1,6})\s*(km|mi)[\s\n]/i,
        /([\d\s.,]{1,6})\s*(km|mi)$/im
    ];

    for (const pattern of kmPatterns) {
        const match = combinedText.match(pattern);
        if (match) {
            km = parseInt(match[1].replace(/[^\d]/g, ''), 10);
            if (match[2].toLowerCase().includes('mi')) km = Math.round(km * 1.60934);
            break;
        }
    }

    let dest = "neznámé";
    const destPatterns = [
        /(?:Kam|To|Destination):\s*(.+?)(?:\n|$)/i,
        /(?:do)\s+([A-ZÁ-Ža-zá-ž\s\-]+?)(?:\n|$)/i,
        /🏁\s*(.+?)(?:\n|$)/,
        /🚩\s*(.+?)(?:\n|$)/
    ];

    for (const pattern of destPatterns) {
        const match = combinedText.match(pattern);
        if (match && match[1].trim().length > 1) {
            dest = match[1].replace(/[🚚🏁🚩]/g, '').trim();
            break;
        }
    }

    let origin = "neznámé";
    const originPatterns = [
        /(?:Odkud|From):\s*(.+?)(?:\n|$)/i,
        /(?:z)\s+([A-ZÁ-Ža-zá-ž\s\-]+?)(?:\n|$)/i,
        /🚚\s*(.+?)(?:\n|$)/,
        /🚩\s*(.+?)(?:\n|$)/
    ];

    for (const pattern of originPatterns) {
        const match = combinedText.match(pattern);
        if (match && match[1].trim().length > 1 && match[1].trim() !== dest) {
            origin = match[1].replace(/[🚚🏁🚩]/g, '').trim();
            break;
        }
    }

    let cargo = "neznámé";
    const cargoPatterns = [
        /(?:Náklad|Cargo):\s*(.+?)(?:\n|$)/i,
        /📦\s*(.+?)(?:\n|$)/,
        /Náklad:\s*\n\s*(.+?)(?:\n|$)/i
    ];

    for (const pattern of cargoPatterns) {
        const match = combinedText.match(pattern);
        if (match) {
            cargo = match[1].split(/[\(\[\{]/)[0].trim();
            if (cargo.length > 1) break;
        }
    }

    let truck = "neznámé";
    const truckPatterns = [
        /(?:Tahač|Truck|Vehicle):\s*(.+?)(?:\n|$)/i,
        /🚛\s*(.+?)(?:\n|$)/,
        /Tahač:\s*\n\s*(.+?)(?:\n|$)/i
    ];

    for (const pattern of truckPatterns) {
        const match = combinedText.match(pattern);
        if (match && match[1].trim().length > 1) {
            truck = match[1].trim();
            break;
        }
    }

    if (km < 50) return null;

    return {
        km,
        origin: normalizeStr(origin),
        dest: normalizeStr(dest),
        cargo: normalizeStr(cargo),
        truck: normalizeStr(truck),
        rawOrigin: origin,
        rawDest: dest,
        rawCargo: cargo,
        rawTruck: truck
    };
}

// ─────────────────────────────────────────────
// ZPRACOVÁNÍ ZAKÁZKY
// ─────────────────────────────────────────────
async function processJobMessage(m) {
    const messageTime = m.createdTimestamp;

    if (!isDevMode && messageTime < EVENT_START_DATE) return { status: 'ignored_old' };
    if (!isDevMode && Date.now() > EVENT_END_DATE) return { status: 'event_ended' };
    if (!m.embeds || !m.embeds.length) return { status: 'ignored' };

    const e = m.embeds[0];
    const driver = e.author?.name || "Neznámý";
    const titleText = e.title || "";
    const allText = [e.description, ...(e.fields?.map(f => f.name + '\n' + f.value) || [])].join('\n');

    const jobIdMatch = titleText.match(/#(\d+)/) || allText.match(/#(\d+)/);
    const jobId = jobIdMatch ? `job_${jobIdMatch[1]}` : `msg_${m.id}`;

    const jobData = extractJobData(allText, titleText);
    if (!jobData) return { status: 'ignored_no_data' };

    const jobHash = `${jobData.cargo}_${jobData.dest}_${jobData.origin}_${jobData.km}`;
    const driverNorm = normalizeStr(driver);

    if (!systemDb.globalProcessedJobs) systemDb.globalProcessedJobs = [];
    if (!systemDb.globalJobHashes) systemDb.globalJobHashes = [];

    if (systemDb.globalProcessedJobs.includes(jobId)) {
        return { status: 'duplicate_global_job_id' };
    }
    if (systemDb.globalJobHashes.includes(jobHash)) {
        return { status: 'duplicate_global_job_hash' };
    }

    let userKey = null;

    for (const [key, user] of Object.entries(usersDb)) {
        if (key.startsWith('UNLINKED_')) continue;
        const dbNick = normalizeStr(user.tbName);
        if (dbNick === driverNorm) {
            userKey = key;
            break;
        }
        if (dbNick.includes(driverNorm) || driverNorm.includes(dbNick)) {
            if (!userKey) userKey = key;
        }
    }

    if (!userKey && m.guild) {
        try {
            const members = await m.guild.members.fetch();
            const foundMember = members.find(member => {
                const displayNorm = normalizeStr(member.displayName);
                const userNorm = normalizeStr(member.user.username);
                return displayNorm.includes(driverNorm) || userNorm.includes(driverNorm) ||
                       driverNorm.includes(displayNorm) || driverNorm.includes(userNorm);
            });
            if (foundMember) userKey = foundMember.id;
        } catch (e) {}
    }

    if (!userKey) userKey = 'UNLINKED_' + driverNorm.replace(/\s+/g, '_');
    const u = getUser(userKey, driver);

    if (u.processedJobs && u.processedJobs.includes(jobId)) {
        return { status: 'duplicate_local_job_id' };
    }
    if (u.recentJobHashes && u.recentJobHashes.includes(jobHash)) {
        return { status: 'duplicate_local_job_hash' };
    }

    let isEventRoute = false;
    let earnedXP = 50;
    let isHappyHourJob = false;
    let secretCityFound = false;
    let isNewHunterDne = false;
    let questCompleted = false;
    let earnedQuestXP = 0;

    // TAJNÉ MĚSTO
    if (systemDb.secretCity && !systemDb.secretCityFoundBy &&
        jobData.dest === normalizeStr(systemDb.secretCity) && jobData.km >= 500) {
        secretCityFound = true;
        earnedXP += 1000;
        if (!userKey.startsWith('UNLINKED_')) {
            systemDb.secretCityFoundBy = userKey;
            saveSystem();
            announceSecretCityWordle();
        }
    }

    // EVENTOVÁ TRASA
    if (systemDb.currentDay > 0 && systemDb.currentDay <= ROUTES.length) {
        const dailyRoute = ROUTES[systemDb.currentDay - 1];
        const allowedCargosNorm = dailyRoute.cargos.map(normalizeStr);
        const endCityNorm = normalizeStr(dailyRoute.end);

        const isCorrectDestination = jobData.dest.includes(endCityNorm) || endCityNorm.includes(jobData.dest);
        const isCorrectCargo = allowedCargosNorm.some(c => jobData.cargo.includes(c) || c.includes(jobData.cargo));

        if (isCorrectDestination && isCorrectCargo) {
            isEventRoute = true;
            earnedXP = 100;
            u.eventJobs += 1;
            systemDb.communityJobsToday += 1;

            if (!u.completedRoutesDays.includes(systemDb.currentDay)) {
                u.completedRoutesDays.push(systemDb.currentDay);
            }

            if (systemDb.hunterDneDay !== systemDb.currentDay && !userKey.startsWith('UNLINKED_')) {
                isNewHunterDne = true;
                systemDb.hunterDneDay = systemDb.currentDay;
                systemDb.hunterDneUserId = userKey;
            }

            saveSystem();
            updateCommunityProgressBar();
        }
    }

    // HAPPY HOUR
    if (isEventRoute && Date.now() < systemDb.hhActiveUntil) {
        isHappyHourJob = true;
        earnedXP = Math.floor(earnedXP * 1.5);
    }

    // PŘIČTENÍ
    u.xp += earnedXP;
    u.km += jobData.km;

    u.processedJobs.push(jobId);
    u.recentJobHashes.push(jobHash);
    systemDb.globalProcessedJobs.push(jobId);
    systemDb.globalJobHashes.push(jobHash);

    if (u.processedJobs.length > 500) u.processedJobs = u.processedJobs.slice(-400);
    if (u.recentJobHashes.length > 100) u.recentJobHashes = u.recentJobHashes.slice(-80);
    if (systemDb.globalProcessedJobs.length > 10000) systemDb.globalProcessedJobs = systemDb.globalProcessedJobs.slice(-8000);
    if (systemDb.globalJobHashes.length > 10000) systemDb.globalJobHashes = systemDb.globalJobHashes.slice(-8000);

    // QUESTY
    const q = QUESTS.find(quest => quest.id === u.currentQuestId);
    if (q) {
        let progressIncrement = 0;
        switch (q.type) {
            case "km": progressIncrement = jobData.km; break;
            case "jobs": if (isEventRoute) progressIncrement = 1; break;
            case "city": if (jobData.dest.includes(normalizeStr(q.target))) progressIncrement = 1; break;
            case "truck": if (jobData.truck.includes(normalizeStr(q.target))) progressIncrement = 1; break;
            case "long_jobs": if (jobData.km >= q.targetKm) progressIncrement = 1; break;
        }

        if (progressIncrement > 0) {
            u.questProgress = (u.questProgress || 0) + progressIncrement;
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
    }

    saveUsers();
    if (!userKey.startsWith('UNLINKED_')) await checkMilestoneRoles(userKey);

    return {
        status: 'added', jobData, isEventRoute, questCompleted,
        earnedXP, earnedQuestXP, driver, userKey,
        secretCityFound, isHappyHourJob, isNewHunterDne
    };
}

// ─────────────────────────────────────────────
// MESSAGE CREATE HANDLER
// ─────────────────────────────────────────────
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

        const logCh = await client.channels.fetch(CH_LOG).catch(() => null);
        if (logCh) {
            let msg = `✅ **${res.driver}** dovezl/a zakázku (${res.jobData.km} km).`;
            if (res.isEventRoute) msg += ` 🎯 Eventová trasa (+100 XP).`;
            else msg += ` 🚚 Normální trasa (+50 XP).`;
            if (res.isNewHunterDne) msg += ` 🏹 Získává titul **HUNTER DNE**!`;
            if (res.isHappyHourJob) msg += ` 🌟 **HAPPY HOUR 1.5x XP!**`;
            msg += ` Získal/a **+${res.earnedXP} XP**.`;
            if (res.questCompleted) msg += ` 🏆 Splnil/a QUEST a získal/a **+${res.earnedQuestXP} XP**!`;
            if (res.secretCityFound) msg += ` 🕵️‍♂️ **ODHALIL/A TAJNÉ MĚSTO (+1000 XP)**!`;

            logCh.send(msg).catch(() => {});
        }
    }

    if (res.status.startsWith('duplicate')) {
        console.log(`🔄 Duplicitní zakázka ignorována: ${res.status}`);
    }
});

// ─────────────────────────────────────────────
// MECHANIKA TRAS A PROGRESS BARU
// ─────────────────────────────────────────────
async function announceDailyRoute(day) {
    if (day > 8) return;
    const route = ROUTES[day - 1];
    const uniqueCargos = [...new Set(route.cargos)];

    systemDb.currentDailyRewardText = getRandomDailyReward();
    saveSystem();

    const embed = new EmbedBuilder()
        .setTitle(`🚚 EVENT DEN ${day}/8: Nová trasa vyhlášena!`)
        .setDescription(`${route.desc}\n\n📍 **Odkud:** ${route.start}\n🏁 **Kam:** ${route.end}\n📦 **Povolené náklady:** ${uniqueCargos.join(', ')}\n\n---\n🎯 **Komunitní cíl:** Doručit **${route.goal}** zakázek\n🎁 **Odměna:** ${systemDb.currentDailyRewardText}\n🏹 **Bonus:** Kdo doručí jako první, získá roli **HUNTER DNE**!`)
        .setImage(route.img)
        .setColor(EVENT_COLOR);

    const annCh = await client.channels.fetch(CH_ROUTES).catch(() => null);
    if (annCh) {
        await annCh.send({ content: "@everyone 🚨 **Nová eventová trasa vyhlášena!** 🚨", embeds: [embed] });
        updateCommunityProgressBar(true);
    }
}

async function updateCommunityProgressBar(forceNew = false) {
    if (systemDb.currentDay === 0 || systemDb.currentDay > 8) return;
    const route = ROUTES[systemDb.currentDay - 1];
    const percent = Math.min(100, Math.floor((systemDb.communityJobsToday / route.goal) * 100));
    const imageIndex = Math.floor(percent / 5);
    const imgUrl = PROGRESS_BAR_IMAGES[imageIndex] || PROGRESS_BAR_IMAGES[20];

    const annCh = await client.channels.fetch(CH_DAILY_GOAL).catch(() => null);
    if (!annCh) return;

    const embed = new EmbedBuilder()
        .setTitle(`📊 Komunitní Gól - Den ${systemDb.currentDay}`)
        .setDescription(`**Stav:** ${systemDb.communityJobsToday} / ${route.goal} zakázek (${percent}%)\n**Dnešní drop šance:** ${systemDb.currentDailyRewardText || "Zatím neurčeno"}\n\n*(Aktualizuje se ihned po každé uznané zakázce)*`)
        .setImage(imgUrl)
        .setColor(EVENT_COLOR);

    if (systemDb.communityJobsToday >= route.goal && !forceNew) {
        annCh.send(`🎉 **CÍL SPLNĚN!** Dokázali jste to! Zítra vylosujeme, kdo získá **${systemDb.currentDailyRewardText}**!`);
    }

    if (forceNew) {
        await annCh.send({ embeds: [embed] });
        return;
    }

    try {
        const msgs = await annCh.messages.fetch({ limit: 10 });
        const botMsg = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes(`Komunitní Gól - Den ${systemDb.currentDay}`));
        if (botMsg) await botMsg.edit({ embeds: [embed] });
        else await annCh.send({ embeds: [embed] });
    } catch (e) {}
}

// ─────────────────────────────────────────────
// TAJNÉ MĚSTO
// ─────────────────────────────────────────────
function getNextSecretCityResetUnix() {
    const now = new Date();
    const czTimeStr = now.toLocaleString("en-US", {timeZone: "Europe/Prague"});
    const czTime = new Date(czTimeStr);
    const nextResetCz = new Date(czTime.getTime());

    if (czTime.getHours() >= 19) {
        nextResetCz.setDate(nextResetCz.getDate() + 1);
        nextResetCz.setHours(7, 0, 0, 0);
    } else if (czTime.getHours() >= 7) {
        nextResetCz.setHours(19, 0, 0, 0);
    } else {
        nextResetCz.setHours(7, 0, 0, 0);
    }

    const msUntilReset = nextResetCz.getTime() - czTime.getTime();
    return Math.floor((now.getTime() + msUntilReset) / 1000);
}

async function transferRole(guildId, roleId, oldUserId, newUserId) {
    try {
        const guild = await client.guilds.fetch(guildId);
        if (oldUserId && oldUserId !== newUserId) {
            const oldMember = await guild.members.fetch(oldUserId).catch(() => null);
            if (oldMember) await oldMember.roles.remove(roleId).catch(() => null);
        }
        if (newUserId) {
            const newMember = await guild.members.fetch(newUserId).catch(() => null);
            if (newMember) await newMember.roles.add(roleId).catch(() => null);
        }
    } catch (e) {}
}

function startNewSecretCity() {
    const randomCity = SECRET_CITIES_LIST[Math.floor(Math.random() * SECRET_CITIES_LIST.length)];
    systemDb.secretCity = randomCity;
    systemDb.secretCityRevealed = new Array(randomCity.length).fill(false);

    const validIndices = [];
    for (let i = 0; i < randomCity.length; i++) {
        if (randomCity[i] !== ' ') validIndices.push(i);
    }
    if (validIndices.length > 0) {
        const startIdx = validIndices[Math.floor(Math.random() * validIndices.length)];
        systemDb.secretCityRevealed[startIdx] = true;
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
    const ch = await client.channels.fetch(CH_SECRET_CITY).catch(() => null);
    if (!ch) return;

    const resetUnix = systemDb.nextSecretCityResetUnix || getNextSecretCityResetUnix();

    if (systemDb.secretCityFoundBy) {
        const embed = new EmbedBuilder()
            .setTitle("🕵️‍♂️ Tajné Město bylo odhaleno!")
            .setDescription(`Gratulujeme! <@${systemDb.secretCityFoundBy}> rozluštil/a záhadu a dovezl/a náklad do města **${systemDb.secretCity}**! Získává bonus 1000 XP a titul **Secret Explorer**.\n\n⏳ Další město se objeví **<t:${resetUnix}:R>** (<t:${resetUnix}:t>).`)
            .setColor(0x00FF00);

        try {
            const msgs = await ch.messages.fetch({ limit: 10 });
            const oldBotMsg = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes("Najdi Tajné Město"));
            if (oldBotMsg) await oldBotMsg.edit({ embeds: [embed] });
            else await ch.send({ embeds: [embed] });
        } catch (e) {}
        return;
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

    try {
        const msgs = await ch.messages.fetch({ limit: 10 });
        const oldBotMsg = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes("Najdi Tajné Město"));
        if (oldBotMsg) await oldBotMsg.edit({ embeds: [embed] });
        else await ch.send({ embeds: [embed] });
    } catch (e) {}
}

// ─────────────────────────────────────────────
// ROLE SYSTÉM
// ─────────────────────────────────────────────
async function checkMilestoneRoles(userId) {
    try {
        const u = usersDb[userId];
        if (!u) return;
        const guild = await client.guilds.fetch(GUILD_ID);
        const member = await guild.members.fetch({ user: userId, force: true });
        const logCh = await client.channels.fetch(CH_LOG).catch(() => null);

        if (u.xp >= 10000 && !member.roles.cache.has(ROLE_KING)) {
            await member.roles.add(ROLE_KING);
            if (logCh) logCh.send(`👑 <@${userId}> dosáhl/a 10 000 XP a získává roli **Výroční Král**!`);
        }
        if (u.completedQuests >= 10 && !member.roles.cache.has(ROLE_QUESTMASTER)) {
            await member.roles.add(ROLE_QUESTMASTER);
            if (logCh) logCh.send(`📜 <@${userId}> splnil/a 10 úkolů a získává roli **Quest Master**!`);
        }
        if (u.completedRoutesDays.length >= 4 && !member.roles.cache.has(ROLE_3RD_ANNIVERSARY)) {
            await member.roles.add(ROLE_3RD_ANNIVERSARY);
            if (logCh) logCh.send(`🎉 <@${userId}> absolvoval/a polovinu eventu a získává roli **3rd Anniversary**!`);
        }
    } catch (e) {}
}

// ─────────────────────────────────────────────
// ZÁLOHOVACÍ SYSTÉM
// ─────────────────────────────────────────────
async function fetchBackupFromDiscord() {
    try {
        const backupCh = await client.channels.fetch(CH_BACKUP).catch(() => null);
        if (!backupCh) {
            console.log('❌ Backup kanál nenalezen');
            return null;
        }

        console.log('📥 Stahuji zálohy z Discordu...');
        const messages = await backupCh.messages.fetch({ limit: 50 });

        let latestUsersData = null;
        let latestSystemData = null;
        let latestTimestamp = 0;

        for (const [_, msg] of messages) {
            if (msg.attachments.size > 0) {
                for (const [_, attachment] of msg.attachments) {
                    try {
                        const response = await fetch(attachment.url);
                        const data = await response.json();

                        if (attachment.name.includes('users_db') && msg.createdTimestamp > latestTimestamp) {
                            latestUsersData = data;
                            latestTimestamp = msg.createdTimestamp;
                        }
                        if (attachment.name.includes('system_db') && msg.createdTimestamp > latestTimestamp) {
                            latestSystemData = data;
                            latestTimestamp = msg.createdTimestamp;
                        }
                    } catch (e) {}
                }
            }
        }

        return { users: latestUsersData, system: latestSystemData, timestamp: latestTimestamp };
    } catch (error) {
        console.error('❌ Chyba při stahování záloh:', error);
        return null;
    }
}

// ─────────────────────────────────────────────
// ČASOVAČE
// ─────────────────────────────────────────────
setInterval(async () => {
    try {
        const backupCh = await client.channels.fetch(CH_BACKUP).catch(() => null);
        if (backupCh) {
            const files = [];
            if (fs.existsSync(USERS_PATH)) files.push(new AttachmentBuilder(USERS_PATH));
            if (fs.existsSync(SYSTEM_PATH)) files.push(new AttachmentBuilder(SYSTEM_PATH));
            if (files.length > 0) {
                await backupCh.send({
                    content: `💾 Automatická záloha databáze (${new Date().toLocaleString('cs-CZ')})`,
                    files
                });
            }
        }
    } catch (e) {}
}, 15 * 60 * 1000);

setInterval(() => {
    const now = Date.now();
    const czTime = new Date(new Date(now).toLocaleString("en-US", {timeZone: "Europe/Prague"}));

    if (now >= EVENT_END_DATE && !isDevMode && !systemDb.eventClosedAnnounced) {
        systemDb.eventClosedAnnounced = true;
        saveSystem();
        client.channels.fetch(CH_ROUTES).then(ch => {
            ch.send("🏁 **EVENT JE OFICIÁLNĚ U KONCE!** 🏁\n\nDěkujeme všem za účast! Přijímání zakázek bylo právě ukončeno. Nyní zpracováváme data a vyhlášení výsledků proběhne po 20:00!");
        }).catch(() => {});
        return;
    }

    if ((now >= EVENT_START_DATE || isDevMode) && systemDb.currentDay === 0) {
        systemDb.currentDay = 1;
        saveSystem();
        announceDailyRoute(1);
        startNewSecretCity();
    } else if (czTime.getHours() === 19 && czTime.getMinutes() === 0 && systemDb.currentDay > 0 && systemDb.currentDay < 8) {
        systemDb.currentDay += 1;
        systemDb.communityJobsToday = 0;
        systemDb.hhCountToday = 0;
        saveSystem();
        announceDailyRoute(systemDb.currentDay);
        for (const key in usersDb) usersDb[key].lastQuestSkip = 0;
        saveUsers();
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
                systemDb.hhCountToday += 1;
                saveSystem();
                client.channels.fetch(CH_ROUTES).then(ch => {
                    ch.send("🌟 **HAPPY HOUR PRÁVĚ ZAČALA!** Následující 1 hodinu jsou ziskované XP u všech EVENTOVÝCH zakázek násobeny 1.5x!");
                }).catch(() => {});
            }
        }
    }
}, 60 * 1000);

// ─────────────────────────────────────────────
// SLASH COMMANDS
// ─────────────────────────────────────────────
const commands = [
    new SlashCommandBuilder().setName("profil").setDescription("Zobrazí tvůj nebo cizí profil v eventu.")
        .addUserOption(o => o.setName("hrac").setDescription("Vyber hráče (volitelné)").setRequired(false)),
    new SlashCommandBuilder().setName("quest").setDescription("Zobrazí tvůj aktuální quest a jeho postup."),
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
    new SlashCommandBuilder().setName("dev-override").setDescription("🛠️ (DEV) ADMIN: Zapne testovací režim."),
    new SlashCommandBuilder().setName("dev-reprocess").setDescription("🛠️ (DEV) Zpětně projde zakázky a uzná ty, co chyběly.")
        .addStringOption(o => o.setName("kanal").setDescription("ID kanálu").setRequired(true)),
    new SlashCommandBuilder().setName("dev-fetch-backup").setDescription("🛠️ (DEV) Stáhne a aplikuje poslední zálohu z backup kanálu."),
    new SlashCommandBuilder().setName("admin-restore").setDescription("🛠️ ADMIN: Obnoví databázi z nahraných JSON souborů.")
        .addAttachmentOption(o => o.setName("users_db").setDescription("Soubor users_db.json").setRequired(false))
        .addAttachmentOption(o => o.setName("system_db").setDescription("Soubor system_db.json").setRequired(false)),
    new SlashCommandBuilder().setName("admin-unlink").setDescription("🛠️ ADMIN: Smaže uživatele z databáze.")
        .addUserOption(o => o.setName("hrac").setDescription("Hráč k odpojení").setRequired(true)),
    new SlashCommandBuilder().setName("admin-link").setDescription("🛠️ ADMIN: Ručně propojí hráče s TB nickem.")
        .addUserOption(o => o.setName("hrac").setDescription("Hráč").setRequired(true))
        .addStringOption(o => o.setName("nick").setDescription("TrucksBook / Trucky Nick").setRequired(true)),
    new SlashCommandBuilder().setName("admin-addxp").setDescription("🛠️ ADMIN: Přidá nebo odebere hráči XP.")
        .addUserOption(o => o.setName("hrac").setDescription("Hráč").setRequired(true))
        .addIntegerOption(o => o.setName("xp").setDescription("Počet XP (kladné pro přidání, záporné pro odečtení)").setRequired(true))
].map(c => c.toJSON());

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ─────────────────────────────────────────────
// SLASH INTERAKCE
// ─────────────────────────────────────────────
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // PROFIL
    if (interaction.commandName === "profil") {
        const targetUser = interaction.options.getUser("hrac") || interaction.user;
        const u = usersDb[targetUser.id];
        if (!u) return interaction.reply({ content: "❌ Tento profil v eventu zatím neexistuje.", ephemeral: true });
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

    // QUEST
    if (interaction.commandName === "quest") {
        const u = getUser(interaction.user.id, interaction.user.username);
        const q = QUESTS.find(quest => quest.id === u.currentQuestId);
        if (!q) return interaction.reply({ content: "❌ Nepodařilo se načíst tvůj quest.", ephemeral: true });

        let tierColor = 0x808080;
        let tierName = "⚪ Běžný";
        if (q.tier === "rare") { tierColor = 0x0070FF; tierName = "🔵 Vzácný"; }
        if (q.tier === "epic") { tierColor = 0xA335EE; tierName = "🟣 Epický"; }

        const targetRequired = q.targetCount || q.targetKm || q.target;
        const progressPercent = Math.min(100, Math.floor(((u.questProgress || 0) / targetRequired) * 100));

        const embed = new EmbedBuilder()
            .setTitle(`🎯 Tvůj aktuální quest`)
            .setDescription(`**${q.desc}**\n\n📊 **Postup:** ${u.questProgress || 0} / ${targetRequired} (${progressPercent}%)\n🎁 **Odměna:** ${q.reward} XP\n⭐ **Rarita:** ${tierName}`)
            .setColor(tierColor)
            .setFooter({ text: "Quest můžeš 1x denně přeskočit pomocí /quest-skip" });

        return interaction.reply({ embeds: [embed] });
    }

    // LINK
    if (interaction.commandName === "link") {
        const nick = interaction.options.getString("nick");
        const u = getUser(interaction.user.id, nick);
        u.tbName = nick;
        saveUsers();
        return interaction.reply({ content: `✅ Tvůj Discord byl úspěšně propojen s nickem **${nick}**.`, ephemeral: true });
    }

    // QUEST SKIP
    if (interaction.commandName === "quest-skip") {
        const u = getUser(interaction.user.id, interaction.user.username);
        if (u.lastQuestSkip === 1) return interaction.reply({ content: "❌ Dnes už jsi quest jednou přeskočil/a. Další skip bude možný až po 19:00.", ephemeral: true });

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
            .setDescription("Každý den při splnění komunitního cíle losujeme jednu z těchto odměn:\n\n🎨 **25%** - 3x Paint Job dle výběru\n🚚 **15%** - 3x Trailer / Tuning Pack\n🗺️ **5%** - 1x Mapové DLC do 8,99 EUR\n🚚 **30%** - 1x Trailer / Tuning Pack\n🎨 **25%** - 1x Paint Job dle výběru")
            .setColor(EVENT_COLOR);
        return interaction.reply({ embeds: [embed] });
    }

    // LEADERBOARD
    if (interaction.commandName === "leaderboard") {
        const kategorie = interaction.options.getString("kategorie");
        const sorted = Object.values(usersDb)
            .filter(u => !u.id.startsWith("UNLINKED_"))
            .sort((a, b) => {
                if (kategorie === "xp") return (b.xp || 0) - (a.xp || 0);
                if (kategorie === "km") return (b.km || 0) - (a.km || 0);
                if (kategorie === "jobs") return (b.eventJobs || 0) - (a.eventJobs || 0);
                if (kategorie === "quests") return (b.completedQuests || 0) - (a.completedQuests || 0);
                return 0;
            }).slice(0, 10);

        if (sorted.length === 0) return interaction.reply({ content: "Žebříček je zatím prázdný.", ephemeral: true });

        let desc = "";
        sorted.forEach((u, index) => {
            let val = "";
            if (kategorie === "xp") val = `${u.xp || 0} XP`;
            if (kategorie === "km") val = `${u.km || 0} km`;
            if (kategorie === "jobs") val = `${u.eventJobs || 0} zakázek`;
            if (kategorie === "quests") val = `${u.completedQuests || 0} questů`;
            desc += `${index + 1}. **${u.tbName}** - ${val}\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle(`🏆 TOP 10 Žebříček - ${kategorie.toUpperCase()}`)
            .setDescription(desc)
            .setColor(EVENT_COLOR);
        return interaction.reply({ embeds: [embed] });
    }

    // TEST CTENI
    if (interaction.commandName === "test-cteni") {
        const text = interaction.options.getString("text");
        const jobData = extractJobData(text, "TEST ZAKÁZKA");
        if (!jobData) return interaction.reply({ content: "❌ Bot v textu nenašel platná data zakázky (nebo je menší než 50 km).", ephemeral: true });

        let isEventRoute = false;
        if (systemDb.currentDay > 0 && systemDb.currentDay <= ROUTES.length) {
            const route = ROUTES[systemDb.currentDay - 1];
            const allowedCargos = route.cargos.map(normalizeStr);
            const isEventCargo = allowedCargos.some(c => jobData.cargo.includes(c));
            const isEventDest = jobData.dest.includes(normalizeStr(route.end));
            isEventRoute = isEventCargo && isEventDest;
        }

        const embed = new EmbedBuilder()
            .setTitle("🛠️ (DEV) Výsledek testu čtení")
            .addFields(
                { name: "🚚 Tahač", value: jobData.rawTruck, inline: true },
                { name: "📦 Náklad", value: jobData.rawCargo, inline: true },
                { name: "📏 Vzdálenost", value: `${jobData.km} km`, inline: true },
                { name: "🏁 Trasa", value: `${jobData.rawOrigin} → ${jobData.rawDest}`, inline: false },
                { name: "🎯 Eventová?", value: isEventRoute ? "✅ ANO (100 XP)" : "❌ NE (50 XP)", inline: false }
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
        return interaction.reply({ content: `🛠️ Testovací režim (DEV): **${isDevMode ? "ZAPNUTO" : "VYPNUTO"}**.`, ephemeral: true });
    }

    // DEV FETCH BACKUP
    if (interaction.commandName === "dev-fetch-backup") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Na tento příkaz nemáš práva.", ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const backup = await fetchBackupFromDiscord();
            if (!backup || (!backup.users && !backup.system)) {
                return interaction.editReply("❌ Nepodařilo se najít žádnou platnou zálohu v backup kanálu.");
            }

            let msg = "✅ **Záloha úspěšně načtena z Discordu!**\n\n";
            if (backup.users) {
                usersDb = backup.users;
                saveUsers();
                msg += `📦 **users_db.json** - načteno ${Object.keys(usersDb).length} uživatelů\n`;
            }
            if (backup.system) {
                systemDb = { ...systemDb, ...backup.system };
                saveSystem();
                msg += `⚙️ **system_db.json** - načten stav (den ${systemDb.currentDay})\n`;
            }

            msg += `\n🕐 Čas zálohy: ${new Date(backup.timestamp).toLocaleString('cs-CZ')}`;
            msg += `\n\n💡 Pro zpětné doplnění zakázek použij **/dev-reprocess** s ID kanálu.`;

            if (systemDb.currentDay > 0) {
                await updateCommunityProgressBar(true);
                await announceSecretCityWordle();
            }

            return interaction.editReply(msg);
        } catch (error) {
            return interaction.editReply(`❌ Chyba: ${error.message}`);
        }
    }

    // DEV REPROCESS
    if (interaction.commandName === "dev-reprocess") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Na tento příkaz nemáš práva.", ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });
        const channelId = interaction.options.getString("kanal");
        const targetChannel = await client.channels.fetch(channelId).catch(() => null);

        if (!targetChannel) {
            return interaction.editReply("❌ Kanál nebyl nalezen.");
        }

        let processedCount = 0;
        let validCount = 0;
        let duplicateCount = 0;
        let lastId;
        let allMessages = [];

        await interaction.editReply("⏳ Stahuji zprávy z kanálu...");

        try {
            for (let i = 0; i < 10; i++) {
                const options = { limit: 100 };
                if (lastId) options.before = lastId;
                const fetched = await targetChannel.messages.fetch(options);
                if (fetched.size === 0) break;
                allMessages.push(...fetched.values());
                lastId = fetched.last().id;
            }

            allMessages.reverse();
            await interaction.editReply(`⏳ Zpracovávám ${allMessages.length} zpráv...`);

            for (const msg of allMessages) {
                if (msg.embeds.length > 0) {
                    const result = await processJobMessage(msg);
                    processedCount++;
                    if (result.status === 'added') validCount++;
                    if (result.status.startsWith('duplicate')) duplicateCount++;
                }
            }

            return interaction.editReply(
                `✅ Zpětná analýza dokončena!\n\n📊 **Statistiky:**\n📝 Zkontrolováno: **${processedCount}**\n✅ Nově uznaných: **${validCount}**\n🔄 Duplicitních: **${duplicateCount}**\n💾 Data uložena.`
            );
        } catch (error) {
            return interaction.editReply(`❌ Chyba: ${error.message}`);
        }
    }

    // ADMIN RESTORE
    if (interaction.commandName === "admin-restore") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Na tento příkaz nemáš práva.", ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });
        const usersFile = interaction.options.getAttachment("users_db");
        const systemFile = interaction.options.getAttachment("system_db");

        if (!usersFile && !systemFile) {
            return interaction.editReply("❌ Nebyl nahrán žádný soubor k obnově.");
        }

        let msg = "";
        try {
            if (usersFile) {
                const res = await fetch(usersFile.url);
                const data = await res.json();
                usersDb = data;
                saveUsers();
                msg += "✅ `users_db.json` obnovena.\n";
            }
            if (systemFile) {
                const res = await fetch(systemFile.url);
                const data = await res.json();
                systemDb = data;
                saveSystem();
                msg += "✅ `system_db.json` obnovena.\n";
                await updateCommunityProgressBar(true);
                await announceSecretCityWordle();
            }
            msg += "\n💡 Pro zpětné doplnění zakázek použij `/dev-reprocess`.";
            return interaction.editReply(msg);
        } catch (error) {
            return interaction.editReply(`❌ Chyba: ${error.message}`);
        }
    }

    // ADMIN UNLINK
    if (interaction.commandName === "admin-unlink") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Nemáš práva.", ephemeral: true });
        }
        const targetUser = interaction.options.getUser("hrac");
        if (usersDb[targetUser.id]) {
            delete usersDb[targetUser.id];
            saveUsers();
            return interaction.reply({ content: `✅ Záznam hráče **${targetUser.username}** byl vymazán.`, ephemeral: true });
        }
        return interaction.reply({ content: `❌ Uživatel **${targetUser.username}** nemá profil.`, ephemeral: true });
    }

    // ADMIN LINK
    if (interaction.commandName === "admin-link") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Nemáš práva.", ephemeral: true });
        }
        const targetUser = interaction.options.getUser("hrac");
        const nick = interaction.options.getString("nick");
        const u = getUser(targetUser.id, nick);
        u.tbName = nick;
        saveUsers();
        return interaction.reply({ content: `✅ Hráč **${targetUser.username}** propojen s nickem **${nick}**.`, ephemeral: true });
    }

    // ADMIN ADDXP
    if (interaction.commandName === "admin-addxp") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Nemáš práva.", ephemeral: true });
        }
        const targetUser = interaction.options.getUser("hrac");
        const xpToAdd = interaction.options.getInteger("xp");
        const u = getUser(targetUser.id, targetUser.username);
        u.xp += xpToAdd;
        saveUsers();
        await checkMilestoneRoles(targetUser.id);
        return interaction.reply({ content: `✅ Hráči **${u.tbName}** upraveno XP o **${xpToAdd}**. Nyní: **${u.xp} XP**.`, ephemeral: true });
    }
});

// ─────────────────────────────────────────────
// READY EVENT
// ─────────────────────────────────────────────
client.on("ready", async () => {
    console.log(`✅ Bot úspěšně běží jako ${client.user.tag}`);

    loadDatabases();

    try {
        const rest = new REST({ version: '10' }).setToken(TOKEN);
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log("✅ Slash příkazy zaregistrovány.");

        const guild = client.guilds.cache.get(GUILD_ID);
        if (guild) await guild.members.fetch();

        const scCh = await client.channels.fetch(CH_SECRET_CITY).catch(() => null);
        if (scCh && systemDb.secretCity && !systemDb.secretCityFoundBy) {
            const msgs = await scCh.messages.fetch({ limit: 10 });
            const oldMsg = msgs.find(m => m.author.id === client.user.id &&
                m.embeds[0]?.title?.includes("Najdi Tajné Město"));
            if (!oldMsg) announceSecretCityWordle();
        }

        if (systemDb.currentDay > 0) updateCommunityProgressBar(true);

        console.log("🎉 Bot je připraven!");
    } catch (error) {
        console.error("❌ Chyba při inicializaci:", error);
    }
});

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
client.login(TOKEN);
