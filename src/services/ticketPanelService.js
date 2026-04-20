import { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from '../utils/logger.js';

const ACCENT = 0x5865F2;

export async function createTicketWithPanel(interaction, client, panel) {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  const user = interaction.user;

  try {
    const openKey = `guild:${guild.id}:ticket:open:${user.id}:${panel.panelId}`;
    const openTickets = (await client.db.get(openKey)) || [];
    const max = panel.maxTicketsPerUser || 3;

    if (openTickets.length >= max) {
      return interaction.editReply({
        content: `❌ You already have **${openTickets.length}** open ticket(s) for this panel. Please close existing ones first.`,
      });
    }

    const counterKey = `guild:${guild.id}:ticket:counter:${panel.panelId}`;
    const count = ((await client.db.get(counterKey)) || 0) + 1;
    await client.db.set(counterKey, count);

    const channelName = `ticket-${String(count).padStart(3, '0')}-${user.username}`.slice(0, 100);

    const overwrites = [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
      },
    ];

    if (panel.staffRoleId) {
      overwrites.push({
        id: panel.staffRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
      });
    }

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: panel.categoryId || null,
      permissionOverwrites: overwrites,
      reason: `Ticket opened by ${user.tag}`,
    });

    openTickets.push(channel.id);
    await client.db.set(openKey, openTickets);

    const ticketKey = `guild:${guild.id}:ticket:${channel.id}`;
    await client.db.set(ticketKey, {
      id: channel.id,
      userId: user.id,
      guildId: guild.id,
      panelId: panel.panelId,
      panelName: panel.name,
      createdAt: new Date().toISOString(),
      status: 'open',
      claimedBy: null,
      priority: 'none',
    });

    const embed = new EmbedBuilder()
      .setColor(ACCENT)
      .setTitle(`🎫 ${panel.name}`)
      .setDescription(`Welcome <@${user.id}>!\nA member of staff will assist you shortly.\n\nClick **Close Ticket** when your issue is resolved.`)
      .addFields({ name: 'Opened by', value: `<@${user.id}>`, inline: true })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ticket_close`).setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
      new ButtonBuilder().setCustomId(`ticket_claim`).setLabel('Claim').setStyle(ButtonStyle.Secondary).setEmoji('🙋'),
    );

    await channel.send({ content: `<@${user.id}>${panel.staffRoleId ? ` <@&${panel.staffRoleId}>` : ''}`, embeds: [embed], components: [row] });

    await interaction.editReply({ content: `✅ Your ticket has been created: <#${channel.id}>` });
  } catch (err) {
    logger.error('Error creating panel ticket:', err);
    await interaction.editReply({ content: '❌ Failed to create ticket. Please try again.' });
  }
}
