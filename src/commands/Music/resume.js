import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { resumeQueue } from '../../services/musicService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume a paused song'),

  async execute(interaction) {
    const resumed = resumeQueue(interaction.guildId);
    if (!resumed) {
      return interaction.reply({ content: '❌ Nothing is paused right now.', ephemeral: true });
    }

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x23d160)
        .setTitle('▶️ Resumed')
        .setDescription('Music is playing again!')],
    });
  },
};
