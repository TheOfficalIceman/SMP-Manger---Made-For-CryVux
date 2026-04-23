import { Events, EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getLevelingConfig, getUserLevelData } from '../services/leveling.js';
import { addXp } from '../services/xpSystem.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { isOwner } from '../utils/permissionGuard.js';
import * as saveserver from '../commands/Minecraft/saveserver.js';
import * as loadserver from '../commands/Minecraft/loadserver.js';
import * as serverstatus from '../commands/Minecraft/serverstatus.js';
import * as admin from '../commands/Admin/admin.js';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CUSTOM_COMMANDS_FILE = path.join(__dirname, '../../data/custom-commands.json');

const PREFIX = '!';
const MESSAGE_XP_RATE_LIMIT_ATTEMPTS = 12;
const MESSAGE_XP_RATE_LIMIT_WINDOW_MS = 10000;

const BUILT_IN_PREFIX_COMMANDS = new Map([
  ['saveserver', saveserver],
  ['loadserver', loadserver],
  ['serverstatus', serverstatus],
  ['admin', admin],
]);

function loadCustomCommands() {
  try {
    if (!existsSync(CUSTOM_COMMANDS_FILE)) return [];
    return JSON.parse(readFileSync(CUSTOM_COMMANDS_FILE, 'utf8'));
  } catch { return []; }
}

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      if (message.author.bot) return;

      if (message.content.startsWith(PREFIX)) {
        await handlePrefixCommand(message, client);
        return;
      }

      if (message.guild) await handleLeveling(message, client);
    } catch (error) {
      logger.error('Error in messageCreate event:', error);
    }
  }
};

async function handlePrefixCommand(message, client) {
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const builtIn = BUILT_IN_PREFIX_COMMANDS.get(commandName);
  if (builtIn) {
    try {
      await builtIn.execute(message, args, client);
    } catch (error) {
      logger.error(`Error executing prefix command !${commandName}:`, error);
      await message.reply('❌ An error occurred while running that command.').catch(() => {});
    }
    return;
  }

  const customCommands = loadCustomCommands();
  const custom = customCommands.find(c => c.name.toLowerCase() === commandName);
  if (!custom) return;

  try {
    if (custom.ownerOnly && !isOwner(message.author)) {
      return message.reply('❌ Only the bot owner can use this command.');
    }

    const replacePlaceholders = (str) =>
      str.replace(/\{user\}/g, `<@${message.author.id}>`)
         .replace(/\{server\}/g, message.guild.name)
         .replace(/\{memberCount\}/g, message.guild.memberCount.toString())
         .replace(/\{author\}/g, message.author.tag);

    if (custom.useEmbed) {
      const embed = new EmbedBuilder()
        .setColor(custom.embedColor || '#5865F2');
      if (custom.embedTitle) embed.setTitle(replacePlaceholders(custom.embedTitle));
      if (custom.embedDescription) embed.setDescription(replacePlaceholders(custom.embedDescription));
      if (custom.embedFooter) embed.setFooter({ text: replacePlaceholders(custom.embedFooter) });
      await message.reply({ embeds: [embed] });
    } else {
      await message.reply(replacePlaceholders(custom.response));
    }
  } catch (error) {
    logger.error(`Error executing custom command !${commandName}:`, error);
    await message.reply('❌ An error occurred while running that command.').catch(() => {});
  }
}

async function handleLeveling(message, client) {
  try {
    const rateLimitKey = `xp-event:${message.guild.id}:${message.author.id}`;
    const canProcess = await checkRateLimit(rateLimitKey, MESSAGE_XP_RATE_LIMIT_ATTEMPTS, MESSAGE_XP_RATE_LIMIT_WINDOW_MS);
    if (!canProcess) {
      return;
    }

    const levelingConfig = await getLevelingConfig(client, message.guild.id);
    
    if (!levelingConfig?.enabled) {
      return;
    }

    if (levelingConfig.ignoredChannels?.includes(message.channel.id)) {
      return;
    }

    if (levelingConfig.ignoredRoles?.length > 0) {
      const member = await message.guild.members.fetch(message.author.id).catch(() => {
        return null;
      });
      if (member && member.roles.cache.some(role => levelingConfig.ignoredRoles.includes(role.id))) {
        return;
      }
    }

    if (levelingConfig.blacklistedUsers?.includes(message.author.id)) {
      return;
    }

    if (!message.content || message.content.trim().length === 0) {
      return;
    }

    const userData = await getUserLevelData(client, message.guild.id, message.author.id);
    
    const cooldownTime = levelingConfig.xpCooldown || 60;
    const now = Date.now();
    const timeSinceLastMessage = now - (userData.lastMessage || 0);
    
    if (timeSinceLastMessage < cooldownTime * 1000) {
      return;
    }

    const minXP = levelingConfig.xpRange?.min || levelingConfig.xpPerMessage?.min || 15;
    const maxXP = levelingConfig.xpRange?.max || levelingConfig.xpPerMessage?.max || 25;

    const safeMinXP = Math.max(1, minXP);
    const safeMaxXP = Math.max(safeMinXP, maxXP);

    const xpToGive = Math.floor(Math.random() * (safeMaxXP - safeMinXP + 1)) + safeMinXP;

    let finalXP = xpToGive;
    if (levelingConfig.xpMultiplier && levelingConfig.xpMultiplier > 1) {
      finalXP = Math.floor(finalXP * levelingConfig.xpMultiplier);
    }

    const result = await addXp(client, message.guild, message.member, finalXP);
    
    if (result.success && result.leveledUp) {
      logger.info(
        `${message.author.tag} leveled up to level ${result.level} in ${message.guild.name}`
      );
    }
  } catch (error) {
    logger.error('Error handling leveling for message:', error);
  }
}
