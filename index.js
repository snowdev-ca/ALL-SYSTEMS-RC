const { Client, GatewayIntentBits, Partials } = require('discord.js');

const verificationSystem = require('systems/verification');
const promotionSystem = require('systems/promotions');
const blacklistSystem = require('systems/blacklist');

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
