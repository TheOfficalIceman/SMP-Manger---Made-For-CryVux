import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getQueue, skipTrack } from '../../services/musicService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),

  async execute(interaction) {
    const queue = getQueue(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    }

    const skipped = queue.currentTrack.title;
    skipTrack(interaction.guildId);

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xf5c542)
        .setTitle('⏭️ Skipped')
        .setDescription(`**${skipped}**`)
        .setFooter({ text: `Skipped by ${interaction.user.tag}` })],
    });
  },
};
