import { status } from 'minecraft-server-util';
import { logger } from '../../utils/logger.js';

export const prefixData = {
  name: 'serverstatus',
  description: 'Show live Minecraft server status, auto-updating every 10 seconds.',
  usage: '!serverstatus [ip[:port]]',
  ownerOnly: false,
};

const activeStatusMessages = new Map();

function buildStatusEmbed(serverInfo, host, port, attempt) {
  const online = serverInfo !== null;

  if (online) {
    const players = serverInfo.players;
    const motd = serverInfo.motd?.clean?.replace(/\n/g, ' ').trim() || 'N/A';
    const version = serverInfo.version?.name || 'Unknown';
    const playerList = players?.sample?.map(p => p.name).join(', ') || null;

    return (
      `🟢 **Server Online** — \`${host}:${port}\`\n` +
      `**MOTD:** ${motd}\n` +
      `**Version:** ${version}\n` +
      `**Players:** ${players?.online ?? 0}/${players?.max ?? 0}${playerList ? `\n**Online:** ${playerList}` : ''}\n` +
      `\n*Last updated: ${new Date().toLocaleTimeString()} (refreshes every 10s)* • Attempt #${attempt}`
    );
  } else {
    return (
      `🔴 **Server Offline** — \`${host}:${port}\`\n` +
      `Could not reach the server.\n\n` +
      `*Last updated: ${new Date().toLocaleTimeString()} (refreshes every 10s)* • Attempt #${attempt}`
    );
  }
}

async function pingServer(host, port) {
  try {
    const result = await status(host, port, { timeout: 5000 });
    return result;
  } catch {
    return null;
  }
}

export async function execute(message, args, client) {
  let host, port;

  if (args.length > 0) {
    const [h, p] = args[0].split(':');
    host = h;
    port = p ? parseInt(p, 10) : 25565;
    if (!host || (p && isNaN(port))) {
      return message.reply('❌ Invalid address. Example: `!serverstatus play.example.com:25565`');
    }
  } else {
    try {
      const key = `guild:${message.guild.id}:minecraft:server`;
      const saved = await client.db.get(key);
      if (!saved) {
        return message.reply('❌ No server saved. Use `!saveserver <ip[:port]>` first, or provide an address: `!serverstatus play.example.com`');
      }
      host = saved.host;
      port = saved.port;
    } catch (error) {
      logger.error('Error fetching saved server in serverstatus:', error);
      return message.reply('❌ Could not load saved server. Please try again or provide an address.');
    }
  }

  const channelKey = `${message.guild.id}:${message.channel.id}`;

  if (activeStatusMessages.has(channelKey)) {
    const existing = activeStatusMessages.get(channelKey);
    clearInterval(existing.interval);
    activeStatusMessages.delete(channelKey);
    try { await existing.statusMsg.edit(existing.statusMsg.content + '\n\n*(Stopped — new status started)*'); } catch { /* ignore */ }
  }

  const initialData = await pingServer(host, port);
  let attempt = 1;

  let statusMsg;
  try {
    statusMsg = await message.reply(buildStatusEmbed(initialData, host, port, attempt));
  } catch (error) {
    logger.error('Error sending serverstatus message:', error);
    return;
  }

  const interval = setInterval(async () => {
    attempt++;
    try {
      const entry = activeStatusMessages.get(channelKey);
      if (!entry) return;

      const data = await pingServer(host, port);
      await statusMsg.edit(buildStatusEmbed(data, host, port, attempt));

      if (attempt >= 18) {
        clearInterval(interval);
        activeStatusMessages.delete(channelKey);
        await statusMsg.edit(buildStatusEmbed(data, host, port, attempt) + '\n\n*(Auto-refresh stopped after 3 minutes. Run `!serverstatus` again to restart.)*');
      }
    } catch (error) {
      logger.error('Error updating serverstatus message:', error);
      clearInterval(interval);
      activeStatusMessages.delete(channelKey);
    }
  }, 10000);

  activeStatusMessages.set(channelKey, { interval, statusMsg, host, port });
}
