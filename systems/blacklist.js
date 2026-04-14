const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Blacklist = require('../utils/blacklistSchema');
const config = require('../config/config');

module.exports = (client) => {

  // =========================
  // REGISTER COMMANDS
  // =========================
  client.once('ready', async () => {

    const commands = [
      new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Manage the blacklist')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add a user to the blacklist')
            .addStringOption(opt =>
              opt.setName('userid')
                .setDescription('The user ID to blacklist')
                .setRequired(true))
            .addStringOption(opt =>
              opt.setName('reason')
                .setDescription('Reason for blacklisting')
                .setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a user from the blacklist')
            .addStringOption(opt =>
              opt.setName('userid')
                .setDescription('The user ID to remove')
                .setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('list')
            .setDescription('View all blacklisted users')
        )
    ];

    const guild = client.guilds.cache.get(config.GUILD_ID);

    if (!guild) {
      console.log('Guild not found - check GUILD_ID');
      return;
    }

    try {
      await guild.commands.set(commands);

      console.log(`Logged in as: ${client.user.tag}`);
      console.log('Slash commands registered successfully');
      console.log(`Commands active in: ${guild.name}`);

      const fetched = await guild.commands.fetch();
      console.log(`Verified commands: ${fetched.size}`);

    } catch (err) {
      console.log('Failed to register commands:', err);
    }
  });

  // =========================
  // HANDLE COMMANDS
  // =========================
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'blacklist') return;

    const member = interaction.member;

    const isHR = config.HR_ROLE_IDS.some(roleId =>
      member.roles.cache.has(roleId)
    );

    if (!isHR) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setDescription('No permission.')
        ],
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();

    // ADD
    if (sub === 'add') {
      const userId = interaction.options.getString('userid');
      const reason = interaction.options.getString('reason');

      const existing = await Blacklist.findOne({ userId });
      if (existing) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFF0000)
              .setDescription('User already blacklisted.')
          ],
          ephemeral: true
        });
      }

      const targetUser = await client.users.fetch(userId).catch(() => null);
      if (!targetUser) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFF0000)
              .setDescription('Invalid user ID.')
          ],
          ephemeral: true
        });
      }

      await Blacklist.create({
        userId,
        username: targetUser.tag,
        reason,
        blacklistedBy: interaction.user.tag
      });

      const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
      if (targetMember && targetMember.kickable) {
        await targetMember.kick(`Blacklisted: ${reason}`);
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('User Blacklisted')
            .addFields(
              { name: 'User', value: targetUser.tag, inline: true },
              { name: 'Reason', value: reason, inline: true },
              { name: 'By', value: interaction.user.tag, inline: true }
            )
        ]
      });
    }

    // REMOVE
    if (sub === 'remove') {
      const userId = interaction.options.getString('userid');

      const entry = await Blacklist.findOneAndDelete({ userId });

      if (!entry) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFF0000)
              .setDescription('User not blacklisted.')
          ],
          ephemeral: true
        });
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Removed from blacklist')
            .addFields(
              { name: 'User', value: entry.username, inline: true },
              { name: 'By', value: interaction.user.tag, inline: true }
            )
        ]
      });
    }

    // LIST
    if (sub === 'list') {
      const entries = await Blacklist.find();

      if (!entries.length) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x00FF00)
              .setDescription('Blacklist is empty.')
          ],
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('Blacklist')
        .setDescription(`${entries.length} users`);

      for (const entry of entries.slice(0, 25)) {
        embed.addFields({
          name: entry.username,
          value: `ID: ${entry.userId}\nReason: ${entry.reason}`,
          inline: true
        });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  });

  // =========================
  // REJOIN CHECK
  // =========================
  client.on('guildMemberAdd', async (member) => {
    const entry = await Blacklist.findOne({ userId: member.id });
    if (!entry) return;

    const banDays = config.BLACKLIST_BAN_DAYS;
    const expiry = Math.floor((Date.now() + banDays * 86400000) / 1000);

    await member.send(
      `You are blacklisted.\nReason: ${entry.reason}`
    ).catch(() => null);

    if (member.bannable) {
      await member.ban({ reason: entry.reason });
    }

    const logChannel = member.guild.channels.cache.get(config.LOG_CHANNEL_ID);

    if (logChannel) {
      logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Blacklisted User Banned on Rejoin')
            .addFields(
              { name: 'User', value: member.user.tag, inline: true },
              { name: 'Reason', value: entry.reason, inline: true },
              { name: 'Expires', value: `<t:${expiry}:F>`, inline: true }
            )
        ]
      });
    }
  });

};
