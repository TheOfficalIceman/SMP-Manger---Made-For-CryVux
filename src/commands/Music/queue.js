import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getQueue } from '../../services/musicService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue'),

  async execute(interaction) {
    const queue = getQueue(interaction.guildId);
    if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
      return interaction.reply({ content: '❌ The queue is empty.', ephemeral: true });
    }

    const lines = [];
    if (queue.currentTrack) {
      lines.push(`**Now Playing:**\n🎵 [${queue.currentTrack.title}](${queue.currentTrack.url}) — <@${queue.currentTrack.requestedBy}>`);
    }

    if (queue.tracks.length > 0) {
      const upcoming = queue.tracks.slice(0, 10).map((t, i) =>
        `\`${i + 1}.\` [${t.title}](${t.url}) — <@${t.requestedBy}>`
      ).join('\n');

      lines.push(`\n**Up Next (${queue.tracks.length} track${queue.tracks.length !== 1 ? 's' : ''}):**\n${upcoming}`);

      if (queue.tracks.length > 10) {
        lines.push(`\n*...and ${queue.tracks.length - 10} more*`);
      }
    }

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📋 Music Queue')
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Volume: ${queue.volume}% • ${queue.paused ? 'Paused' : 'Playing'}` })],
    });
  },
};
