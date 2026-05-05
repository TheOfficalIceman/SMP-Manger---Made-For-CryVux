import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  joinVoiceChannel,
  StreamType,
} from '@discordjs/voice';
import playdl from 'play-dl';
import { EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';

const queues = new Map();

class GuildQueue {
  constructor(guildId) {
    this.guildId = guildId;
    this.tracks = [];
    this.currentTrack = null;
    this.connection = null;
    this.textChannel = null;
    this.volume = 100;
    this.paused = false;
    this.leaveTimer = null;

    this.player = createAudioPlayer();

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.currentTrack = null;
      this._schedulePlayNext();
    });

    this.player.on('error', err => {
      logger.error(`[Music] Player error in ${guildId}: ${err.message}`);
      this.currentTrack = null;
      this._schedulePlayNext();
    });
  }

  _schedulePlayNext() {
    if (this.tracks.length > 0) {
      this.playNext();
    } else {
      this._startLeaveTimer();
    }
  }

  _startLeaveTimer() {
    if (this.leaveTimer) clearTimeout(this.leaveTimer);
    this.leaveTimer = setTimeout(() => {
      if (!this.currentTrack && this.tracks.length === 0) {
        if (this.textChannel) {
          this.textChannel.send({ content: '👋 Queue finished — leaving voice channel.' }).catch(() => {});
        }
        this.destroy();
      }
    }, 30_000);
  }

  async playNext() {
    if (this.leaveTimer) { clearTimeout(this.leaveTimer); this.leaveTimer = null; }
    if (this.tracks.length === 0) { this._startLeaveTimer(); return; }

    const track = this.tracks.shift();
    this.currentTrack = track;

    try {
      const stream = await playdl.stream(track.url, { quality: 2 });
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true,
      });
      resource.volume?.setVolume(this.volume / 100);
      this.player.play(resource);

      if (this.textChannel) {
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🎵 Now Playing')
          .setDescription(`**[${track.title}](${track.url})**`)
          .addFields(
            { name: 'Duration', value: track.duration || 'Unknown', inline: true },
            { name: 'Requested by', value: `<@${track.requestedBy}>`, inline: true },
          );
        if (track.thumbnail) embed.setThumbnail(track.thumbnail);
        this.textChannel.send({ embeds: [embed] }).catch(() => {});
      }
    } catch (err) {
      logger.error(`[Music] Stream error for "${track.title}": ${err.message}`);
      if (this.textChannel) {
        this.textChannel.send({ content: `❌ Failed to play **${track.title}** — skipping.` }).catch(() => {});
      }
      this._schedulePlayNext();
    }
  }

  destroy() {
    if (this.leaveTimer) clearTimeout(this.leaveTimer);
    try { this.player.stop(true); } catch {}
    try { this.connection?.destroy(); } catch {}
    this.connection = null;
    queues.delete(this.guildId);
  }
}

export function getQueue(guildId) {
  return queues.get(guildId) || null;
}

export async function addTrack(guildId, voiceChannel, textChannel, query, requestedBy) {
  let info;
  try {
    const isYtUrl = playdl.yt_validate(query);
    if (isYtUrl === 'video') {
      const details = await playdl.video_info(query);
      const v = details.video_details;
      info = { title: v.title, url: v.url, duration: v.durationRaw, thumbnail: v.thumbnails?.[0]?.url };
    } else {
      const results = await playdl.search(query, { source: { youtube: 'video' }, limit: 1 });
      if (!results.length) throw new Error('No results found for: ' + query);
      const v = results[0];
      info = { title: v.title, url: v.url, duration: v.durationRaw, thumbnail: v.thumbnails?.[0]?.url };
    }
  } catch (err) {
    throw new Error('Could not find: ' + query + (err.message ? ' — ' + err.message : ''));
  }

  const track = { ...info, requestedBy };

  let queue = queues.get(guildId);
  const isNew = !queue;

  if (isNew) {
    queue = new GuildQueue(guildId);
    queues.set(guildId, queue);
    queue.textChannel = textChannel;

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });
    queue.connection = connection;
    connection.subscribe(queue.player);

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    } catch {
      queue.destroy();
      throw new Error('Failed to connect to voice channel — try again.');
    }

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        queue.destroy();
      }
    });
  }

  queue.tracks.push(track);

  if (isNew || queue.player.state.status === AudioPlayerStatus.Idle) {
    queue.playNext();
  }

  return { track, position: isNew ? 0 : queue.tracks.length, isNew };
}

export function skipTrack(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return false;
  queue.player.stop();
  return true;
}

export function stopQueue(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return false;
  queue.tracks = [];
  queue.player.stop(true);
  queue.destroy();
  return true;
}

export function pauseQueue(guildId) {
  const queue = queues.get(guildId);
  if (!queue || queue.paused) return false;
  queue.player.pause();
  queue.paused = true;
  return true;
}

export function resumeQueue(guildId) {
  const queue = queues.get(guildId);
  if (!queue || !queue.paused) return false;
  queue.player.unpause();
  queue.paused = false;
  return true;
}

export function setVolume(guildId, vol) {
  const queue = queues.get(guildId);
  if (!queue) return false;
  queue.volume = Math.max(1, Math.min(200, vol));
  const resource = queue.player.state?.resource;
  if (resource?.volume) resource.volume.setVolume(queue.volume / 100);
  return true;
}
