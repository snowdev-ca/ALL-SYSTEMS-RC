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
                .setDescription('The user ID')
                .setRequired(true))
            .addStringOption(opt =>
              opt.setName('reason')
                .setDescription('Reason')
                .setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a user')
            .addStringOption(opt =>
              opt.setName('userid')
                .setDescription('The user ID')
                .setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('list')
            .setDescription('View blacklist')
        )
    ];

    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (!guild) return console.log('Guild not found');

    try {
      const guild = client.guilds.cache.get(config.GUILD_ID);
      if (!guild) return console.log('Guild not found');

      const commands = [
        new SlashCommandBuilder()
          .setName('blacklist')
          .setDescription('Manage blacklist')
          .addSubcommand(s =>
            s.setName('add')
              .setDescription('Add user')
              .addStringOption(o =>
                o.setName('userid').setDescription('User ID').setRequired(true))
              .addStringOption(o =>
                o.setName('reason').setDescription('Reason').setRequired(true))
          )
          .addSubcommand(s =>
            s.setName('remove')
              .setDescription('Remove user')
              .addStringOption(o =>
                o.setName('userid').setDescription('User ID').setRequired(true))
          )
          .addSubcommand(s =>
            s.setName('list')
              .setDescription('List users')
          )
      ];

      await guild.commands.set(commands);
      console.log('Slash commands registered successfully');
    } catch (err) {
      console.log('Command register error:', err);
    }
  });

  // =========================
  // COMMAND HANDLER (FIXED)
  // =========================
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName !== 'blacklist') return;

      // 🔥 FIX: prevent timeout
      await interaction.deferReply({ ephemeral: true });

      const member = interaction.member;

      const isHR = config.HR_ROLE_IDS.some(roleId =>
        member.roles.cache.has(roleId)
      );

      if (!isHR) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFF0000)
              .setDescription('No permission.')
          ]
        });

        return interaction.editReply(`Blacklisted ${user.tag}`);
      }

      const sub = interaction.options.getSubcommand();

      // =========================
      // ADD
      // =========================
      if (sub === 'add') {
        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('reason');

        const existing = await Blacklist.findOne({ userId });
        if (existing) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('User already blacklisted.')
            ]
          });
        }

        const targetUser = await client.users.fetch(userId).catch(() => null);
        if (!targetUser) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('Invalid user ID.')
            ]
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

        return interaction.editReply({
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

      // =========================
      // REMOVE
      // =========================
      if (sub === 'remove') {
        const userId = interaction.options.getString('userid');

        const entry = await Blacklist.findOneAndDelete({ userId });

        if (!entry) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('User not blacklisted.')
            ]
          });
        }

        return interaction.editReply({
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

      // =========================
      // LIST
      // =========================
      if (sub === 'list') {
        const entries = await Blacklist.find();

        if (!entries.length) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x00FF00)
                .setDescription('Blacklist is empty.')
            ]
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('Blacklist')
          .setDescription(`${entries.length} users`);

        for (const entry of entries.slice(0, 25)) {
          embed.addFields({
            name: entry.username || 'Unknown',
            value: `ID: ${entry.userId}\nReason: ${entry.reason}`,
            inline: true
          });
        }

        return interaction.editReply({ embeds: [embed] });
      }

    } catch (err) {
      console.error(err);

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: 'An error occurred while processing the command.'
        });
      } else {
        return interaction.reply({
          content: 'An error occurred.',
          ephemeral: true
        });
      }
    }
  });

  // =========================
  // REJOIN CHECK (SAFE)
  // =========================
  client.on('guildMemberAdd', async (member) => {
    try {
      const entry = await Blacklist.findOne({ userId: member.id });
      if (!entry) return;

      const banDays = config.BLACKLIST_BAN_DAYS;
      const expiry = Math.floor((Date.now() + banDays * 86400000) / 1000);

      await member.send(`You are blacklisted.\nReason: ${entry.reason}`).catch(() => null);

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

    } catch (err) {
      console.error('Rejoin check error:', err);
    }
  });

};
