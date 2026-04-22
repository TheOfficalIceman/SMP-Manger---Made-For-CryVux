import { logger } from '../../utils/logger.js';
import { isOwner } from '../../utils/permissionGuard.js';
import { captureServerSnapshot } from '../../services/serverSnapshotService.js';

export const prefixData = {
  name: 'saveserver',
  description: 'Save a snapshot of the entire Discord server (channels, roles, categories). Owner only.',
  usage: '!saveserver',
  ownerOnly: true,
};

export async function execute(message, args, client) {
  if (!isOwner(message.author)) {
    return message.reply('❌ Only the bot owner can use this command.');
  }

  const statusMsg = await message.reply('⏳ Capturing server snapshot... please wait.');

  try {
    const guild = message.guild;
    await guild.members.fetch();
    await guild.channels.fetch();
    await guild.roles.fetch();

    const snapshot = await captureServerSnapshot(guild);
    const key = `global:server:snapshot`;
    await client.db.set(key, snapshot);

    const roleCount = snapshot.roles.length;
    const catCount = snapshot.categories.length;
    const chCount = snapshot.channels.length;

    await statusMsg.edit(
      `✅ **Server snapshot saved!**\n\n` +
      `📋 **Snapshot Summary:**\n` +
      `• 🎭 **Roles saved:** ${roleCount}\n` +
      `• 📁 **Categories saved:** ${catCount}\n` +
      `• 💬 **Channels saved:** ${chCount}\n\n` +
      `📅 **Saved at:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
      `Use \`!loadserver\` to restore this snapshot at any time.`
    );
  } catch (error) {
    logger.error('Error in saveserver command:', error);
    await statusMsg.edit('❌ Failed to capture server snapshot. Check bot permissions and try again.').catch(() => {});
  }
}
