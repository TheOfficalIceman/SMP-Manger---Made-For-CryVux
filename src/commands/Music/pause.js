import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pauseQueue } from '../../services/musicService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current song'),

  async execute(interaction) {
    const paused = pauseQueue(interaction.guildId);
    if (!paused) {
      return interaction.reply({ content: '❌ Nothing is playing or already paused.', ephemeral: true });
    }

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xf5c542)
        .setTitle('⏸️ Paused')
        .setDescription('Use `/resume` to continue playing.')],
    });
  },
};
