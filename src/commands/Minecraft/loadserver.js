import { logger } from '../../utils/logger.js';
import { isOwner } from '../../utils/permissionGuard.js';
import { restoreServerSnapshot } from '../../services/serverSnapshotService.js';

export const prefixData = {
  name: 'loadserver',
  description: 'Restore the Discord server from a saved snapshot. Owner only.',
  usage: '!loadserver',
  ownerOnly: true,
};

export async function execute(message, args, client) {
  if (!isOwner(message.author)) {
    return message.reply('❌ Only the bot owner can use this command.');
  }

  const key = `global:server:snapshot`;
  const snapshot = await client.db.get(key);

  if (!snapshot) {
    return message.reply(
      '❌ No server snapshot found.\nUse `!saveserver` first to save the current server structure.'
    );
  }

  const savedAt = new Date(snapshot.capturedAt).toLocaleString();
  const statusMsg = await message.reply(
    `⏳ **Restoring server snapshot from ${savedAt}...**\n` +
    `This may take a moment. Roles → Categories → Channels.`
  );

  try {
    const guild = message.guild;
    await guild.channels.fetch();
    await guild.roles.fetch();

    const results = await restoreServerSnapshot(guild, snapshot);

    const lines = [];

    if (results.created.length) {
      lines.push(`✅ **Created (${results.created.length}):**`);
      results.created.slice(0, 15).forEach(r => lines.push(`  • ${r.name}`));
      if (results.created.length > 15) lines.push(`  • …and ${results.created.length - 15} more`);
    }

    if (results.updated.length) {
      lines.push(`🔄 **Updated (${results.updated.length}):**`);
      results.updated.slice(0, 10).forEach(r => lines.push(`  • ${r.name}`));
      if (results.updated.length > 10) lines.push(`  • …and ${results.updated.length - 10} more`);
    }

    if (results.skipped.length) {
      lines.push(`⏭️ **Skipped (${results.skipped.length}):** already exist`);
    }

    if (results.errors.length) {
      lines.push(`❌ **Errors (${results.errors.length}):**`);
      results.errors.slice(0, 5).forEach(r => lines.push(`  • ${r.name}: ${r.detail}`));
    }

    if (!lines.length) lines.push('Nothing to restore — server already matches the snapshot.');

    await statusMsg.edit(
      `✅ **Server snapshot restored!**\n\n${lines.join('\n')}`
    );
  } catch (error) {
    logger.error('Error in loadserver command:', error);
    await statusMsg.edit('❌ Failed to restore snapshot. Check bot permissions and try again.').catch(() => {});
  }
}
