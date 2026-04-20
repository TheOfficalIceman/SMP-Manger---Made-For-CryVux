import { logger } from '../../utils/logger.js';
import { isOwner } from '../../utils/permissionGuard.js';

export const prefixData = {
  name: 'loadserver',
  description: 'Load and display the saved Minecraft server for this guild. Owner only.',
  usage: '!loadserver',
  ownerOnly: true,
};

export async function execute(message, args, client) {
  if (!isOwner(message.author)) {
    return message.reply('❌ Only the bot owner can use this command.');
  }

  try {
    const key = `guild:${message.guild.id}:minecraft:server`;
    const server = await client.db.get(key);

    if (!server) {
      return message.reply('❌ No server saved yet. Use `!saveserver <ip[:port]>` to save one.');
    }

    const savedDate = new Date(server.savedAt).toLocaleString();

    return message.reply(
      `📦 **Saved Minecraft Server**\n` +
      `**Address:** \`${server.host}:${server.port}\`\n` +
      `**Saved:** ${savedDate}\n\n` +
      `Use \`!serverstatus\` to check its live status.`
    );
  } catch (error) {
    logger.error('Error in loadserver command:', error);
    return message.reply('❌ Failed to load server data. Please try again.');
  }
}
