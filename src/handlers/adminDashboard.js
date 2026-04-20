import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig, setGuildConfig } from '../services/guildConfig.js';
import { isOwner } from '../utils/permissionGuard.js';

const ACCENT = 0x5865F2;
const SUCCESS = 0x57F287;
const DANGER = 0xED4245;

function getPanelKey(guildId) {
  return `guild:${guildId}:ticket:panels`;
}

async function getPanels(client, guildId) {
  return (await client.db.get(getPanelKey(guildId))) || [];
}

async function savePanels(client, guildId, panels) {
  await client.db.set(getPanelKey(guildId), panels);
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Page renderers ───────────────────────────────────────────────────────────

function mainMenuEmbed(guild) {
  return new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle('🛠️ Admin Dashboard')
    .setDescription(
      `Welcome to the **${guild.name}** admin panel.\nSelect a category below to configure your bot.`
    )
    .addFields(
      { name: '🎫 Ticket Systems', value: 'Create and manage multiple ticket panels', inline: true },
      { name: '👋 Welcome & Goodbye', value: 'Configure join/leave messages', inline: true },
      { name: '📢 Logging', value: 'Set up audit log channels', inline: true },
      { name: '💰 Economy', value: 'View economy settings', inline: true },
      { name: '⚙️ Bot Settings', value: 'View bot configuration', inline: true },
    )
    .setFooter({ text: `${guild.name} • Admin Panel` })
    .setTimestamp();
}

function mainMenuRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('admin_nav')
      .setPlaceholder('📂 Select a category...')
      .addOptions([
        { label: 'Ticket Systems', description: 'Manage multiple ticket panels', value: 'tickets', emoji: '🎫' },
        { label: 'Welcome & Goodbye', description: 'Configure welcome messages', value: 'welcome', emoji: '👋' },
        { label: 'Logging', description: 'Set log channels', value: 'logging', emoji: '📢' },
        { label: 'Economy', description: 'View economy config', value: 'economy', emoji: '💰' },
        { label: 'Bot Settings', description: 'View bot config', value: 'settings', emoji: '⚙️' },
      ])
  );
}

async function ticketsPageEmbed(guild, client) {
  const panels = await getPanels(client, guild.id);
  const embed = new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle('🎫 Ticket Systems')
    .setFooter({ text: `${guild.name} • Admin Panel > Ticket Systems` })
    .setTimestamp();

  if (panels.length === 0) {
    embed.setDescription(
      "No ticket systems configured yet.\nClick **➕ Create New** to set up your first ticket panel."
    );
  } else {
    const lines = panels.map((p, i) => {
      const ch = guild.channels.cache.get(p.channelId);
      const role = guild.roles.cache.get(p.staffRoleId);
      const chText = ch ? `<#${ch.id}>` : `\`${p.channelId || 'unset'}\``;
      const roleText = role ? `<@&${role.id}>` : p.staffRoleId ? `\`${p.staffRoleId}\`` : 'None';
      return `**${i + 1}. ${p.name}**\nChannel: ${chText} | Staff: ${roleText} | Button: \`${p.buttonLabel}\``;
    });
    embed.setDescription(lines.join('\n\n'));
    embed.addFields({ name: `Total panels`, value: `${panels.length}`, inline: true });
  }

  return embed;
}

function ticketsRow(panels) {
  const rows = [];
  const mainRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_ticket_new').setLabel('➕ Create New').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('admin_back').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary),
  );
  rows.push(mainRow);

  if (panels.length > 0) {
    const select = new StringSelectMenuBuilder()
      .setCustomId('admin_panel_select')
      .setPlaceholder('Select a panel to manage...')
      .addOptions(panels.map(p => ({ label: p.name, value: p.panelId, description: `Button: ${p.buttonLabel}` })));
    rows.push(new ActionRowBuilder().addComponents(select));
  }

  return rows;
}

async function welcomePageEmbed(guild, client) {
  const config = await getGuildConfig(client, guild.id);
  const wCh = config.welcomeChannelId ? guild.channels.cache.get(config.welcomeChannelId) : null;
  const gCh = config.goodbyeChannelId ? guild.channels.cache.get(config.goodbyeChannelId) : null;

  return new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle('👋 Welcome & Goodbye')
    .addFields(
      { name: 'Welcome Channel', value: wCh ? `<#${wCh.id}>` : '`Not configured`', inline: true },
      { name: 'Goodbye Channel', value: gCh ? `<#${gCh.id}>` : '`Not configured`', inline: true },
      { name: 'Welcome Message', value: config.welcomeMessage ? `\`\`\`${config.welcomeMessage.slice(0, 200)}\`\`\`` : '`Default message`' },
      { name: 'Goodbye Message', value: config.goodbyeMessage ? `\`\`\`${config.goodbyeMessage.slice(0, 200)}\`\`\`` : '`Default message`' },
      { name: 'Placeholders', value: '`{user}` `{server}` `{memberCount}` `{author}`' },
    )
    .setFooter({ text: `${guild.name} • Admin Panel > Welcome` })
    .setTimestamp();
}

function welcomeRow() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_welcome_edit').setLabel('✏️ Edit Welcome').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('admin_goodbye_edit').setLabel('✏️ Edit Goodbye').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('admin_back').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary),
  )];
}

async function loggingPageEmbed(guild, client) {
  const config = await getGuildConfig(client, guild.id);
  const logCh = config.logChannelId ? guild.channels.cache.get(config.logChannelId) : null;
  const modCh = config.modLogChannelId ? guild.channels.cache.get(config.modLogChannelId) : null;

  return new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle('📢 Logging')
    .addFields(
      { name: 'General Log Channel', value: logCh ? `<#${logCh.id}>` : '`Not configured`', inline: true },
      { name: 'Moderation Log Channel', value: modCh ? `<#${modCh.id}>` : '`Not configured`', inline: true },
    )
    .setFooter({ text: `${guild.name} • Admin Panel > Logging` })
    .setTimestamp();
}

function loggingRow() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_logging_edit').setLabel('✏️ Configure Channels').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('admin_back').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary),
  )];
}

async function economyPageEmbed(guild, client) {
  const config = await getGuildConfig(client, guild.id);
  const econ = config.economy || {};
  return new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle('💰 Economy Settings')
    .addFields(
      { name: 'Starting Balance', value: `${econ.startingBalance ?? 0} coins`, inline: true },
      { name: 'Daily Reward', value: `${econ.dailyAmount ?? 100} coins`, inline: true },
      { name: 'Work Range', value: `${econ.workMin ?? 10}–${econ.workMax ?? 100} coins`, inline: true },
      { name: 'Rob Success Rate', value: `${((econ.robSuccessRate ?? 0.4) * 100).toFixed(0)}%`, inline: true },
    )
    .setDescription('Economy values are configured in `src/config/bot.js`.')
    .setFooter({ text: `${guild.name} • Admin Panel > Economy` })
    .setTimestamp();
}

async function settingsPageEmbed(guild, client) {
  return new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle('⚙️ Bot Settings')
    .addFields(
      { name: 'Bot Name', value: guild.client?.user?.username ?? 'Unknown', inline: true },
      { name: 'Bot ID', value: guild.client?.user?.id ?? 'Unknown', inline: true },
      { name: 'Guild', value: guild.name, inline: true },
      { name: 'Members', value: `${guild.memberCount}`, inline: true },
      { name: 'Prefix', value: '`!`', inline: true },
      { name: 'Commands', value: `${guild.client?.commands?.size ?? 0} slash commands`, inline: true },
    )
    .setFooter({ text: `${guild.name} • Admin Panel > Settings` })
    .setTimestamp();
}

function genericBackRow() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_back').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary),
  )];
}

// ─── Panel select handler ─────────────────────────────────────────────────────

export async function handlePanelSelect(interaction, client) {
  if (!isOwner(interaction.user)) {
    return interaction.reply({ content: '❌ Only the bot owner can use this.', ephemeral: true });
  }
  await interaction.deferUpdate();
  const panelId = interaction.values[0];
  const panels = await getPanels(client, interaction.guild.id);
  const panel = panels.find(p => p.panelId === panelId);
  if (!panel) return;

  const embed = new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle(`🎫 Panel: ${panel.name}`)
    .addFields(
      { name: 'Channel', value: panel.channelId ? `<#${panel.channelId}>` : 'Not deployed', inline: true },
      { name: 'Category', value: panel.categoryId ? `<#${panel.categoryId}>` : 'None', inline: true },
      { name: 'Staff Role', value: panel.staffRoleId ? `<@&${panel.staffRoleId}>` : 'None', inline: true },
      { name: 'Button Label', value: panel.buttonLabel, inline: true },
      { name: 'Max Tickets/User', value: `${panel.maxTicketsPerUser}`, inline: true },
      { name: 'DM on Close', value: panel.dmOnClose ? 'Yes' : 'No', inline: true },
      { name: 'Panel Message', value: `\`\`\`${panel.panelMessage.slice(0, 300)}\`\`\`` },
    )
    .setFooter({ text: `Panel ID: ${panelId}` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`admin_ticket_edit:${panelId}`).setLabel('✏️ Edit').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`admin_ticket_deploy:${panelId}`).setLabel('🚀 Deploy to Channel').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`admin_ticket_delete:${panelId}`).setLabel('🗑️ Delete').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('admin_ticket_list').setLabel('← Back to Panels').setStyle(ButtonStyle.Secondary),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export async function handleNav(interaction, client) {
  if (!isOwner(interaction.user)) {
    return interaction.reply({ content: '❌ Only the bot owner can use this.', ephemeral: true });
  }
  await interaction.deferUpdate();
  const value = interaction.values[0];
  await renderPage(interaction, client, value);
}

export async function handleBack(interaction, client) {
  if (!isOwner(interaction.user)) {
    return interaction.reply({ content: '❌ Only the bot owner can use this.', ephemeral: true });
  }
  await interaction.deferUpdate();
  await renderPage(interaction, client, 'main');
}

export async function handleTicketList(interaction, client) {
  if (!isOwner(interaction.user)) {
    return interaction.reply({ content: '❌ Only the bot owner can use this.', ephemeral: true });
  }
  await interaction.deferUpdate();
  await renderPage(interaction, client, 'tickets');
}

async function renderPage(interaction, client, page) {
  const guild = interaction.guild;

  if (page === 'main') {
    await interaction.editReply({
      embeds: [mainMenuEmbed(guild)],
      components: [mainMenuRow()],
    });
  } else if (page === 'tickets') {
    const panels = await getPanels(client, guild.id);
    await interaction.editReply({
      embeds: [await ticketsPageEmbed(guild, client)],
      components: ticketsRow(panels),
    });
  } else if (page === 'welcome') {
    await interaction.editReply({
      embeds: [await welcomePageEmbed(guild, client)],
      components: welcomeRow(),
    });
  } else if (page === 'logging') {
    await interaction.editReply({
      embeds: [await loggingPageEmbed(guild, client)],
      components: loggingRow(),
    });
  } else if (page === 'economy') {
    await interaction.editReply({
      embeds: [await economyPageEmbed(guild, client)],
      components: genericBackRow(),
    });
  } else if (page === 'settings') {
    await interaction.editReply({
      embeds: [await settingsPageEmbed(guild, client)],
      components: genericBackRow(),
    });
  }
}

// ─── Button actions ───────────────────────────────────────────────────────────

export async function handleTicketNew(interaction, client) {
  if (!isOwner(interaction.user)) {
    return interaction.reply({ content: '❌ Only the bot owner can use this.', ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId('admin_modal:ticket_create')
    .setTitle('Create Ticket Panel');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('name').setLabel('Panel Name').setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. General Support').setRequired(true).setMaxLength(50)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('message').setLabel('Panel Message (shown on the embed)')
        .setStyle(TextInputStyle.Paragraph).setPlaceholder('Click below to open a support ticket.').setRequired(true).setMaxLength(500)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('button_label').setLabel('Button Label').setStyle(TextInputStyle.Short)
        .setPlaceholder('Create Ticket').setRequired(true).setMaxLength(40)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('category_id').setLabel('Ticket Category ID (paste from Discord)')
        .setStyle(TextInputStyle.Short).setPlaceholder('Right-click category → Copy ID').setRequired(false).setMaxLength(25)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('staff_role_id').setLabel('Staff Role ID (paste from Discord)')
        .setStyle(TextInputStyle.Short).setPlaceholder('Right-click role → Copy ID').setRequired(false).setMaxLength(25)
    ),
  );

  await interaction.showModal(modal);
}

export async function handleTicketEdit(interaction, client, panelId) {
  if (!isOwner(interaction.user)) {
    return interaction.reply({ content: '❌ Only the bot owner can use this.', ephemeral: true });
  }

  const panels = await getPanels(client, interaction.guild.id);
  const panel = panels.find(p => p.panelId === panelId);
  if (!panel) return interaction.reply({ content: '❌ Panel not found.', ephemeral: true });

  const modal = new ModalBuilder()
    .setCustomId(`admin_modal:ticket_edit:${panelId}`)
    .setTitle(`Edit: ${panel.name}`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('name').setLabel('Panel Name').setStyle(TextInputStyle.Short)
        .setValue(panel.name).setRequired(true).setMaxLength(50)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('message').setLabel('Panel Message').setStyle(TextInputStyle.Paragraph)
        .setValue(panel.panelMessage).setRequired(true).setMaxLength(500)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('button_label').setLabel('Button Label').setStyle(TextInputStyle.Short)
        .setValue(panel.buttonLabel).setRequired(true).setMaxLength(40)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('category_id').setLabel('Ticket Category ID')
        .setStyle(TextInputStyle.Short).setValue(panel.categoryId || '').setRequired(false).setMaxLength(25)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('staff_role_id').setLabel('Staff Role ID')
        .setStyle(TextInputStyle.Short).setValue(panel.staffRoleId || '').setRequired(false).setMaxLength(25)
    ),
  );

  await interaction.showModal(modal);
}

export async function handleTicketDelete(interaction, client, panelId) {
  if (!isOwner(interaction.user)) {
    return interaction.reply({ content: '❌ Only the bot owner can use this.', ephemeral: true });
  }
  await interaction.deferUpdate();

  const panels = await getPanels(client, interaction.guild.id);
  const panel = panels.find(p => p.panelId === panelId);
  if (!panel) return;

  const updated = panels.filter(p => p.panelId !== panelId);
  await savePanels(client, interaction.guild.id, updated);

  const updatedPanels = await getPanels(client, interaction.guild.id);
  await interaction.editReply({
    embeds: [
      new EmbedBuilder().setColor(DANGER).setTitle('🗑️ Panel Deleted')
        .setDescription(`**${panel.name}** has been removed.\nExisting tickets in Discord are not affected.`)
        .setTimestamp(),
    ],
    components: ticketsRow(updatedPanels),
  });
}

export async function handleTicketDeploy(interaction, client, panelId) {
  if (!isOwner(interaction.user)) {
    return interaction.reply({ content: '❌ Only the bot owner can use this.', ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`admin_modal:ticket_deploy:${panelId}`)
    .setTitle('Deploy Ticket Panel');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('channel_id').setLabel('Channel ID to deploy to')
        .setStyle(TextInputStyle.Short).setPlaceholder('Right-click channel → Copy ID').setRequired(true).setMaxLength(25)
    ),
  );

  await interaction.showModal(modal);
}

export async function handleWelcomeEdit(interaction, client) {
  if (!isOwner(interaction.user)) {
    return interaction.reply({ content: '❌ Only the bot owner can use this.', ephemeral: true });
  }
  const config = await getGuildConfig(client, interaction.guild.id);

  const modal = new ModalBuilder()
    .setCustomId('admin_modal:welcome_config')
    .setTitle('Welcome Settings');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('channel_id').setLabel('Welcome Channel ID')
        .setStyle(TextInputStyle.Short).setValue(config.welcomeChannelId || '').setRequired(false).setMaxLength(25)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('message').setLabel('Welcome Message ({user} {server} {memberCount})')
        .setStyle(TextInputStyle.Paragraph).setValue(config.welcomeMessage || 'Welcome {user} to {server}!').setRequired(true).setMaxLength(500)
    ),
  );

  await interaction.showModal(modal);
}

export async function handleGoodbyeEdit(interaction, client) {
  if (!isOwner(interaction.user)) {
    return interaction.reply({ content: '❌ Only the bot owner can use this.', ephemeral: true });
  }
  const config = await getGuildConfig(client, interaction.guild.id);

  const modal = new ModalBuilder()
    .setCustomId('admin_modal:goodbye_config')
    .setTitle('Goodbye Settings');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('channel_id').setLabel('Goodbye Channel ID')
        .setStyle(TextInputStyle.Short).setValue(config.goodbyeChannelId || '').setRequired(false).setMaxLength(25)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('message').setLabel('Goodbye Message ({user} {memberCount})')
        .setStyle(TextInputStyle.Paragraph).setValue(config.goodbyeMessage || '{user} has left {server}.').setRequired(true).setMaxLength(500)
    ),
  );

  await interaction.showModal(modal);
}

export async function handleLoggingEdit(interaction, client) {
  if (!isOwner(interaction.user)) {
    return interaction.reply({ content: '❌ Only the bot owner can use this.', ephemeral: true });
  }
  const config = await getGuildConfig(client, interaction.guild.id);

  const modal = new ModalBuilder()
    .setCustomId('admin_modal:logging_config')
    .setTitle('Logging Settings');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('log_channel_id').setLabel('General Log Channel ID')
        .setStyle(TextInputStyle.Short).setValue(config.logChannelId || '').setRequired(false).setMaxLength(25)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('mod_channel_id').setLabel('Moderation Log Channel ID')
        .setStyle(TextInputStyle.Short).setValue(config.modLogChannelId || '').setRequired(false).setMaxLength(25)
    ),
  );

  await interaction.showModal(modal);
}

// ─── Modal submissions ────────────────────────────────────────────────────────

export async function handleModalSubmit(interaction, client, args) {
  const type = args[0];
  const guild = interaction.guild;

  if (type === 'ticket_create') {
    const name = interaction.fields.getTextInputValue('name').trim();
    const message = interaction.fields.getTextInputValue('message').trim();
    const buttonLabel = interaction.fields.getTextInputValue('button_label').trim() || 'Create Ticket';
    const categoryId = interaction.fields.getTextInputValue('category_id').trim() || null;
    const staffRoleId = interaction.fields.getTextInputValue('staff_role_id').trim() || null;

    const panels = await getPanels(client, guild.id);
    const newPanel = {
      panelId: genId(),
      name,
      panelMessage: message,
      buttonLabel,
      categoryId,
      staffRoleId,
      channelId: null,
      maxTicketsPerUser: 3,
      dmOnClose: true,
    };
    panels.push(newPanel);
    await savePanels(client, guild.id, panels);

    await interaction.reply({
      embeds: [
        new EmbedBuilder().setColor(SUCCESS).setTitle('✅ Ticket Panel Created')
          .setDescription(`**${name}** has been created.\n\nUse **🚀 Deploy to Channel** to publish the panel in a Discord channel.`)
          .addFields(
            { name: 'Panel ID', value: `\`${newPanel.panelId}\``, inline: true },
            { name: 'Button Label', value: buttonLabel, inline: true },
          )
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  }

  else if (type === 'ticket_edit') {
    const panelId = args[1];
    const panels = await getPanels(client, guild.id);
    const idx = panels.findIndex(p => p.panelId === panelId);
    if (idx === -1) return interaction.reply({ content: '❌ Panel not found.', ephemeral: true });

    panels[idx] = {
      ...panels[idx],
      name: interaction.fields.getTextInputValue('name').trim(),
      panelMessage: interaction.fields.getTextInputValue('message').trim(),
      buttonLabel: interaction.fields.getTextInputValue('button_label').trim() || 'Create Ticket',
      categoryId: interaction.fields.getTextInputValue('category_id').trim() || panels[idx].categoryId,
      staffRoleId: interaction.fields.getTextInputValue('staff_role_id').trim() || panels[idx].staffRoleId,
    };
    await savePanels(client, guild.id, panels);

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(SUCCESS).setTitle('✅ Panel Updated').setDescription(`**${panels[idx].name}** has been updated.`).setTimestamp()],
      ephemeral: true,
    });
  }

  else if (type === 'ticket_deploy') {
    const panelId = args[1];
    const channelId = interaction.fields.getTextInputValue('channel_id').trim();
    const panels = await getPanels(client, guild.id);
    const panel = panels.find(p => p.panelId === panelId);
    if (!panel) return interaction.reply({ content: '❌ Panel not found.', ephemeral: true });

    const channel = guild.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
      return interaction.reply({ content: '❌ Channel not found or is not a text channel.', ephemeral: true });
    }

    const botMember = guild.members.me;
    if (!channel.permissionsFor(botMember).has(PermissionFlagsBits.SendMessages)) {
      return interaction.reply({ content: '❌ I do not have permission to send messages in that channel.', ephemeral: true });
    }

    const panelEmbed = new EmbedBuilder()
      .setColor(ACCENT)
      .setTitle(`🎫 ${panel.name}`)
      .setDescription(panel.panelMessage)
      .setFooter({ text: guild.name })
      .setTimestamp();

    const panelButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`create_ticket_panel:${panel.panelId}`)
        .setLabel(panel.buttonLabel)
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫'),
    );

    await channel.send({ embeds: [panelEmbed], components: [panelButton] });

    const idx = panels.findIndex(p => p.panelId === panelId);
    panels[idx].channelId = channelId;
    await savePanels(client, guild.id, panels);

    await interaction.reply({
      embeds: [
        new EmbedBuilder().setColor(SUCCESS).setTitle('✅ Panel Deployed')
          .setDescription(`**${panel.name}** is now live in <#${channelId}>!\nUsers can click **${panel.buttonLabel}** to open a ticket.`)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  }

  else if (type === 'welcome_config') {
    const channelId = interaction.fields.getTextInputValue('channel_id').trim() || null;
    const message = interaction.fields.getTextInputValue('message').trim();
    const config = await getGuildConfig(client, guild.id);
    await setGuildConfig(client, guild.id, { ...config, welcomeChannelId: channelId, welcomeMessage: message });
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(SUCCESS).setTitle('✅ Welcome Updated')
        .addFields(
          { name: 'Channel', value: channelId ? `<#${channelId}>` : 'None', inline: true },
          { name: 'Message', value: `\`\`\`${message.slice(0, 200)}\`\`\`` },
        ).setTimestamp()],
      ephemeral: true,
    });
  }

  else if (type === 'goodbye_config') {
    const channelId = interaction.fields.getTextInputValue('channel_id').trim() || null;
    const message = interaction.fields.getTextInputValue('message').trim();
    const config = await getGuildConfig(client, guild.id);
    await setGuildConfig(client, guild.id, { ...config, goodbyeChannelId: channelId, goodbyeMessage: message });
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(SUCCESS).setTitle('✅ Goodbye Updated')
        .addFields(
          { name: 'Channel', value: channelId ? `<#${channelId}>` : 'None', inline: true },
          { name: 'Message', value: `\`\`\`${message.slice(0, 200)}\`\`\`` },
        ).setTimestamp()],
      ephemeral: true,
    });
  }

  else if (type === 'logging_config') {
    const logChannelId = interaction.fields.getTextInputValue('log_channel_id').trim() || null;
    const modChannelId = interaction.fields.getTextInputValue('mod_channel_id').trim() || null;
    const config = await getGuildConfig(client, guild.id);
    await setGuildConfig(client, guild.id, { ...config, logChannelId, modLogChannelId: modChannelId });
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(SUCCESS).setTitle('✅ Logging Updated')
        .addFields(
          { name: 'General Log', value: logChannelId ? `<#${logChannelId}>` : 'None', inline: true },
          { name: 'Mod Log', value: modChannelId ? `<#${modChannelId}>` : 'None', inline: true },
        ).setTimestamp()],
      ephemeral: true,
    });
  }
}

// ─── Entry: send main admin panel ────────────────────────────────────────────

export async function sendAdminPanel(message, client) {
  await message.reply({
    embeds: [mainMenuEmbed(message.guild)],
    components: [mainMenuRow()],
  });
}

// ─── Ticket panel creation handler (called from create_ticket_panel button) ──

export async function handleCreateTicketPanel(interaction, client, panelId) {
  const panels = await getPanels(client, interaction.guild.id);
  const panel = panels.find(p => p.panelId === panelId);
  if (!panel) return interaction.reply({ content: '❌ This ticket panel is no longer active.', ephemeral: true });

  const { createTicketWithPanel } = await import('../services/ticketPanelService.js');
  await createTicketWithPanel(interaction, client, panel);
}
