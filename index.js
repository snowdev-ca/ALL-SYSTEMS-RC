const mongoose = require("mongoose");
const { Client, GatewayIntentBits } = require("discord.js");

// import module
const blacklist = require("./systems/blacklist");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

async function startBot() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    // ✅ RUN MODULE (THIS IS WHAT YOU WERE MISSING)
    blacklist(client);

    await client.login(process.env.TOKEN);

  } catch (err) {
    console.error("Startup error:", err);
  }
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

startBot();