import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { isOwner } from '../../utils/permissionGuard.js';
import { sendAdminPanel } from '../../handlers/adminDashboard.js';
import { logger } from '../../utils/logger.js';

// ─── Slash command (/admin) ───────────────────────────────────────────────────

export default {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Open the interactive SMP Manager admin dashboard. Owner only.'),

  async execute(interaction) {
    if (!isOwner(interaction.user)) {
      return interaction.reply({
        content: '❌ Only the bot owner can access the admin dashboard.',
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await sendAdminPanel(interaction, interaction.client);
    } catch (error) {
      logger.error('Error opening admin dashboard via slash command:', error);
      await interaction.reply({
        content: '❌ Failed to open the admin dashboard. Check bot permissions.',
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  },
};

// ─── Prefix command (!admin) ──────────────────────────────────────────────────

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
    logger.error('Error opening admin dashboard via prefix command:', error);
    await message.reply('❌ Failed to open the admin dashboard. Check bot permissions.').catch(() => {});
  }
}
