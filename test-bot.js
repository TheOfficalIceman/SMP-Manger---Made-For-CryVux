import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN_TEST;
const CLIENT_ID = process.env.CLIENT_ID_TEST;
const GUILD_ID = process.env.GUILD_ID_TEST;

if (!TOKEN || !CLIENT_ID) {
  console.error('[TestBot] ❌ DISCORD_TOKEN_TEST and CLIENT_ID_TEST are required.');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check if the bot is alive and see latency'),

  new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hello to the bot'),

  new SlashCommandBuilder()
    .setName('echo')
    .setDescription('Repeat a message back to you')
    .addStringOption(opt =>
      opt.setName('message').setDescription('The message to echo').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('info')
    .setDescription('Show test bot info and dashboard link'),

  new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll a dice')
    .addIntegerOption(opt =>
      opt.setName('sides').setDescription('Number of sides (default: 6)').setMinValue(2).setMaxValue(1000)
    ),

  new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin'),
].map(c => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log(`[TestBot] ✅ Registered ${commands.length} guild slash commands`);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log(`[TestBot] ✅ Registered ${commands.length} global slash commands (may take up to 1 hour to appear)`);
    }
  } catch (err) {
    if (err.code === 50001 || err.message?.includes('Missing Access')) {
      console.error('[TestBot] ❌ Missing Access — the bot has not been invited to the server with the correct scopes.');
      console.error('[TestBot] 👉 Use this invite link (replace CLIENT_ID with your bot\'s Application ID):');
      console.error(`[TestBot]    https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands`);
    } else {
      console.error('[TestBot] ❌ Failed to register commands:', err.message);
    }
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', async () => {
  console.log(`[TestBot] ✅ Logged in as ${client.user.tag}`);
  console.log(`[TestBot] 📊 Dashboard: http://localhost:${process.env.PORT || 5000}/admin`);
  await registerCommands();
  client.user.setPresence({
    status: 'online',
    activities: [{ type: 3, name: 'the dashboard — /info' }],
  });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'ping') {
      const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🏓 Pong!')
          .addFields(
            { name: 'Bot Latency', value: `${latency}ms`, inline: true },
            { name: 'API Latency', value: `${Math.round(client.ws.ping)}ms`, inline: true },
          )
          .setTimestamp()],
        content: '',
      });
    }

    else if (commandName === 'hello') {
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x23d160)
          .setTitle('👋 Hey there!')
          .setDescription(`Hello, ${interaction.user}! The test bot is working perfectly.`)
          .setTimestamp()],
      });
    }

    else if (commandName === 'echo') {
      const msg = interaction.options.getString('message');
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x3b9edd)
          .setDescription(`💬 ${msg}`)
          .setFooter({ text: `Echoed from ${interaction.user.tag}` })],
      });
    }

    else if (commandName === 'info') {
      const uptime = process.uptime();
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const s = Math.floor(uptime % 60);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('ℹ️ TitanBot Test Instance')
          .setDescription('This is a lightweight test bot to verify your Discord credentials and dashboard are working.')
          .addFields(
            { name: 'Uptime', value: `${h}h ${m}m ${s}s`, inline: true },
            { name: 'Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true },
            { name: 'Commands', value: `${commands.length} loaded`, inline: true },
            { name: 'Dashboard', value: `[\`/admin\`](http://localhost:${process.env.PORT || 5000}/admin)`, inline: false },
          )
          .setTimestamp()],
      });
    }

    else if (commandName === 'roll') {
      const sides = interaction.options.getInteger('sides') || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xf5c542)
          .setTitle(`🎲 d${sides} Roll`)
          .setDescription(`You rolled a **${result}** out of ${sides}!`)
          .setTimestamp()],
      });
    }

    else if (commandName === 'coinflip') {
      const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(result === 'Heads' ? 0xf5c542 : 0x9397ab)
          .setTitle('🪙 Coin Flip')
          .setDescription(`It landed on **${result}**!`)
          .setTimestamp()],
      });
    }

  } catch (err) {
    console.error(`[TestBot] Error handling /${commandName}:`, err);
    const msg = { content: '❌ Something went wrong.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.on('error', err => console.error('[TestBot] Client error:', err.message));

client.login(TOKEN).catch(err => {
  console.error('[TestBot] ❌ Login failed:', err.message);
  process.exit(1);
});
