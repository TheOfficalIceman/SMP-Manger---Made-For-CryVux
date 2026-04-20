import { logger } from '../../utils/logger.js';
import { isOwner } from '../../utils/permissionGuard.js';

export const prefixData = {
  name: 'saveserver',
  description: 'Save a Minecraft server address for this guild. Owner only.',
  usage: '!saveserver <ip[:port]>',
  ownerOnly: true,
};

export async function execute(message, args, client) {
  if (!isOwner(message.author)) {
    return message.reply('❌ Only the bot owner can use this command.');
  }

  if (!args.length) {
    return message.reply(`❌ Please provide a server address.\nUsage: \`!saveserver <ip[:port]>\``);
  }

  const address = args[0].trim();
  const [host, portStr] = address.split(':');
  const port = portStr ? parseInt(portStr, 10) : 25565;

  if (!host) {
    return message.reply('❌ Invalid server address. Example: `!saveserver play.example.com:25565`');
  }

  if (portStr && (isNaN(port) || port < 1 || port > 65535)) {
    return message.reply('❌ Invalid port number. Must be between 1 and 65535.');
  }

  try {
    const key = `guild:${message.guild.id}:minecraft:server`;
    await client.db.set(key, { host, port, savedAt: new Date().toISOString(), savedBy: message.author.id });

    return message.reply(`✅ Minecraft server saved!\n**Address:** \`${host}:${port}\`\n\nUse \`!serverstatus\` to check it anytime.`);
  } catch (error) {
    logger.error('Error in saveserver command:', error);
    return message.reply('❌ Failed to save server. Please try again.');
  }
}
