const { Client, GatewayIntentBits, Partials } = require('discord.js');

const verificationSystem = require('./verification');
const promotionSystem = require('./promotions');
const blacklistSystem = require('./blacklist');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

verificationSystem(client);
promotionSystem(client);
blacklistSystem(client);

client.login(process.env.TOKEN);
