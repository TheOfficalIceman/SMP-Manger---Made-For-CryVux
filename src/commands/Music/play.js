import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { addTrack } from '../../services/musicService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption(opt =>
      opt.setName('query').setDescription('Song name or YouTube URL').setRequired(true)
    ),

  async execute(interaction) {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '❌ You need to be in a voice channel first!', ephemeral: true });
    }

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    try {
      const { track, position, isNew } = await addTrack(
        interaction.guildId,
        voiceChannel,
        interaction.channel,
        query,
        interaction.user.id,
      );

      const embed = new EmbedBuilder().setColor(0x5865f2);
      if (track.thumbnail) embed.setThumbnail(track.thumbnail);

      if (isNew) {
        embed.setTitle('🎵 Now Playing')
          .setDescription(`**[${track.title}](${track.url})**`)
          .addFields(
            { name: 'Duration', value: track.duration || 'Unknown', inline: true },
            { name: 'Voice Channel', value: voiceChannel.name, inline: true },
          );
      } else {
        embed.setTitle('➕ Added to Queue')
          .setDescription(`**[${track.title}](${track.url})**`)
          .addFields(
            { name: 'Duration', value: track.duration || 'Unknown', inline: true },
            { name: 'Position in Queue', value: `#${position}`, inline: true },
          );
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `❌ ${err.message}` });
    }
  },
};
