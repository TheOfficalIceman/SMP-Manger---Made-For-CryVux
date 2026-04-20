import { isOwner } from '../../utils/permissionGuard.js';
import { sendAdminPanel } from '../../handlers/adminDashboard.js';
import { logger } from '../../utils/logger.js';

export const prefixData = {
  name: 'admin',
  description: 'Open the interactive admin dashboard. Owner only.',
  usage: '!admin',
  ownerOnly: true,
};

export async function execute(message, args, client) {
  if (!isOwner(message.author)) {
    return message.reply('❌ Only the bot owner can access the admin dashboard.');
  }

  try {
    await sendAdminPanel(message, client);
  } catch (error) {
    logger.error('Error opening admin dashboard:', error);
    await message.reply('❌ Failed to open the admin dashboard. Check bot permissions.').catch(() => {});
  }
}
