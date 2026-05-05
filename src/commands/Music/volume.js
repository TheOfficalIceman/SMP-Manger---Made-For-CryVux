import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getQueue, setVolume } from '../../services/musicService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the music volume')
    .addIntegerOption(opt =>
      opt.setName('level')
        .setDescription('Volume level (1–200)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(200)
    ),

  async execute(interaction) {
    const level = interaction.options.getInteger('level');
    const queue = getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    }

    setVolume(interaction.guildId, level);

    const bar = '█'.repeat(Math.round(level / 10)) + '░'.repeat(20 - Math.round(level / 10));

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🔊 Volume Updated')
        .setDescription(`\`${bar}\` **${level}%**`)],
    });
  },
};
