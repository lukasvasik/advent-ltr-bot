import 'dotenv/config';
import {
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
    EmbedBuilder, PermissionFlagsBits, AttachmentBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType
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
    { day: 1, start: "Praha", end: "Brno", displayCargo: "Nápoje", cargos: ["Nápoje", "Nápoj", "Beverages", "Bottled Water", "Carbonated Water", "Drinks", "Water", "Voda", "Pití"], goal: 50, img: "https://i.imgur.com/5XTW3FA.png", desc: "Přípravy na narozeninovou oslavu byly oficiálně zahájeny. Organizátoři zajistili první zásobu občerstvení. Vaším úkolem je bezpečně dopravit nápoje z Prahy na místo oslav v Brně." },
    { day: 2, start: "Hamburk", end: "Brno", displayCargo: "Potřeby ke stolování", cargos: ["Potřeby ke stolování", "Stolování", "Tableware", "Potřeby", "Furniture", "Nábytek", "Stoly", "Židle", "Chairs", "Tables"], goal: 100, img: "https://i.imgur.com/7wR8bW6.png", desc: "Po zajištění občerstvení je potřeba připravit zázemí pro hosty. V Hamburku byly naloženy potřeby ke stolování, které budou využity při slavnostním občerstvení během oslav narozenin." },
    { day: 3, start: "Bratislava", end: "Brno", displayCargo: "Květiny a stromy", cargos: ["Květiny", "Stromy", "Řezané květiny", "Cut Flowers", "Containerized Trees", "Potted Flowers", "Olive Trees", "Young Seedlings", "Květiny a stromy", "Flowers", "Trees", "Rostliny", "Plants", "Květina", "Strom", "Saplings"], goal: 150, img: "https://i.imgur.com/lymELya.png", desc: "Chceme, aby byla letošní oslava opravdu výjimečná. Ve spolupráci s floristy byla připravena rozsáhlá květinová a stromová výzdoba, kterou je nyní potřeba bezpečně dopravit z Bratislavy." },
    { day: 4, start: "Štětín", end: "Brno", displayCargo: "Hračky", cargos: ["Hračky", "Toys", "Hračka", "Toy", "Hry", "Games", "Dolls", "Panenky", "Auta", "Cars", "Lego", "Puzzle"], goal: 200, img: "https://i.imgur.com/t6fcP9x.png", desc: "Na oslavu byli pozváni také rodinní příslušníci a nejmladší návštěvníci. Proto bylo rozhodnuto připravit speciální zábavnou zónu. Vaším úkolem je přepravit vybavení a dárky určené pro dětské návštěvníky." },
    { day: 5, start: "Vídeň", end: "Brno", displayCargo: "Čokoláda a sladkosti", cargos: ["Čokoláda", "Chocolate", "Čokolády", "Candy", "Sladkosti", "Gummy Bears", "Chewing Gums", "Sladkost", "Bonbóny", "Cukrovinky", "Sweets", "Lízátka", "Cakes", "Dorty", "Cookies", "Sušenky"], goal: 250, img: "https://i.imgur.com/oWPrZey.png", desc: "Každá pořádná narozeninová oslava potřebuje dostatek sladkostí. Počet potvrzených hostů překonal všechna očekávání, a proto byla objednána mimořádná zásilka čokoládových výrobků z Vídně." },
    { day: 6, start: "Poznaň", end: "Brno", displayCargo: "Limonády a nápoje", cargos: ["Limonáda", "Lemonade", "Limonády", "Carbonated Water", "Bottled Water", "Beverages", "Juice", "Juice Concentrate", "Soy Milk", "Coconut Milk", "Džus", "Nápoje", "Nápoj", "Pití", "Drinks", "Water", "Voda", "Soda", "Cola", "Energy Drink"], goal: 250, img: "https://i.imgur.com/J8tVmQU.png", desc: "Po aktualizaci seznamu hostů bylo zjištěno, že původní zásoby nebudou dostačovat. Organizátoři proto zajistili dodatečnou zásilku limonád, která musí být doručena včas před zahájením oslav." },
    { day: 7, start: "Linec", end: "Brno", displayCargo: "Elektronika", cargos: ["Elektronika", "Electronics", "Elektroniku", "Computer", "Computers", "Medical Equipment", "High-Tech Device", "Počítače", "Technika", "Přístroje", "TV", "Televize", "Monitory", "Notebooky", "Laptops", "Mobily", "Phones", "Tablety", "Tablets"], goal: 250, img: "https://i.imgur.com/waiarlZ.png", desc: "Blíží se vyvrcholení příprav. Do Brna je potřeba dopravit profesionální ozvučovací a světelnou techniku, která zajistí hudební doprovod a atmosféru celé narozeninové oslavy." },
    { day: 8, start: "Berlín", end: "Brno", displayCargo: "Pyrotechnika", cargos: ["Ohňostroj", "Pyrotechnika", "Fireworks", "Zábavní pyrotechnika", "Explosives", "Dynamite", "Ohňostroje", "Rachejtle", "Petardy", "Pyro", "Firecrackers", "Rockets"], goal: 250, img: "https://i.imgur.com/BO0Rgu6.png", desc: "Nastal čas na poslední a nejdůležitější úkol celé expedice. V Berlíně je připravena hlavní zásilka zábavní pyrotechniky určené pro slavnostní zakončení oslav. Vaším úkolem je bezpečně dopravit tento cenný náklad do Brna, kde po jeho doručení mohou být zahájeny oslavy." }
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

function getRandomDailyGoal() {
    const roll = Math.random() * 100;
    if (roll <= 25) {
        const goals = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
        return { goal: goals[Math.floor(Math.random() * goals.length)], reward: "🎨 3x Paint Job dle výběru" };
    }
    if (roll <= 40) {
        return { goal: 250, reward: "🚚 3x Trailer / Tuning Pack dle výběru" };
    }
    if (roll <= 45) {
        return { goal: 500, reward: "🗺️ 1x Mapové DLC do 8,99 EUR" };
    }
    if (roll <= 75) {
        const goals = [100, 110, 120, 130, 140, 150];
        return { goal: goals[Math.floor(Math.random() * goals.length)], reward: "🚚 1x Trailer / Tuning Pack dle výběru" };
    }
    return { goal: 50, reward: "🎨 1x Paint Job dle výběru" };
}

// ─────────────────────────────────────────────
// DATABÁZE A PAMĚŤ
// ─────────────────────────────────────────────
let usersDb = {};
let systemDb = {
    currentDay: 0, communityJobsToday: 0,
    hhActiveUntil: 0, hhCountToday: 0, hhMessageId: null,
    secretCity: "", secretCityRevealed: [], secretCityFoundBy: null, nextSecretCityResetUnix: 0,
    hunterDneDay: 0, hunterDneUserId: null, secretExplorerUserId: null, currentDailyRewardText: "",
    eventClosedAnnounced: false, globalProcessedJobs: [], globalJobHashes: [], goalReachedAnnounced: false
};

function loadDatabases() {
    try {
        if (fs.existsSync(USERS_PATH)) {
            usersDb = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
            console.log(`✅ Načteno ${Object.keys(usersDb).length} uživatelů lokálně.`);
        }
        if (fs.existsSync(SYSTEM_PATH)) {
            const loadedSystem = JSON.parse(fs.readFileSync(SYSTEM_PATH, 'utf8'));
            systemDb = { ...systemDb, ...loadedSystem };
            console.log(`✅ Načten lokální systémový stav (den ${systemDb.currentDay})`);
        }
    } catch (error) {
        console.error('❌ Chyba při načítání lokálních databází:', error);
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
// NORMALIZACE TEXTU A SYNONYMA MĚST
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

const CITY_SYNONYMS = {
    'praha': ['prague', 'prag', 'praha'],
    'hamburk': ['hamburg', 'hamburk'],
    'viden': ['wien', 'vienna', 'viden', 'vide'],
    'stetin': ['szczecin', 'stettin', 'stetin', 'steti'],
    'linec': ['linz', 'linec'],
    'berlin': ['berlin'],
    'poznan': ['poznan'],
    'brno': ['brno'],
    'bratislava': ['bratislava']
};

function getCityBase(cityRaw) {
    let n = normalizeStr(cityRaw);
    for (const [base, syns] of Object.entries(CITY_SYNONYMS)) {
        if (syns.some(s => n.includes(normalizeStr(s)))) return base;
    }
    return n;
}

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
function extractJobDataFromEmbed(e) {
    const driver = e.author?.name || "Neznámý";
    
    const fromField = e.fields?.find(f => f.name?.toLowerCase()?.includes('odkud'));
    const toField = e.fields?.find(f => f.name?.toLowerCase()?.includes('kam'));
    
    let origin = fromField?.value || "";
    let dest = toField?.value || "";
    
    const allText = [
        e.description,
        ...(e.fields?.map(f => f.name + '\n' + f.value) || [])
    ].filter(Boolean).join('\n');
    
    let km = 0;
    const kmMatch = allText.match(/(?:Uznaná vzdálenost|Distance):\s*([\d\s.,]+)\s*(km|mi)/im) ||
                    allText.match(/([\d\s.,]{1,6})\s*(km|mi)/i);
    if (kmMatch) {
        km = parseInt(kmMatch[1].replace(/[^\d]/g, ''), 10);
        if (kmMatch[2] && kmMatch[2].toLowerCase().includes('mi')) km = Math.round(km * 1.60934);
    }
    
    let cargo = "";
    const cargoField = e.fields?.find(f => f.name?.toLowerCase()?.includes('náklad') || f.name?.toLowerCase()?.includes('cargo'));
    if (cargoField) {
        cargo = cargoField.value.split(/[\(\[\{]/)[0].trim();
    } else {
        const cargoMatch = allText.match(/(?:Náklad|Cargo):\s*(.+?)(?:\r?\n|$)/i);
        if (cargoMatch) cargo = cargoMatch[1].split(/[\(\[\{]/)[0].trim();
    }
    
    let truck = "";
    const truckField = e.fields?.find(f => f.name?.toLowerCase()?.includes('tahač') || f.name?.toLowerCase()?.includes('truck'));
    if (truckField) {
        truck = truckField.value.trim();
    } else {
        const truckMatch = allText.match(/(?:Tahač|Truck):\s*(.+?)(?:\r?\n|$)/i);
        if (truckMatch) truck = truckMatch[1].trim();
    }
    
    if (!origin) {
        const odkudMatch = allText.match(/Odkud\s*\n\s*(?:[\u{1F1E6}-\u{1F1FF}]{2}\s*)?(.+?)(?:\r?\n|$)/u);
        if (odkudMatch) origin = odkudMatch[1].trim();
    }
    if (!dest) {
        const kamMatch = allText.match(/Kam\s*\n\s*(?:[\u{1F1E6}-\u{1F1FF}]{2}\s*)?(.+?)(?:\r?\n|$)/u);
        if (kamMatch) dest = kamMatch[1].trim();
    }
    
    if (km < 50 || !origin || !dest) {
        return null;
    }
    
    return {
        km,
        origin: normalizeStr(origin),
        dest: normalizeStr(dest),
        cargo: normalizeStr(cargo || "neznámé"),
        truck: normalizeStr(truck || "neznámé"),
        rawOrigin: origin.trim(),
        rawDest: dest.trim(),
        rawCargo: cargo || "neznámé",
        rawTruck: truck || "neznámé",
        driver
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
    const jobData = extractJobDataFromEmbed(e);
    
    if (!jobData) return { status: 'ignored_no_data' };
    
    const driver = jobData.driver;
    const driverNorm = normalizeStr(driver);
    const titleText = e.title || "";
    const allText = [e.description, ...(e.fields?.map(f => f.name + '\n' + f.value) || [])].join('\n');
    
    const jobIdMatch = titleText.match(/#(\d+)/) || allText.match(/#(\d+)/);
    const jobId = jobIdMatch ? `job_${jobIdMatch[1]}` : `msg_${m.id}`;
    
    const jobHash = jobIdMatch ? `hash_${jobIdMatch[1]}` : `${driverNorm}_${jobData.cargo}_${jobData.dest}_${jobData.origin}_${jobData.km}`;

    if (!systemDb.globalProcessedJobs) systemDb.globalProcessedJobs = [];
    if (!systemDb.globalJobHashes) systemDb.globalJobHashes = [];

    if (systemDb.globalProcessedJobs.includes(jobId)) return { status: 'duplicate_global_job_id' };
    if (systemDb.globalJobHashes.includes(jobHash)) return { status: 'duplicate_global_job_hash' };

    let userKey = null;
    for (const [key, user] of Object.entries(usersDb)) {
        if (key.startsWith('UNLINKED_')) continue;
        const dbNick = normalizeStr(user.tbName);
        if (dbNick === driverNorm) { userKey = key; break; }
        if (dbNick.includes(driverNorm) || driverNorm.includes(dbNick)) { if (!userKey) userKey = key; }
    }
    if (!userKey && m.guild) {
        try {
            const members = await m.guild.members.fetch();
            const foundMember = members.find(member => {
                const dn = normalizeStr(member.displayName), un = normalizeStr(member.user.username);
                return dn.includes(driverNorm) || un.includes(driverNorm) || driverNorm.includes(dn) || driverNorm.includes(un);
            });
            if (foundMember) userKey = foundMember.id;
        } catch (e) {}
    }
    if (!userKey) userKey = 'UNLINKED_' + driverNorm.replace(/\s+/g, '_');
    const u = getUser(userKey, driver);

    if (u.processedJobs && u.processedJobs.includes(jobId)) return { status: 'duplicate_local_job_id' };
    if (u.recentJobHashes && u.recentJobHashes.includes(jobHash)) return { status: 'duplicate_local_job_hash' };

    let isEventRoute = false, earnedXP = 50, isHappyHourJob = false, secretCityFound = false, isNewHunterDne = false, questCompleted = false, earnedQuestXP = 0;

    const secretCityNorm = normalizeStr(systemDb.secretCity);
    if (systemDb.secretCity && !systemDb.secretCityFoundBy && 
       (jobData.dest.includes(secretCityNorm) || secretCityNorm.includes(jobData.dest)) && 
       jobData.km >= 500) {
        secretCityFound = true; earnedXP += 1000;
        if (!userKey.startsWith('UNLINKED_')) { systemDb.secretCityFoundBy = userKey; saveSystem(); announceSecretCityWordle(); }
    }

    if (systemDb.currentDay > 0 && systemDb.currentDay <= ROUTES.length) {
        const dailyRoute = ROUTES[systemDb.currentDay - 1];
        const isStart = getCityBase(jobData.rawOrigin) === getCityBase(dailyRoute.start);
        const isDest = getCityBase(jobData.rawDest) === getCityBase(dailyRoute.end);
        const isCargo = dailyRoute.cargos.map(normalizeStr).some(c => jobData.cargo.includes(c) || c.includes(jobData.cargo));
        
        if (isStart && isDest && isCargo) {
            isEventRoute = true; earnedXP = 100; u.eventJobs++; systemDb.communityJobsToday++;
            if (!u.completedRoutesDays.includes(systemDb.currentDay)) u.completedRoutesDays.push(systemDb.currentDay);
            if (systemDb.hunterDneDay !== systemDb.currentDay && !userKey.startsWith('UNLINKED_')) {
                isNewHunterDne = true; systemDb.hunterDneDay = systemDb.currentDay; systemDb.hunterDneUserId = userKey;
            }
            saveSystem();
        }
    }

    if (isEventRoute && Date.now() < systemDb.hhActiveUntil) { isHappyHourJob = true; earnedXP = Math.floor(earnedXP * 1.5); }

    u.xp += earnedXP; u.km += jobData.km;
    u.processedJobs.push(jobId); u.recentJobHashes.push(jobHash);
    systemDb.globalProcessedJobs.push(jobId); systemDb.globalJobHashes.push(jobHash);
    if (u.processedJobs.length > 500) u.processedJobs = u.processedJobs.slice(-400);
    if (u.recentJobHashes.length > 100) u.recentJobHashes = u.recentJobHashes.slice(-80);
    if (systemDb.globalProcessedJobs.length > 10000) systemDb.globalProcessedJobs = systemDb.globalProcessedJobs.slice(-8000);
    if (systemDb.globalJobHashes.length > 10000) systemDb.globalJobHashes = systemDb.globalJobHashes.slice(-8000);

    const q = QUESTS.find(quest => quest.id === u.currentQuestId);
    if (q) {
        let prog = 0;
        switch (q.type) {
            case "km": prog = jobData.km; break;
            case "jobs": if (isEventRoute) prog = 1; break;
            case "city": if (getCityBase(jobData.rawDest) === getCityBase(q.target)) prog = 1; break;
            case "truck": if (jobData.truck.includes(normalizeStr(q.target))) prog = 1; break;
            case "long_jobs": if (jobData.km >= q.targetKm) prog = 1; break;
        }
        if (prog > 0) {
            u.questProgress = (u.questProgress || 0) + prog;
            if (u.questProgress >= (q.targetCount || q.targetKm || q.target)) {
                u.xp += q.reward; earnedQuestXP = q.reward; u.completedQuests++; u.questProgress = 0; u.currentQuestId = getRandomQuestId(); questCompleted = true;
            }
        }
    }

    saveUsers();
    if (!userKey.startsWith('UNLINKED_')) await checkMilestoneRoles(userKey);
    
    return { status: 'added', jobData, isEventRoute, questCompleted, earnedXP, earnedQuestXP, driver, userKey, secretCityFound, isHappyHourJob, isNewHunterDne };
}

// ─────────────────────────────────────────────
// MECHANIKA TRAS A PROGRESS BARU
// ─────────────────────────────────────────────
async function announceDailyRoute(day) {
    if (day > 8) return;
    const route = ROUTES[day - 1];

    if (!systemDb.currentDailyRewardText || systemDb.currentDailyRewardText === "") {
        const dailyGoal = getRandomDailyGoal();
        route.goal = dailyGoal.goal;
        systemDb.currentDailyRewardText = dailyGoal.reward;
    }
    saveSystem();

    const embed = new EmbedBuilder()
        .setTitle(`🚚 EVENT DEN ${day}/8: Nová trasa vyhlášena!`)
        .setDescription(`${route.desc}\n\n📍 **Odkud:** ${route.start}\n🏁 **Kam:** ${route.end}\n📦 **Povolené náklady:** ${route.displayCargo}\n\n---\n🎯 **Komunitní cíl:** Doručit **${route.goal}** zakázek\n🎁 **Odměna:** ${systemDb.currentDailyRewardText}\n🏹 **Bonus:** Kdo doručí jako první, získá roli **HUNTER DNE**!`)
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
    
    // Výpočet reálných a zastropovaných procent
    const realPercent = Math.floor((systemDb.communityJobsToday / route.goal) * 100);
    const cappedPercent = Math.min(100, realPercent);
    const imageIndex = Math.floor(cappedPercent / 5);
    
    const imgUrl = (PROGRESS_BAR_IMAGES[imageIndex] || PROGRESS_BAR_IMAGES[20]) + "?v=" + Date.now();

    const annCh = await client.channels.fetch(CH_DAILY_GOAL).catch(() => null);
    if (!annCh) return;

    const embed = new EmbedBuilder()
        .setTitle(`📊 Komunitní Gól - Den ${systemDb.currentDay}`)
        .setDescription(`**Stav:** ${systemDb.communityJobsToday} / ${route.goal} zakázek (${realPercent}%)\n**Dnešní drop šance:** ${systemDb.currentDailyRewardText || "Zatím neurčeno"}\n\n*(Aktualizuje se každých 5 minut)*`)
        .setImage(imgUrl)
        .setColor(EVENT_COLOR);

    // Odeslání gratulace pouze jednou
    if (systemDb.communityJobsToday >= route.goal && !systemDb.goalReachedAnnounced) {
        systemDb.goalReachedAnnounced = true;
        saveSystem();
        
        // Zpráva do public kanálu
        annCh.send(`🎉 **CÍL SPLNĚN!** Dokázali jste to! Zítra vylosujeme, kdo získá **${systemDb.currentDailyRewardText}**!`).catch(() => {});
        
        // Zpráva do backup kanálu pro vedení
        const backupCh = await client.channels.fetch(CH_BACKUP).catch(() => null);
        if (backupCh) {
            backupCh.send(`🏆 **INFO PRO VEDENÍ:** Komunita právě dosáhla dnešního cíle (${route.goal} zakázek).`).catch(() => {});
        }
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
async function createBackup() {
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
                return true;
            }
        }
        return false;
    } catch (e) {
        console.error('❌ Chyba při vytváření zálohy:', e);
        return false;
    }
}

async function fetchBackupFromDiscord() {
    try {
        const backupCh = await client.channels.fetch(CH_BACKUP).catch(() => null);
        if (!backupCh) {
            console.log('❌ Backup kanál nenalezen');
            return null;
        }

        console.log('📥 Stahuji poslední zálohy z Discordu...');
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
        console.error('❌ Chyba při stahování záloh z Discordu:', error);
        return null;
    }
}

// ─────────────────────────────────────────────
// ČASOVAČE
// ─────────────────────────────────────────────
setInterval(async () => {
    createBackup();
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
        systemDb.currentDailyRewardText = "";
        saveSystem();
        announceDailyRoute(1);
        startNewSecretCity();
    } else if (czTime.getHours() === 19 && czTime.getMinutes() === 0 && systemDb.currentDay > 0 && systemDb.currentDay < 8) {
        systemDb.currentDay += 1;
        systemDb.communityJobsToday = 0;
        systemDb.hhCountToday = 0;
        systemDb.currentDailyRewardText = "";
        systemDb.goalReachedAnnounced = false;
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

    if (czTime.getMinutes() % 5 === 0 && systemDb.currentDay > 0 && systemDb.currentDay <= 8 && now < EVENT_END_DATE) {
        updateCommunityProgressBar();
    }

    if (systemDb.hhActiveUntil > 0 && now >= systemDb.hhActiveUntil) {
        if (systemDb.hhMessageId) {
            client.channels.fetch(CH_ROUTES).then(async ch => {
                try {
                    const msg = await ch.messages.fetch(systemDb.hhMessageId);
                    if (msg) await msg.delete();
                } catch (e) {
                    console.log("Zpráva Happy Hour už zřejmě neexistuje.");
                }
            }).catch(() => {});
            systemDb.hhMessageId = null;
            systemDb.hhActiveUntil = 0;
            saveSystem();
        }
    }

    if (czTime.getMinutes() === 0 && systemDb.currentDay > 0 && systemDb.currentDay <= 8 && now < EVENT_END_DATE) {
        if (now >= systemDb.hhActiveUntil && systemDb.hhCountToday < 2) {
            if (Math.random() < 0.10) {
                systemDb.hhActiveUntil = now + (60 * 60 * 1000);
                systemDb.hhCountToday += 1;
                const hhEndUnix = Math.floor(systemDb.hhActiveUntil / 1000);
                saveSystem();
                client.channels.fetch(CH_ROUTES).then(async ch => {
                    const msg = await ch.send(`🌟 **HAPPY HOUR PRÁVĚ ZAČALA!** Následující 1 hodinu jsou ziskované XP u všech EVENTOVÝCH zakázek násobeny 1.5x!\n⏳ **Konec:** <t:${hhEndUnix}:R>`);
                    systemDb.hhMessageId = msg.id;
                    saveSystem();
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
    new SlashCommandBuilder().setName("dev-create-backup").setDescription("🛠️ (DEV) Vytvoří manuální zálohu databáze."),
    new SlashCommandBuilder().setName("fullanalyze").setDescription("🛠️ (ADMIN) Smaže statistiky a přepočítá zakázky od začátku (zachová nicky).")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName("admin-restore").setDescription("🛠️ ADMIN: Obnoví databázi z nahraných JSON souborů.")
        .addAttachmentOption(o => o.setName("users_db").setDescription("Soubor users_db.json").setRequired(false))
        .addAttachmentOption(o => o.setName("system_db").setDescription("Soubor system_db.json").setRequired(false)),
    new SlashCommandBuilder().setName("admin-unlink").setDescription("🛠️ ADMIN: Smaže uživatele z databáze.")
        .addUserOption(o => o.setName("hrac").setDescription("Hráč k odpojení").setRequired(true)),
    new SlashCommandBuilder().setName("admin-link").setDescription("🛠️ ADMIN: Ručně propojí hráče s TB nickem.")
        .addUserOption(o => o.setName("hrac").setDescription("Hráč").setRequired(true))
    new SlashCommandBuilder().setName("admin-addxp").setDescription("🛠️ ADMIN: Přidá nebo odebere hráči XP.")
        .addUserOption(o => o.setName("hrac").setDescription("Hráč").setRequired(true))
        .addIntegerOption(o => o.setName("xp").setDescription("Počet XP (kladné pro přidání, záporné pro odečtení)").setRequired(true))
].map(c => c.toJSON());

// ⬇️ CLIENT ⬇️
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ⬇️ MESSAGE CREATE HANDLER ⬇️
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
// SLASH INTERAKCE
// ─────────────────────────────────────────────
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

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

    if (interaction.commandName === "link") {
        const nick = interaction.options.getString("nick");
        const u = getUser(interaction.user.id, nick);
        u.tbName = nick;
        saveUsers();
        return interaction.reply({ content: `✅ Tvůj Discord byl úspěšně propojen s nickem **${nick}**.`, ephemeral: true });
    }

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

    if (interaction.commandName === "odmeny") {
        const embed = new EmbedBuilder()
            .setTitle("🎁 Přehled denních odměn & šancí")
            .setDescription("Každý den se losuje náhodný cíl a odměna:\n\n🎨 **25%** - 3x Paint Job (50-150 zakázek)\n🚚 **15%** - 3x Trailer / Tuning Pack (250 zakázek)\n🗺️ **5%** - 1x Mapové DLC do 8,99 EUR (500 zakázek)\n🚚 **30%** - 1x Trailer / Tuning Pack (100-150 zakázek)\n🎨 **25%** - 1x Paint Job (50 zakázek)")
            .setColor(EVENT_COLOR);
        return interaction.reply({ embeds: [embed] });
    }

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
            });

        if (sorted.length === 0) return interaction.reply({ content: "Žebříček je zatím prázdný.", ephemeral: true });

        const ITEMS_PER_PAGE = 10;
        const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const currentItems = sorted.slice(start, end);

            let desc = "";
            currentItems.forEach((u, index) => {
                let val = "";
                if (kategorie === "xp") val = `${u.xp || 0} XP`;
                if (kategorie === "km") val = `${u.km || 0} km`;
                if (kategorie === "jobs") val = `${u.eventJobs || 0} zakázek`;
                if (kategorie === "quests") val = `${u.completedQuests || 0} questů`;
                desc += `${start + index + 1}. **${u.tbName}** - ${val}\n`;
            });

            return new EmbedBuilder()
                .setTitle(`🏆 Žebříček - ${kategorie.toUpperCase()}`)
                .setDescription(desc)
                .setColor(EVENT_COLOR)
                .setFooter({ text: `Strana ${page + 1} z ${totalPages} | Celkem hráčů: ${sorted.length}` });
        };

        const generateButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('lb_prev')
                    .setLabel('◀ Předchozí')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('lb_next')
                    .setLabel('Další ▶')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1)
            );
        };

        const response = await interaction.reply({
            embeds: [generateEmbed(currentPage)],
            components: totalPages > 1 ? [generateButtons(currentPage)] : [],
            fetchReply: true
        });

        if (totalPages > 1) {
            const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: "❌ Toto stránkování patří jinému uživateli. Použij příkaz /leaderboard sám za sebe.", ephemeral: true });
                }

                if (i.customId === 'lb_prev') currentPage--;
                else if (i.customId === 'lb_next') currentPage++;

                await i.update({
                    embeds: [generateEmbed(currentPage)],
                    components: [generateButtons(currentPage)]
                });
            });

            collector.on('end', () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('lb_prev').setLabel('◀ Předchozí').setStyle(ButtonStyle.Primary).setDisabled(true),
                    new ButtonBuilder().setCustomId('lb_next').setLabel('Další ▶').setStyle(ButtonStyle.Primary).setDisabled(true)
                );
                interaction.editReply({ components: [disabledRow] }).catch(() => {});
            });
        }
        return;
    }

    if (interaction.commandName === "test-cteni") {
        const text = interaction.options.getString("text");
        const fakeEmbed = {
            author: { name: "Test" },
            description: text,
            fields: []
        };
        const jobData = extractJobDataFromEmbed(fakeEmbed);
        if (!jobData) return interaction.reply({ content: "❌ Bot v textu nenašel platná data zakázky (nebo je menší než 50 km).", ephemeral: true });

        let isEventRoute = false;
        if (systemDb.currentDay > 0 && systemDb.currentDay <= ROUTES.length) {
            const route = ROUTES[systemDb.currentDay - 1];
            const allowedCargos = route.cargos.map(normalizeStr);
            const isEventCargo = allowedCargos.some(c => jobData.cargo.includes(c) || c.includes(jobData.cargo));
            const isStart = getCityBase(jobData.rawOrigin) === getCityBase(route.start);
            const isDest = getCityBase(jobData.rawDest) === getCityBase(route.end);
            isEventRoute = isEventCargo && isStart && isDest;
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

    if (interaction.commandName === "dev-override") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Na tento příkaz nemáš práva.", ephemeral: true });
        }
        isDevMode = !isDevMode;
        return interaction.reply({ content: `🛠️ Testovací režim (DEV): **${isDevMode ? "ZAPNUTO" : "VYPNUTO"}**.`, ephemeral: true });
    }

    if (interaction.commandName === "dev-create-backup") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Na tento příkaz nemáš práva.", ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true });
        const success = await createBackup();
        if (success) {
            return interaction.editReply("✅ **Manuální záloha byla úspěšně vytvořena!**");
        } else {
            return interaction.editReply("❌ **Chyba při vytváření zálohy.** Zkontroluj konzoli.");
        }
    }

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
            if (backup.users) { usersDb = backup.users; saveUsers(); msg += `📦 **users_db.json** - načteno ${Object.keys(usersDb).length} uživatelů\n`; }
            if (backup.system) {
                const oldReward = systemDb.currentDailyRewardText;
                systemDb = { ...systemDb, ...backup.system };
                if (oldReward && !systemDb.currentDailyRewardText) systemDb.currentDailyRewardText = oldReward;
                saveSystem();
                msg += `⚙️ **system_db.json** - načten stav (den ${systemDb.currentDay})\n`;
            }
            msg += `\n🕐 Čas zálohy: ${new Date(backup.timestamp).toLocaleString('cs-CZ')}`;
            if (systemDb.currentDay > 0) { await updateCommunityProgressBar(true); await announceSecretCityWordle(); }
            return interaction.editReply(msg);
        } catch (error) {
            return interaction.editReply(`❌ Chyba: ${error.message}`);
        }
    }

    if (interaction.commandName === "dev-reprocess") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "❌ Na tento příkaz nemáš práva.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        const channelId = interaction.options.getString("kanal");
        const targetChannel = await client.channels.fetch(channelId).catch(() => null);
        if (!targetChannel) return interaction.editReply("❌ Kanál nebyl nalezen.");

        let processedCount = 0, validCount = 0, duplicateCount = 0, lastId, allMessages = [];
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
            return interaction.editReply(`✅ Zpětná analýza dokončena!\n\n📊 **Statistiky:**\n📝 Zkontrolováno: **${processedCount}**\n✅ Nově uznaných: **${validCount}**\n🔄 Duplicitních: **${duplicateCount}**\n💾 Data uložena.`);
        } catch (error) { return interaction.editReply(`❌ Chyba: ${error.message}`); }
    }

    // ─────────────────────────────────────────────
    // FULLANALYZE - Kompletní přepočet se zachováním nicků
    // ─────────────────────────────────────────────
    if (interaction.commandName === "fullanalyze") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Na tento příkaz nemáš práva.", ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });
        
        try {
            // 1. Vytvoř zálohu před resetem
            await interaction.editReply("💾 Vytvářím zálohu před resetem...");
            await createBackup();
            
            // 2. Ulož si nastavení eventu před úpravou
            const savedSettings = {
                currentDay: systemDb.currentDay,
                currentDailyRewardText: systemDb.currentDailyRewardText,
                secretCity: systemDb.secretCity,
                secretCityRevealed: systemDb.secretCityRevealed,
                // secretCityFoundBy záměrně neukládáme - bot musí město najít z historie znova!
                nextSecretCityResetUnix: systemDb.nextSecretCityResetUnix,
                secretExplorerUserId: systemDb.secretExplorerUserId,
                goalReachedAnnounced: systemDb.goalReachedAnnounced
            };
            
            // 3. VYNUJLUJ STATISTIKY všem uživatelům (ale ZACHOVEJ propojení!)
            await interaction.editReply("🗑️ Nuluji statistiky (propojení nicků zůstává)...");
            
            for (const userId in usersDb) {
                const u = usersDb[userId];
                u.xp = 0;
                u.km = 0;
                u.eventJobs = 0;
                u.processedJobs = [];
                u.recentJobHashes = [];
                u.completedRoutesDays = [];
                u.completedQuests = 0;
                u.questProgress = 0;
                u.lastQuestSkip = 0;
            }
            
            // 4. Resetuj systémové proměnné (kromě nastavení eventu)
            systemDb.communityJobsToday = 0;
            systemDb.hhActiveUntil = 0;
            systemDb.hhCountToday = 0;
            systemDb.hhMessageId = null;
            systemDb.hunterDneDay = 0;
            systemDb.hunterDneUserId = null;
            systemDb.globalProcessedJobs = [];
            systemDb.globalJobHashes = [];
            systemDb.eventClosedAnnounced = false;
            
            // Zachovej nastavení eventu
            systemDb.currentDay = savedSettings.currentDay || systemDb.currentDay || 1;
            systemDb.currentDailyRewardText = savedSettings.currentDailyRewardText || systemDb.currentDailyRewardText || "";
            systemDb.secretCity = savedSettings.secretCity || systemDb.secretCity || "";
            systemDb.secretCityRevealed = savedSettings.secretCityRevealed || systemDb.secretCityRevealed || [];
            systemDb.secretCityFoundBy = null; // Vynutí zpětné dohledání
            systemDb.nextSecretCityResetUnix = savedSettings.nextSecretCityResetUnix || systemDb.nextSecretCityResetUnix || 0;
            systemDb.secretExplorerUserId = savedSettings.secretExplorerUserId || systemDb.secretExplorerUserId || null;
            systemDb.goalReachedAnnounced = savedSettings.goalReachedAnnounced || false;
            
            saveUsers();
            saveSystem();
            
            // 5. Projdi oba kanály a přepočítej zakázky
            let totalProcessed = 0;
            let totalValid = 0;
            let totalDuplicates = 0;
            
            for (const channelId of [CH_JOBS_1, CH_JOBS_2]) {
                await interaction.editReply(`📥 Stahuji zprávy z kanálu ${channelId}...`);
                const targetChannel = await client.channels.fetch(channelId).catch(() => null);
                if (!targetChannel) continue;
                
                let allMessages = [];
                let lastId;
                
                for (let i = 0; i < 20; i++) {
                    const options = { limit: 100 };
                    if (lastId) options.before = lastId;
                    const fetched = await targetChannel.messages.fetch(options);
                    if (fetched.size === 0) break;
                    allMessages.push(...fetched.values());
                    lastId = fetched.last().id;
                }
                
                allMessages = allMessages.filter(msg => 
                    msg.createdTimestamp >= EVENT_START_DATE && 
                    msg.createdTimestamp <= Date.now()
                );
                allMessages.reverse();
                
                await interaction.editReply(`⚙️ Zpracovávám ${allMessages.length} zpráv z kanálu ${channelId}...`);
                
                for (const msg of allMessages) {
                    if (msg.embeds.length > 0) {
                        const result = await processJobMessage(msg);
                        totalProcessed++;
                        if (result.status === 'added') totalValid++;
                        if (result.status.startsWith('duplicate')) totalDuplicates++;
                    }
                }
            }
            
            // 6. Obnov progress bar a tajné město
            if (systemDb.currentDay > 0) {
                await updateCommunityProgressBar(true);
            }
            if (systemDb.secretCity && !systemDb.secretCityFoundBy) {
                await announceSecretCityWordle();
            }
            
            // 7. Statistika
            const linkedUsers = Object.values(usersDb).filter(u => !u.id?.startsWith?.('UNLINKED_'));
            const totalXP = linkedUsers.reduce((sum, u) => sum + (u.xp || 0), 0);
            const totalKm = linkedUsers.reduce((sum, u) => sum + (u.km || 0), 0);
            const totalJobs = linkedUsers.reduce((sum, u) => sum + (u.eventJobs || 0), 0);
            
            return interaction.editReply(
                `✅ **Kompletní přepočet dokončen!**\n\n` +
                `📊 **Celkové statistiky:**\n` +
                `📝 Zkontrolováno zpráv: **${totalProcessed}**\n` +
                `✅ Uznaných zakázek: **${totalValid}**\n` +
                `🔄 Duplicitních: **${totalDuplicates}**\n\n` +
                `👥 **Hráči:**\n` +
                `🔗 Propojených účtů: **${linkedUsers.length}** (zachováno)\n` +
                `⭐ Celkem XP: **${totalXP}**\n` +
                `🚚 Celkem km: **${totalKm}**\n` +
                `📦 Celkem zakázek: **${totalJobs}**\n\n` +
                `📅 Aktuální den: **${systemDb.currentDay}**\n` +
                `🎯 Komunitní cíl: **${systemDb.communityJobsToday}** / **${ROUTES[systemDb.currentDay-1]?.goal || '?'}** zakázek\n` +
                `🎁 Dnešní odměna: **${systemDb.currentDailyRewardText || '?'}**\n\n` +
                `💾 Původní data zálohována. **Propojení nicků zachováno!**`
            );
            
        } catch (error) {
            console.error('❌ Chyba při fullanalyze:', error);
            return interaction.editReply(`❌ **Chyba:** ${error.message}\n\nZkuste obnovit data ze zálohy pomocí \`/dev-fetch-backup\`.`);
        }
    }

    if (interaction.commandName === "admin-restore") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "❌ Na tento příkaz nemáš práva.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        const usersFile = interaction.options.getAttachment("users_db");
        const systemFile = interaction.options.getAttachment("system_db");
        if (!usersFile && !systemFile) return interaction.editReply("❌ Nebyl nahrán žádný soubor k obnově.");
        let msg = "";
        try {
            if (usersFile) {
                const res = await fetch(usersFile.url); const data = await res.json();
                usersDb = data; saveUsers(); msg += "✅ `users_db.json` obnovena.\n";
            }
            if (systemFile) {
                const res = await fetch(systemFile.url); const data = await res.json();
                const oldReward = systemDb.currentDailyRewardText;
                systemDb = data;
                if (oldReward && !systemDb.currentDailyRewardText) systemDb.currentDailyRewardText = oldReward;
                saveSystem(); msg += "✅ `system_db.json` obnovena.\n";
                await updateCommunityProgressBar(true); await announceSecretCityWordle();
            }
            msg += "\n💡 Pro zpětné doplnění zakázek použij `/dev-reprocess`.";
            return interaction.editReply(msg);
        } catch (error) { return interaction.editReply(`❌ Chyba: ${error.message}`); }
    }

    if (interaction.commandName === "admin-unlink") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "❌ Nemáš práva.", ephemeral: true });
        const targetUser = interaction.options.getUser("hrac");
        if (usersDb[targetUser.id]) { delete usersDb[targetUser.id]; saveUsers(); return interaction.reply({ content: `✅ Záznam hráče **${targetUser.username}** byl vymazán.`, ephemeral: true }); }
        return interaction.reply({ content: `❌ Uživatel **${targetUser.username}** nemá profil.`, ephemeral: true });
    }

    if (interaction.commandName === "admin-link") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "❌ Nemáš práva.", ephemeral: true });
        const targetUser = interaction.options.getUser("hrac");
        const nick = interaction.options.getString("nick");
        const u = getUser(targetUser.id, nick); u.tbName = nick; saveUsers();
        return interaction.reply({ content: `✅ Hráč **${targetUser.username}** propojen s nickem **${nick}**.`, ephemeral: true });
    }

    if (interaction.commandName === "admin-addxp") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "❌ Nemáš práva.", ephemeral: true });
        const targetUser = interaction.options.getUser("hrac");
        const xpToAdd = interaction.options.getInteger("xp");
        const u = getUser(targetUser.id, targetUser.username); u.xp += xpToAdd; saveUsers();
        await checkMilestoneRoles(targetUser.id);
        return interaction.reply({ content: `✅ Hráči **${u.tbName}** upraveno XP o **${xpToAdd}**. Nyní: **${u.xp} XP**.`, ephemeral: true });
    }
});

// ─────────────────────────────────────────────
// READY EVENT (AUTOMATICKÁ OBNOVA ZE ZÁLOHY PŘI STARTU)
// ─────────────────────────────────────────────
client.on("ready", async () => {
    console.log(`✅ Bot úspěšně běží jako ${client.user.tag}`);

    console.log("📥 Zkouším načíst data z Discord zálohy (redeploy recovery)...");
    const backup = await fetchBackupFromDiscord();
    
    if (backup && (backup.users || backup.system)) {
        if (backup.users) usersDb = backup.users;
        if (backup.system) {
            const oldReward = systemDb.currentDailyRewardText;
            systemDb = { ...systemDb, ...backup.system };
            if (oldReward && (!systemDb.currentDailyRewardText || systemDb.currentDailyRewardText === "")) {
                systemDb.currentDailyRewardText = oldReward;
            }
        }
        saveUsers();
        saveSystem();
        console.log("✅ Data úspěšně obnovena ze zálohy na Discordu.");
    } else {
        console.log("⚠️ Záloha na Discordu nenalezena, načítám lokální soubory.");
        loadDatabases();
    }

    try {
        const rest = new REST({ version: '10' }).setToken(TOKEN);
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log("✅ Slash příkazy zaregistrovány.");

        const guild = client.guilds.cache.get(GUILD_ID);
        if (guild) await guild.members.fetch();

        const scCh = await client.channels.fetch(CH_SECRET_CITY).catch(() => null);
        if (scCh && systemDb.secretCity && !systemDb.secretCityFoundBy) {
            await announceSecretCityWordle();
        }

        if (systemDb.currentDay > 0) {
            await updateCommunityProgressBar(true);
        }

        console.log("🎉 Bot je připraven!");
    } catch (error) {
        console.error("❌ Chyba při inicializaci:", error);
    }
});

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
client.login(TOKEN);
