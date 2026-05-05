import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getQueue, stopQueue } from '../../services/musicService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop music and clear the queue'),

  async execute(interaction) {
    const queue = getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    }

    stopQueue(interaction.guildId);

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('⏹️ Stopped')
        .setDescription('Music stopped and queue cleared.')
        .setFooter({ text: `Stopped by ${interaction.user.tag}` })],
    });
  },
};
