import { ChannelType } from 'discord.js';
import { logger } from '../utils/logger.js';

export async function captureServerSnapshot(guild) {
  const snapshot = {
    capturedAt: new Date().toISOString(),
    guildId: guild.id,
    guild: {
      name: guild.name,
      description: guild.description,
      icon: guild.iconURL({ size: 256 }),
      verificationLevel: guild.verificationLevel,
      explicitContentFilter: guild.explicitContentFilter,
      defaultMessageNotifications: guild.defaultMessageNotifications,
      afkTimeout: guild.afkTimeout,
    },
    roles: [],
    categories: [],
    channels: [],
  };

  const roles = [...guild.roles.cache.values()]
    .filter(r => !r.managed && r.id !== guild.roles.everyone.id)
    .sort((a, b) => a.position - b.position);

  for (const role of roles) {
    snapshot.roles.push({
      id: role.id,
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      mentionable: role.mentionable,
      permissions: role.permissions.bitfield.toString(),
      position: role.position,
    });
  }

  const categories = [...guild.channels.cache.values()]
    .filter(c => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);

  for (const cat of categories) {
    snapshot.categories.push({
      id: cat.id,
      name: cat.name,
      position: cat.position,
      permissionOverwrites: [...cat.permissionOverwrites.cache.values()].map(po => ({
        id: po.id,
        type: po.type,
        allow: po.allow.bitfield.toString(),
        deny: po.deny.bitfield.toString(),
      })),
    });
  }

  const channels = [...guild.channels.cache.values()]
    .filter(c => c.type !== ChannelType.GuildCategory)
    .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));

  for (const ch of channels) {
    const entry = {
      id: ch.id,
      name: ch.name,
      type: ch.type,
      position: ch.rawPosition,
      parentId: ch.parentId,
      parentName: ch.parent?.name ?? null,
      permissionOverwrites: ch.permissionOverwrites
        ? [...ch.permissionOverwrites.cache.values()].map(po => ({
            id: po.id,
            type: po.type,
            allow: po.allow.bitfield.toString(),
            deny: po.deny.bitfield.toString(),
          }))
        : [],
    };

    if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
      entry.topic = ch.topic ?? null;
      entry.nsfw = ch.nsfw ?? false;
      entry.rateLimitPerUser = ch.rateLimitPerUser ?? 0;
    }

    if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) {
      entry.bitrate = ch.bitrate ?? 64000;
      entry.userLimit = ch.userLimit ?? 0;
    }

    snapshot.channels.push(entry);
  }

  return snapshot;
}

export async function restoreServerSnapshot(guild, snapshot) {
  const results = { created: [], updated: [], skipped: [], errors: [] };

  const add = (type, name, detail = '') => results[type].push({ name, detail });

  for (const roleData of snapshot.roles ?? []) {
    try {
      const existing = guild.roles.cache.find(r => r.name === roleData.name && !r.managed);
      if (existing) {
        await existing.edit({
          color: roleData.color,
          hoist: roleData.hoist,
          mentionable: roleData.mentionable,
          permissions: BigInt(roleData.permissions),
        });
        add('updated', `Role: ${roleData.name}`);
      } else {
        await guild.roles.create({
          name: roleData.name,
          color: roleData.color,
          hoist: roleData.hoist,
          mentionable: roleData.mentionable,
          permissions: BigInt(roleData.permissions),
          reason: 'Server snapshot restore',
        });
        add('created', `Role: ${roleData.name}`);
      }
    } catch (err) {
      logger.error(`Snapshot restore - role ${roleData.name}:`, err);
      add('errors', `Role: ${roleData.name}`, err.message);
    }
  }

  const categoryMap = new Map();
  for (const catData of snapshot.categories ?? []) {
    try {
      const existing = guild.channels.cache.find(
        c => c.name.toLowerCase() === catData.name.toLowerCase() && c.type === ChannelType.GuildCategory
      );
      if (existing) {
        add('skipped', `Category: ${catData.name}`, 'already exists');
        categoryMap.set(catData.name, existing.id);
      } else {
        const created = await guild.channels.create({
          name: catData.name,
          type: ChannelType.GuildCategory,
          position: catData.position,
          reason: 'Server snapshot restore',
        });
        add('created', `Category: ${catData.name}`);
        categoryMap.set(catData.name, created.id);
      }
    } catch (err) {
      logger.error(`Snapshot restore - category ${catData.name}:`, err);
      add('errors', `Category: ${catData.name}`, err.message);
    }
  }

  for (const chData of snapshot.channels ?? []) {
    try {
      const existing = guild.channels.cache.find(
        c => c.name.toLowerCase() === chData.name.toLowerCase() && c.type === chData.type
      );
      if (existing) {
        add('skipped', `#${chData.name}`, 'already exists');
        continue;
      }

      const parentId = chData.parentName ? categoryMap.get(chData.parentName) ?? null : null;

      const opts = {
        name: chData.name,
        type: chData.type,
        parent: parentId,
        reason: 'Server snapshot restore',
      };

      if (chData.topic) opts.topic = chData.topic;
      if (chData.nsfw !== undefined) opts.nsfw = chData.nsfw;
      if (chData.rateLimitPerUser) opts.rateLimitPerUser = chData.rateLimitPerUser;
      if (chData.bitrate) opts.bitrate = chData.bitrate;
      if (chData.userLimit) opts.userLimit = chData.userLimit;

      await guild.channels.create(opts);
      add('created', `#${chData.name}`);
    } catch (err) {
      logger.error(`Snapshot restore - channel ${chData.name}:`, err);
      add('errors', `#${chData.name}`, err.message);
    }
  }

  return results;
}
