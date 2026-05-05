import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getQueue } from '../../services/musicService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show what song is currently playing'),

  async execute(interaction) {
    const queue = getQueue(interaction.guildId);
    if (!queue?.currentTrack) {
      return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    }

    const track = queue.currentTrack;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎵 Now Playing')
      .setDescription(`**[${track.title}](${track.url})**`)
      .addFields(
        { name: 'Duration', value: track.duration || 'Unknown', inline: true },
        { name: 'Requested by', value: `<@${track.requestedBy}>`, inline: true },
        { name: 'Volume', value: `${queue.volume}%`, inline: true },
        { name: 'Status', value: queue.paused ? '⏸️ Paused' : '▶️ Playing', inline: true },
        { name: 'In Queue', value: `${queue.tracks.length} song${queue.tracks.length !== 1 ? 's' : ''}`, inline: true },
      );

    if (track.thumbnail) embed.setThumbnail(track.thumbnail);

    await interaction.reply({ embeds: [embed] });
  },
};
