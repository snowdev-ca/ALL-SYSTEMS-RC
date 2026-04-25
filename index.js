const mongoose = require("mongoose");
const { Client, GatewayIntentBits, Partials } = require("discord.js");

const blacklist = require("./systems/blacklist");
const verification = require("./systems/verification");

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

async function startBot() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    blacklist(client);
    verification(client);

    await client.login(process.env.TOKEN);

  } catch (err) {
    console.error("Startup error:", err);
  }
}

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

startBot();