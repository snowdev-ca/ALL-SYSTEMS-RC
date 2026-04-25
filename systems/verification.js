const config = require('../config/config');
const Blacklist = require('../utils/blacklistSchema');
const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {

  client.on("messageReactionAdd", async (reaction, user) => {
    console.log(`[DEBUG] Reaction fired: ${reaction.emoji.name} by ${user.tag}`);
    if (user.bot) return;

    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();

      if (reaction.message.channel.id !== config.VERIFY_CHANNEL_ID) return;

      const guild = reaction.message.guild;
      const reactor = await guild.members.fetch(user.id);

      const isHR = config.HR_ROLE_IDS.some(roleId =>
        reactor.roles.cache.has(roleId)
      );
      if (!isHR) return;

      const target = await guild.members.fetch(reaction.message.author.id).catch(() => null);
      if (!target) return;

      const logChannel = guild.channels.cache.get(config.LOG_CHANNEL_ID);
      const unixTime = Math.floor(Date.now() / 1000);

      if (reaction.emoji.name === config.VERIFY_EMOJI) {

        const blacklistEntry = await Blacklist.findOne({ userId: target.id });
        if (blacklistEntry) {
          await target.kick(`Blacklisted: ${blacklistEntry.reason}`);
          if (logChannel) {
            await logChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xFF0000)
                  .setTitle('🚫 Verification Denied — Blacklisted User')
                  .addFields(
                    { name: 'User', value: `${target.user.tag} (<@${target.id}>)`, inline: true },
                    { name: 'Reason', value: blacklistEntry.reason, inline: true },
                    { name: 'Blacklisted By', value: blacklistEntry.blacklistedBy, inline: true }
                  )
                  .setTimestamp()
              ]
            });
          }
          return;
        }

        const alreadyVerified = config.VERIFIED_ROLE_IDS.every(roleId =>
          target.roles.cache.has(roleId)
        );
        if (alreadyVerified) return;

        const accountAgeDays = (Date.now() - target.user.createdAt) / (1000 * 60 * 60 * 24);
        if (accountAgeDays < config.MIN_ACCOUNT_AGE_DAYS) {
          if (logChannel) {
            await logChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xFF0000)
                  .setTitle('⚠️ Verification Failed — Account Too New')
                  .addFields(
                    { name: 'User', value: `${target.user.tag} (<@${target.id}>)`, inline: true },
                    { name: 'Account Age', value: `${accountAgeDays.toFixed(1)} days`, inline: true },
                    { name: 'Required', value: `${config.MIN_ACCOUNT_AGE_DAYS} days`, inline: true }
                  )
                  .setTimestamp()
              ]
            });
          }
          return;
        }

        for (const roleId of config.VERIFIED_ROLE_IDS) {
          if (!target.roles.cache.has(roleId)) {
            await target.roles.add(roleId);
          }
        }

        if (target.roles.cache.has(config.UNVERIFIED_ROLE_ID)) {
          await target.roles.remove(config.UNVERIFIED_ROLE_ID);
        }

        console.log(`Verified ${target.user.tag} by ${reactor.user.tag}`);

        if (logChannel) {
          await logChannel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Member Verified')
                .addFields(
                  { name: 'User', value: `${target.user.tag} (<@${target.id}>)`, inline: true },
                  { name: 'Verified By', value: reactor.user.tag, inline: true },
                  { name: 'At', value: `<t:${unixTime}:F>`, inline: true }
                )
                .setTimestamp()
            ]
          });
        }
      }

      if (reaction.emoji.name === config.UNVERIFY_EMOJI) {

        const targetIsHR = config.HR_ROLE_IDS.some(roleId =>
          target.roles.cache.has(roleId)
        );
        if (targetIsHR) {
          if (logChannel) {
            await logChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xFF0000)
                  .setTitle('⚠️ Unverify Blocked')
                  .addFields(
                    { name: 'Attempted By', value: reactor.user.tag, inline: true },
                    { name: 'Target', value: `${target.user.tag} (<@${target.id}>)`, inline: true },
                    { name: 'Reason', value: 'Target is an HR member', inline: true }
                  )
                  .setTimestamp()
              ]
            });
          }
          return;
        }

        const alreadyUnverified = !config.VERIFIED_ROLE_IDS.some(roleId =>
          target.roles.cache.has(roleId)
        );
        if (alreadyUnverified) return;

        for (const roleId of config.VERIFIED_ROLE_IDS) {
          if (target.roles.cache.has(roleId)) {
            await target.roles.remove(roleId);
          }
        }

        if (!target.roles.cache.has(config.UNVERIFIED_ROLE_ID)) {
          await target.roles.add(config.UNVERIFIED_ROLE_ID);
        }

        console.log(`Unverified ${target.user.tag} by ${reactor.user.tag}`);

        if (logChannel) {
          await logChannel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🔴 Member Unverified')
                .addFields(
                  { name: 'User', value: `${target.user.tag} (<@${target.id}>)`, inline: true },
                  { name: 'Unverified By', value: reactor.user.tag, inline: true },
                  { name: 'At', value: `<t:${unixTime}:F>`, inline: true }
                )
                .setTimestamp()
            ]
          });
        }
      }

    } catch (error) {
      console.error("Error handling verification reaction:", error);
    }
  });

};