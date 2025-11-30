import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const ROUTES = [
  { day: 1, title: "🎄 Adventní okénko #1", url: "https://example.com", image: "" },
  { day: 2, title: "🎄 Adventní okénko #2", url: "https://example.com", image: "" }
  // ...doplníš 24 tras
];

function getAdventDay(today = new Date()) {
  const year = today.getFullYear();
  const start = new Date(year, 11, 1);
  const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

const commands = [
  new SlashCommandBuilder()
    .setName('advent')
    .setDescription('Zobrazí dnešní adventní trasu.')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("Slash commands registrovány.");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log(`Bot přihlášen jako ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'advent') return;

  const day = getAdventDay();
  const route = ROUTES.find(r => r.day === day);

  if (!route) {
    await interaction.reply("Nemám trasu pro dnešek 😅");
    return;
  }

  await interaction.reply({
    embeds: [{
      title: route.title,
      description: "Dnešní trasa 👇",
      url: route.url,
      color: 0xff5555,
      image: route.image ? { url: route.image } : undefined,
      footer: { text: `Den ${day}` }
    }]
  });
});

registerCommands().then(() => client.login(TOKEN));
