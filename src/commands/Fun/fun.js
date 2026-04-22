import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from '../../utils/logger.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
const chance = (p) => Math.random() < p;
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const KEY_USER = (uid, k) => `fun:user:${uid}:${k}`;
const KEY_GUILD = (gid, k) => `fun:guild:${gid}:${k}`;
const KEY_GLOBAL = (k) => `fun:global:${k}`;

async function dbGet(client, key, fallback = null) {
  try { const v = await client.db?.get?.(key); return v ?? fallback; } catch { return fallback; }
}
async function dbSet(client, key, val) {
  try { await client.db?.set?.(key, val); return true; } catch { return false; }
}

// =========================================================================
// SOCIAL
// =========================================================================
const FIRST_IMPRESSIONS_NICE = [
  "Looks like the type of person who'd remember your birthday.",
  "Probably gives the best advice at 3am.",
  "Has the energy of someone who waters their houseplants on schedule.",
  "Definitely the friend that brings snacks unprompted.",
  "Strong main-character energy, in a quiet competent way."
];
const FIRST_IMPRESSIONS_ROAST = [
  "Vibes like a tab you forgot to close three weeks ago.",
  "Looks like someone who replies 'k' and means it.",
  "Has 'I'll respond in 2 business days' energy.",
  "Probably argues with NPCs in single-player games.",
  "Looks like the kind of person who claps when the plane lands."
];
const NPC_LINES = {
  fantasy: ["I used to be an adventurer like you, until I took an arrow to the knee.", "Welcome, traveler. The night grows cold.", "Have you heard of the high elves?", "Buy something or get out."],
  scifi: ["Logs indicate hostile activity in sector 7.", "I'm afraid I can't do that.", "Welcome to Megacity. Cred or scram.", "My circuits hurt. Do you have a moment?"],
  modern: ["Did you remember to validate parking?", "I just saw your ex.", "Be honest. How's the sourdough?", "We're closing in 5."]
};
const SHIP_FATES = ["soulmates against all odds", "an unhinged 6-month chaos romance", "best friends who refuse to admit it", "destined to be an iconic rivalry", "the kind of couple Twitter writes essays about", "lowkey already married in a parallel universe"];
const EXPOSE_SECRETS = [
  "secretly cries during Pixar movies",
  "has rewatched the same 4 episodes for two years",
  "owns more than 12 unused notebooks",
  "talks to themselves while cooking in a fake British accent",
  "has never finished a single book they bought",
  "still uses 'lol' unironically"
];
const DRAMA_TEMPLATES = [
  "{a} accused {b} of stealing the last slice of pizza. {c} has receipts.",
  "{a} ghosted the group chat for 3 hours. {b} took it personally. {c} is the mediator now.",
  "Apparently {a} and {b} have been beefing in DMs all week. {c} just leaked the screenshots.",
  "{a} tried to kick {b} from the squad. {c} said 'over my dead body' and now no one's talking."
];
const ROAST_LINES = [
  "{u} types like the keyboard owes them money.",
  "{u}'s opinions are like browser tabs — way too many open.",
  "{u} has more red flags than a Soviet parade.",
  "{u} brings the same energy to chat as a dial-up modem.",
  "{u} debates with the confidence of someone who didn't read the article."
];
const STORY_GENRES = {
  fantasy: ["the realm of {server}", "an ancient curse", "a forbidden tavern", "the king's missing crown"],
  scifi: ["the {server} space station", "a malfunctioning AI", "a lost colony ship", "the singularity"],
  horror: ["the abandoned wing of {server}", "an unspeakable presence", "the basement no one talks about", "missing voice channels"]
};

function rollFirstImpression(target, mode) {
  const pool = mode === 'roast' ? FIRST_IMPRESSIONS_ROAST : FIRST_IMPRESSIONS_NICE;
  return `**First impression of ${target}:** ${pick(pool)}`;
}

// =========================================================================
// GAME
// =========================================================================
const HEIST_TARGETS = [
  { name: 'a small bakery', diff: 0.2, reward: [50, 200] },
  { name: 'the corner gas station', diff: 0.3, reward: [100, 400] },
  { name: 'a downtown bank', diff: 0.6, reward: [500, 2000] },
  { name: 'the federal reserve', diff: 0.9, reward: [2000, 10000] }
];
const SURVIVE_SCENARIOS = [
  { setup: "You wake up in a crashed plane in the jungle. You hear something moving in the bushes.", choices: ["Run", "Hide", "Fight"], outcomes: { Run: "You sprint and find a river. You survive day 1.", Hide: "Whatever it was, it passed. You live.", Fight: "It was a tiger. You did not win." } },
  { setup: "Stranded in a desert. You see two paths: dunes east, rocks west.", choices: ["East", "West", "Wait"], outcomes: { East: "You collapse from heatstroke.", West: "You find shade and a cave with water. Saved.", Wait: "Nightfall. You freeze. RIP." } },
  { setup: "Locked in a haunted mansion. The lights flicker.", choices: ["Hide", "Search", "Run"], outcomes: { Hide: "You hide for hours. Dawn comes. You live.", Search: "You find the exit key in a portrait. Free.", Run: "You trip on the stairs. Game over." } }
];
const BOSS_NAMES = ["The Glitched Overlord", "Sir Bug-A-Lot", "The Lag Spike", "Megapixel the Destroyer", "Captain Crash"];
const RANK_TITLES = {
  funny: ["Chief Vibe Officer", "Lord of Lurking", "Senior Memelord", "Director of Yapping", "Certified Goofy Goober", "Unranked but Iconic"],
  serious: ["Distinguished Member", "Honored Veteran", "Trusted Citizen", "Council Initiate", "Elite Operative", "Strategic Advisor"]
};
const DAILY_CHALLENGES = [
  "Send 10 messages today",
  "React to 5 different people's messages",
  "Start a conversation in a quiet channel",
  "Compliment 3 random members",
  "Post a meme that gets at least 1 reaction",
  "Voice chat for 15 minutes",
  "Help someone with a question"
];
const DUEL_ATTACKS = [
  { name: "throws a keyboard", dmg: [10, 30] },
  { name: "summons a discord ping storm", dmg: [15, 40] },
  { name: "leaks an embarrassing screenshot", dmg: [20, 50] },
  { name: "spams 'fr fr' until ears bleed", dmg: [5, 25] },
  { name: "lands a perfectly-timed roast", dmg: [25, 55] }
];
const MYSTERY_CASES = [
  { crime: "The Case of the Missing Server Booster", clues: ["A trail of confetti emojis", "Half-eaten cake in #general", "An anonymous DM saying 'i had to'"], suspect: "the quiet one in #lurkers" },
  { crime: "Who Pinged @everyone At 3AM?", clues: ["Coffee cup left on a keyboard", "Recently-deleted message history", "A suspicious 'oops' in admin chat"], suspect: "a sleep-deprived mod" },
  { crime: "The Stolen Custom Emoji", clues: ["A new emoji on a rival server", "A timestamp matching a user's last seen", "An unexplained name change"], suspect: "your closest 'friend'" }
];
const LOOTBOX_ITEMS = [
  { name: "a rusty spoon", rarity: "common", weight: 50 },
  { name: "a dusty coin", rarity: "common", weight: 50 },
  { name: "a slightly haunted sock", rarity: "uncommon", weight: 25 },
  { name: "a shiny pebble", rarity: "uncommon", weight: 25 },
  { name: "a +1 Sword of Mediocrity", rarity: "rare", weight: 10 },
  { name: "a legendary discord nitro screenshot", rarity: "epic", weight: 4 },
  { name: "the actual blueprint to fortune", rarity: "mythic", weight: 1 }
];
function rollLoot() {
  const total = LOOTBOX_ITEMS.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of LOOTBOX_ITEMS) { r -= it.weight; if (r <= 0) return it; }
  return LOOTBOX_ITEMS[0];
}

// =========================================================================
// USEFUL
// =========================================================================
const DEADCHAT_TOPICS = {
  question: ["What's a hill you'd die on?", "Worst movie you actually love?", "What food do you defend with your life?", "What's a weird skill you have?", "What app do you spend the most time in?"],
  hot_take: ["Pineapple belongs on pizza, fight me.", "Mobile games > console games.", "Cereal is just cold soup.", "Movies should be max 90 minutes.", "Reading subtitles makes movies better."],
  game: ["Drop a ✨ if you're online", "Type the next word in this sentence: 'It was a dark and ___'", "First emoji on your keyboard is your spirit animal", "Last app you opened predicts your weekend"]
};
const THREAD_IDEAS = {
  general: ["What's everyone working on this week?", "Share a song you can't stop replaying", "What's your current goal?"],
  gaming: ["Top 3 games of all time?", "Most underrated game?", "What game ruined your sleep schedule?"],
  tech: ["Favorite dev tool right now?", "What language did you learn last?", "Hot take on AI?"],
  creative: ["Share your latest art/project", "What inspires you lately?", "Side hustles you're dreaming about?"]
};

function fmtUptime(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

// =========================================================================
// CHAOTIC
// =========================================================================
function corrupt(text, intensity = 0.3) {
  const chars = ['̸','̷','̶','̴','̵','̧','̨','̛','̪','̬','͕','͖','͙','͚'];
  return text.split('').map(c => {
    if (c === ' ' || !chance(intensity)) return c;
    let out = c;
    const n = rand(1, Math.ceil(intensity * 5) + 1);
    for (let i = 0; i < n; i++) out += pick(chars);
    return out;
  }).join('');
}
function glitch(text, level = 0.5) {
  return text.split('').map(c => {
    if (chance(level * 0.3)) return c.toUpperCase();
    if (chance(level * 0.2)) return pick(['#', '@', '$', '%', '*', '?']);
    if (chance(level * 0.15)) return c + pick(['̷','̶','̸']);
    return c;
  }).join('');
}
const ALT_UNIVERSES = {
  cyberpunk: "neon-soaked, chrome-laced, the chat is a black-market data exchange",
  medieval: "everyone wears chainmail, messages travel by raven, mods are knights",
  underwater: "the server is a coral reef, channels are reef pockets, voice chat is bubbles",
  prehistoric: "the server is a cave, messages are grunts, the bot is a bewildered shaman",
  apocalyptic: "the server is a bunker, rations are emojis, hope is a pinned message"
};
const PLOT_TWISTS = [
  "...but it was all a dream.",
  "...except they were the villain the entire time.",
  "...and then the bot achieved sentience.",
  "...and that person was actually their long-lost twin.",
  "...meanwhile, in another timeline, none of this happened.",
  "...but the real treasure was the friends along the way (the friends were also lying)."
];
const FAKE_NEWS_TEMPLATES = [
  "BREAKING: {topic} declared 'too powerful' by international council, will be regulated by sundown.",
  "EXCLUSIVE: Insider source confirms {topic} was responsible for the 2003 internet hiccup.",
  "STUDY: 9 out of 10 cats prefer {topic} over actual food.",
  "REPORT: {topic} found in unexpected location, scientists baffled.",
  "URGENT: New evidence suggests {topic} may have caused the dinosaur extinction."
];
const WRONG_FACTS = {
  space: ["The moon is just a really big disco ball.", "Mars used to be a Costco.", "Black holes are where lost socks go."],
  history: ["Napoleon was actually 7'2\".", "The Roman Empire fell because they ran out of WiFi.", "Cleopatra invented the fidget spinner."],
  animals: ["Octopuses can drive stick shift.", "Penguins actually fly, they just keep it private.", "Cows are the secret rulers of suburbia."],
  food: ["Pineapples grow on cows.", "Bananas are 90% glue.", "Coffee was originally a dance move."]
};
const HISTORY_REWRITES = [
  "{event}, but it was actually settled with a rap battle.",
  "{event}, except everyone involved was on roller skates.",
  "{event}, but it was sponsored by a soda company.",
  "{event}, however the real cause was a missing TV remote."
];
function emojiTranslate(text, density = 0.3) {
  const map = { love: '❤️', heart: '❤️', happy: '😄', sad: '😢', fire: '🔥', cool: '😎', star: '⭐', sun: '☀️', moon: '🌙', music: '🎵', cat: '🐱', dog: '🐶', food: '🍔', pizza: '🍕', game: '🎮', code: '💻', book: '📚', money: '💰', time: '⏰', sleep: '😴' };
  let out = text;
  for (const [w, e] of Object.entries(map)) {
    out = out.replace(new RegExp(`\\b${w}\\b`, 'gi'), m => chance(density) ? `${m}${e}` : m);
  }
  return out;
}

// =========================================================================
// COMMAND BUILDER
// =========================================================================
const builder = new SlashCommandBuilder()
  .setName('fun')
  .setDescription('Social, game, useful and chaotic AI-free commands');

builder.addSubcommandGroup(g => g
  .setName('social').setDescription('Social commands')
  .addSubcommand(s => s.setName('firstimpression').setDescription('Generate a fake first impression of a user')
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
    .addStringOption(o => o.setName('mode').setDescription('Tone').addChoices({ name: 'nice', value: 'nice' }, { name: 'roast', value: 'roast' })))
  .addSubcommand(s => s.setName('npc').setDescription('Turn a user into an NPC with a line')
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
    .addStringOption(o => o.setName('theme').setDescription('Theme').addChoices({ name: 'fantasy', value: 'fantasy' }, { name: 'scifi', value: 'scifi' }, { name: 'modern', value: 'modern' })))
  .addSubcommand(s => s.setName('ship').setDescription('Pair two users with a relationship')
    .addUserOption(o => o.setName('a').setDescription('First user').setRequired(true))
    .addUserOption(o => o.setName('b').setDescription('Second user').setRequired(true))
    .addStringOption(o => o.setName('mode').setDescription('Mode').addChoices({ name: 'serious', value: 'serious' }, { name: 'chaos', value: 'chaos' })))
  .addSubcommand(s => s.setName('expose').setDescription('Generate a harmless fake "secret" about a user')
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true)))
  .addSubcommand(s => s.setName('drama').setDescription('Generate a fake drama scenario')
    .addStringOption(o => o.setName('scale').setDescription('Scale').addChoices({ name: 'small', value: 'small' }, { name: 'medium', value: 'medium' }, { name: 'server-wide', value: 'big' })))
  .addSubcommand(s => s.setName('compliment_battle').setDescription('Two users, AI-judged compliment battle')
    .addUserOption(o => o.setName('a').setDescription('Challenger').setRequired(true))
    .addUserOption(o => o.setName('b').setDescription('Opponent').setRequired(true)))
  .addSubcommand(s => s.setName('insult_battle').setDescription('Controlled, light insult battle')
    .addUserOption(o => o.setName('a').setDescription('Challenger').setRequired(true))
    .addUserOption(o => o.setName('b').setDescription('Opponent').setRequired(true)))
  .addSubcommand(s => s.setName('group_roast').setDescription('Light roast for everyone mentioned')
    .addStringOption(o => o.setName('users').setDescription('Mention up to 5 users').setRequired(true)))
  .addSubcommand(s => s.setName('who_sus').setDescription('Pick a random "suspicious" member'))
  .addSubcommand(s => s.setName('server_story').setDescription('Generate a story about the server')
    .addStringOption(o => o.setName('genre').setDescription('Genre').addChoices({ name: 'fantasy', value: 'fantasy' }, { name: 'scifi', value: 'scifi' }, { name: 'horror', value: 'horror' })))
);

builder.addSubcommandGroup(g => g
  .setName('game').setDescription('Game commands')
  .addSubcommand(s => s.setName('heist').setDescription('Try to pull off a heist')
    .addStringOption(o => o.setName('difficulty').setDescription('Difficulty').addChoices({ name: 'easy', value: '0' }, { name: 'medium', value: '1' }, { name: 'hard', value: '2' }, { name: 'insane', value: '3' })))
  .addSubcommand(s => s.setName('survive').setDescription('Survive a random scenario'))
  .addSubcommand(s => s.setName('bossfight').setDescription('Server boss fight (does damage to a global boss)'))
  .addSubcommand(s => s.setName('rank_me').setDescription('Get a random funny or serious rank')
    .addStringOption(o => o.setName('mode').setDescription('Mode').addChoices({ name: 'funny', value: 'funny' }, { name: 'serious', value: 'serious' })))
  .addSubcommand(s => s.setName('daily_challenge').setDescription('Get today\'s challenge for XP'))
  .addSubcommand(s => s.setName('duel').setDescription('1v1 text combat')
    .addUserOption(o => o.setName('opponent').setDescription('Who to duel').setRequired(true)))
  .addSubcommand(s => s.setName('mystery_case').setDescription('Solve a random mystery'))
  .addSubcommand(s => s.setName('lootbox').setDescription('Open a random lootbox'))
  .addSubcommand(s => s.setName('xp').setDescription('Show your fun XP'))
  .addSubcommand(s => s.setName('level_rewards').setDescription('See unlockable level perks'))
);

builder.addSubcommandGroup(g => g
  .setName('useful').setDescription('Useful commands')
  .addSubcommand(s => s.setName('timezone_sync').setDescription('Find a good time across timezones')
    .addStringOption(o => o.setName('zones').setDescription('Comma list, e.g. UTC,EST,JST').setRequired(true)))
  .addSubcommand(s => s.setName('deadchat').setDescription('Revive the chat')
    .addStringOption(o => o.setName('topic_type').setDescription('Style').addChoices({ name: 'question', value: 'question' }, { name: 'hot_take', value: 'hot_take' }, { name: 'game', value: 'game' })))
  .addSubcommand(s => s.setName('thread_idea').setDescription('Suggest a discussion topic')
    .addStringOption(o => o.setName('category').setDescription('Category').addChoices({ name: 'general', value: 'general' }, { name: 'gaming', value: 'gaming' }, { name: 'tech', value: 'tech' }, { name: 'creative', value: 'creative' })))
  .addSubcommand(s => s.setName('server_vibe').setDescription('Quick read on server activity'))
  .addSubcommand(s => s.setName('activity_heatmap').setDescription('Show peak activity (by saved samples)'))
  .addSubcommand(s => s.setName('remind_smart').setDescription('Set a reminder')
    .addStringOption(o => o.setName('text').setDescription('What to remember').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('In how many minutes').setRequired(true)))
  .addSubcommand(s => s.setName('goal_tracker').setDescription('Track a personal goal')
    .addStringOption(o => o.setName('action').setDescription('Action').setRequired(true).addChoices({ name: 'add', value: 'add' }, { name: 'list', value: 'list' }, { name: 'done', value: 'done' }))
    .addStringOption(o => o.setName('text').setDescription('Goal text or ID')))
  .addSubcommand(s => s.setName('poll_plus').setDescription('Quick advanced poll')
    .addStringOption(o => o.setName('question').setDescription('Question').setRequired(true))
    .addStringOption(o => o.setName('options').setDescription('Comma-separated options').setRequired(true)))
  .addSubcommand(s => s.setName('event_planner').setDescription('Create a quick event')
    .addStringOption(o => o.setName('name').setDescription('Event name').setRequired(true))
    .addStringOption(o => o.setName('when').setDescription('When (free text)').setRequired(true)))
  .addSubcommand(s => s.setName('focus_mode').setDescription('Start a personal focus session')
    .addIntegerOption(o => o.setName('minutes').setDescription('Duration').setRequired(true)))
);

builder.addSubcommandGroup(g => g
  .setName('chaos').setDescription('Chaotic commands')
  .addSubcommand(s => s.setName('corrupt').setDescription('Glitch text progressively')
    .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true))
    .addIntegerOption(o => o.setName('intensity').setDescription('1-10')))
  .addSubcommand(s => s.setName('alternate_universe').setDescription('Reimagine server in another reality')
    .addStringOption(o => o.setName('theme').setDescription('Theme').addChoices(...Object.keys(ALT_UNIVERSES).map(k => ({ name: k, value: k })))))
  .addSubcommand(s => s.setName('plot_twist').setDescription('Add a plot twist')
    .addStringOption(o => o.setName('text').setDescription('Statement').setRequired(true)))
  .addSubcommand(s => s.setName('fake_news').setDescription('Generate a clearly-fake headline')
    .addStringOption(o => o.setName('topic').setDescription('Topic').setRequired(true)))
  .addSubcommand(s => s.setName('glitch_text').setDescription('Visual glitch effect')
    .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true))
    .addIntegerOption(o => o.setName('level').setDescription('1-10')))
  .addSubcommand(s => s.setName('chaos_mode').setDescription('Toggle chaos mode for a duration (channel only)')
    .addIntegerOption(o => o.setName('minutes').setDescription('Duration').setRequired(true)))
  .addSubcommand(s => s.setName('random_fact_but_wrong').setDescription('Confidently wrong "fact"')
    .addStringOption(o => o.setName('topic').setDescription('Topic').addChoices({ name: 'space', value: 'space' }, { name: 'history', value: 'history' }, { name: 'animals', value: 'animals' }, { name: 'food', value: 'food' })))
  .addSubcommand(s => s.setName('rewrite_history').setDescription('Humorously alter a historical event')
    .addStringOption(o => o.setName('event').setDescription('Event').setRequired(true)))
  .addSubcommand(s => s.setName('emoji_translate').setDescription('Sprinkle emojis through text')
    .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true))
    .addIntegerOption(o => o.setName('density').setDescription('1-10')))
  .addSubcommand(s => s.setName('reverse_meaning').setDescription('Flip the meaning of text')
    .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)))
);

// =========================================================================
// EXECUTE
// =========================================================================
export default {
  data: builder,
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();
    const client = interaction.client;
    try {
      if (group === 'social') return await runSocial(interaction, sub, client);
      if (group === 'game') return await runGame(interaction, sub, client);
      if (group === 'useful') return await runUseful(interaction, sub, client);
      if (group === 'chaos') return await runChaos(interaction, sub, client);
      return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    } catch (err) {
      logger.error(`/fun ${group} ${sub} error:`, err);
      const msg = '❌ Something went wrong.';
      if (interaction.deferred || interaction.replied) await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
      else await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
  }
};

// =========================================================================
// SOCIAL HANDLERS
// =========================================================================
async function runSocial(interaction, sub, client) {
  if (sub === 'firstimpression') {
    const u = interaction.options.getUser('user');
    const mode = interaction.options.getString('mode') || 'nice';
    return interaction.reply(rollFirstImpression(`<@${u.id}>`, mode));
  }
  if (sub === 'npc') {
    const u = interaction.options.getUser('user');
    const theme = interaction.options.getString('theme') || pick(Object.keys(NPC_LINES));
    return interaction.reply(`🎭 **${u.username} (NPC, ${theme}):** "${pick(NPC_LINES[theme])}"`);
  }
  if (sub === 'ship') {
    const a = interaction.options.getUser('a'), b = interaction.options.getUser('b');
    const score = rand(0, 100);
    const fate = pick(SHIP_FATES);
    const name = a.username.slice(0, Math.ceil(a.username.length / 2)) + b.username.slice(Math.floor(b.username.length / 2));
    return interaction.reply(`💞 **${name}** (${a} × ${b})\nCompatibility: **${score}%**\nVerdict: ${fate}`);
  }
  if (sub === 'expose') {
    const u = interaction.options.getUser('user');
    return interaction.reply(`🕵️ Sources confirm: ${u} ${pick(EXPOSE_SECRETS)}.\n*(this is fake. probably.)*`);
  }
  if (sub === 'drama') {
    const scale = interaction.options.getString('scale') || 'medium';
    const guild = interaction.guild;
    let users = [];
    if (guild) {
      await guild.members.fetch({ limit: 30 }).catch(() => {});
      const pool = [...guild.members.cache.values()].filter(m => !m.user.bot);
      users = shuffle(pool).slice(0, 3);
    }
    if (users.length < 3) {
      users = [interaction.user, interaction.user, interaction.user];
    }
    const tmpl = pick(DRAMA_TEMPLATES);
    const out = tmpl.replace('{a}', `<@${users[0].id || users[0].user?.id}>`).replace('{b}', `<@${users[1].id || users[1].user?.id}>`).replace('{c}', `<@${users[2].id || users[2].user?.id}>`);
    const prefix = scale === 'big' ? '🚨 SERVER-WIDE DRAMA 🚨\n' : scale === 'small' ? '☕ Quiet drama:\n' : '🎭 Drama Alert:\n';
    return interaction.reply(prefix + out);
  }
  if (sub === 'compliment_battle' || sub === 'insult_battle') {
    const a = interaction.options.getUser('a'), b = interaction.options.getUser('b');
    const aScore = rand(40, 100), bScore = rand(40, 100);
    const winner = aScore >= bScore ? a : b;
    const verb = sub === 'compliment_battle' ? 'compliments' : 'roasts';
    return interaction.reply(`⚔️ **${verb.toUpperCase()} BATTLE**\n${a}: ${aScore} pts\n${b}: ${bScore} pts\n\n🏆 **Winner:** ${winner}`);
  }
  if (sub === 'group_roast') {
    const text = interaction.options.getString('users');
    const ids = [...text.matchAll(/<@!?(\d+)>/g)].map(m => m[1]).slice(0, 5);
    if (!ids.length) return interaction.reply({ content: 'Mention at least one user.', ephemeral: true });
    const lines = ids.map(id => `• ` + ROAST_LINES[Math.floor(Math.random() * ROAST_LINES.length)].replace('{u}', `<@${id}>`));
    return interaction.reply(`🔥 **Group Roast** 🔥\n${lines.join('\n')}`);
  }
  if (sub === 'who_sus') {
    const guild = interaction.guild;
    if (!guild) return interaction.reply({ content: 'Server only.', ephemeral: true });
    await guild.members.fetch({ limit: 50 }).catch(() => {});
    const pool = [...guild.members.cache.values()].filter(m => !m.user.bot);
    if (!pool.length) return interaction.reply('No members to suspect.');
    const target = pick(pool);
    const reasons = ['been quiet for too long', 'switched profile pictures recently', 'reacted with a 🤨 once', 'was online at 3am', 'used too many emojis today'];
    return interaction.reply(`🤨 Suspect: **${target.user.username}** — ${pick(reasons)}.`);
  }
  if (sub === 'server_story') {
    const genre = interaction.options.getString('genre') || pick(Object.keys(STORY_GENRES));
    const elems = STORY_GENRES[genre];
    const serverName = interaction.guild?.name || 'this server';
    const beats = shuffle([...elems]).slice(0, 4).map(e => e.replace('{server}', serverName));
    return interaction.reply(`📖 **Story of ${serverName}** (${genre})\n\nIt began in ${beats[0]}. The community discovered ${beats[1]}, and despite ${beats[2]}, they emerged stronger because of ${beats[3]}.`);
  }
}

// =========================================================================
// GAME HANDLERS
// =========================================================================
async function runGame(interaction, sub, client) {
  const uid = interaction.user.id;

  if (sub === 'heist') {
    const idx = parseInt(interaction.options.getString('difficulty') || '1');
    const target = HEIST_TARGETS[Math.min(idx, HEIST_TARGETS.length - 1)];
    const success = chance(1 - target.diff);
    if (success) {
      const reward = rand(target.reward[0], target.reward[1]);
      const xp = await dbGet(client, KEY_USER(uid, 'xp'), 0);
      await dbSet(client, KEY_USER(uid, 'xp'), xp + Math.floor(reward / 10));
      return interaction.reply(`💰 You hit ${target.name} and got away with **${reward}** coins! (+${Math.floor(reward / 10)} fun XP)`);
    }
    return interaction.reply(`🚓 You botched the heist on ${target.name}. The cops have your cousin.`);
  }
  if (sub === 'survive') {
    const sc = pick(SURVIVE_SCENARIOS);
    const row = new ActionRowBuilder().addComponents(
      ...sc.choices.map((c, i) => new ButtonBuilder().setCustomId(`fun_survive_${i}`).setLabel(c).setStyle(ButtonStyle.Primary))
    );
    const msg = await interaction.reply({ content: `🌲 ${sc.setup}`, components: [row], fetchReply: true });
    try {
      const choice = await msg.awaitMessageComponent({ filter: i => i.user.id === uid, time: 30000 });
      const choiceLabel = sc.choices[parseInt(choice.customId.split('_').pop())];
      await choice.update({ content: `🌲 ${sc.setup}\n\n**You chose: ${choiceLabel}**\n${sc.outcomes[choiceLabel]}`, components: [] });
    } catch {
      await interaction.editReply({ content: `🌲 ${sc.setup}\n\n*You hesitated and lost the chance.*`, components: [] }).catch(() => {});
    }
    return;
  }
  if (sub === 'bossfight') {
    const key = KEY_GLOBAL('boss');
    let boss = await dbGet(client, key);
    if (!boss || boss.hp <= 0) {
      boss = { name: pick(BOSS_NAMES), hp: rand(500, 2000), maxHp: 0, started: Date.now() };
      boss.maxHp = boss.hp;
    }
    const dmg = rand(20, 80);
    boss.hp -= dmg;
    const xp = await dbGet(client, KEY_USER(uid, 'xp'), 0);
    await dbSet(client, KEY_USER(uid, 'xp'), xp + 5);
    if (boss.hp <= 0) {
      await dbSet(client, key, null);
      return interaction.reply(`🗡️ You hit **${boss.name}** for ${dmg}! 💥 The killing blow! Boss defeated. (+5 XP)`);
    }
    await dbSet(client, key, boss);
    const bar = '█'.repeat(Math.max(0, Math.floor((boss.hp / boss.maxHp) * 20))) + '░'.repeat(20 - Math.max(0, Math.floor((boss.hp / boss.maxHp) * 20)));
    return interaction.reply(`🗡️ You hit **${boss.name}** for ${dmg}!\n\`${bar}\` ${boss.hp}/${boss.maxHp} HP\n(+5 XP)`);
  }
  if (sub === 'rank_me') {
    const mode = interaction.options.getString('mode') || 'funny';
    return interaction.reply(`🏷️ ${interaction.user}, your rank is: **${pick(RANK_TITLES[mode])}**`);
  }
  if (sub === 'daily_challenge') {
    const day = new Date().toISOString().slice(0, 10);
    const seed = `${uid}-${day}`.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const challenge = DAILY_CHALLENGES[seed % DAILY_CHALLENGES.length];
    return interaction.reply(`📅 **Today's Challenge:** ${challenge}\nReward: 50 fun XP`);
  }
  if (sub === 'duel') {
    const opp = interaction.options.getUser('opponent');
    if (opp.id === uid) return interaction.reply({ content: 'You cannot duel yourself.', ephemeral: true });
    let aHp = 100, bHp = 100, log = [];
    while (aHp > 0 && bHp > 0) {
      const aAtk = pick(DUEL_ATTACKS);
      const aD = rand(aAtk.dmg[0], aAtk.dmg[1]);
      bHp -= aD;
      log.push(`${interaction.user.username} ${aAtk.name} → ${aD} dmg`);
      if (bHp <= 0) break;
      const bAtk = pick(DUEL_ATTACKS);
      const bD = rand(bAtk.dmg[0], bAtk.dmg[1]);
      aHp -= bD;
      log.push(`${opp.username} ${bAtk.name} → ${bD} dmg`);
    }
    const winner = aHp > 0 ? interaction.user : opp;
    return interaction.reply(`⚔️ **Duel** ${interaction.user} vs ${opp}\n\n${log.slice(0, 6).join('\n')}\n\n🏆 **Winner:** ${winner}`);
  }
  if (sub === 'mystery_case') {
    const c = pick(MYSTERY_CASES);
    return interaction.reply(`🔎 **${c.crime}**\n\nClues:\n${c.clues.map(x => `• ${x}`).join('\n')}\n\nLikely suspect: *${c.suspect}*`);
  }
  if (sub === 'lootbox') {
    const item = rollLoot();
    const colors = { common: '#9aa0a6', uncommon: '#57F287', rare: '#5865F2', epic: '#A335EE', mythic: '#FF8000' };
    const e = new EmbedBuilder().setColor(colors[item.rarity]).setTitle('🎁 Lootbox Opened!').setDescription(`You got: **${item.name}**\nRarity: **${item.rarity}**`);
    return interaction.reply({ embeds: [e] });
  }
  if (sub === 'xp') {
    const xp = await dbGet(client, KEY_USER(uid, 'xp'), 0);
    const lvl = Math.floor(Math.sqrt(xp / 10));
    return interaction.reply(`✨ ${interaction.user} — **Fun XP:** ${xp} (Level ${lvl})`);
  }
  if (sub === 'level_rewards') {
    return interaction.reply(`🎖️ **Level Rewards (fun)**\n• L5 — title: Adventurer\n• L10 — heist payout +20%\n• L15 — title: Veteran\n• L20 — extra lootbox roll\n• L25 — title: Legend\n• L50 — bragging rights, eternal`);
  }
}

// =========================================================================
// USEFUL HANDLERS
// =========================================================================
async function runUseful(interaction, sub, client) {
  const uid = interaction.user.id;

  if (sub === 'timezone_sync') {
    const zones = interaction.options.getString('zones').split(',').map(z => z.trim()).filter(Boolean).slice(0, 8);
    const now = new Date();
    const lines = zones.map(z => {
      try { return `• **${z}** — ${now.toLocaleString('en-US', { timeZone: z, hour: 'numeric', minute: '2-digit', weekday: 'short' })}`; }
      catch { return `• **${z}** — invalid timezone`; }
    });
    const utcHour = now.getUTCHours();
    const sweet = utcHour >= 14 && utcHour <= 22 ? 'Now is decent for most western zones.' : 'Try again 14:00–22:00 UTC for best overlap.';
    return interaction.reply(`🌍 **Timezone Sync**\n${lines.join('\n')}\n\n${sweet}`);
  }
  if (sub === 'deadchat') {
    const t = interaction.options.getString('topic_type') || 'question';
    return interaction.reply(`💬 **Dead Chat Reviver:**\n${pick(DEADCHAT_TOPICS[t])}`);
  }
  if (sub === 'thread_idea') {
    const c = interaction.options.getString('category') || 'general';
    return interaction.reply(`🧵 **Thread Idea (${c}):**\n${pick(THREAD_IDEAS[c])}`);
  }
  if (sub === 'server_vibe') {
    const guild = interaction.guild;
    if (!guild) return interaction.reply({ content: 'Server only.', ephemeral: true });
    const members = guild.memberCount || 0;
    const channels = guild.channels.cache.size;
    const onlineEst = Math.floor(members * (0.05 + Math.random() * 0.15));
    const moods = ['🌟 Buzzing', '☀️ Steady', '🌤️ Mellow', '🌑 Quiet', '😴 Asleep'];
    const mood = moods[Math.min(moods.length - 1, Math.floor((1 - onlineEst / Math.max(1, members)) * moods.length))];
    return interaction.reply(`🌡️ **Vibe:** ${mood}\nMembers: ${members} • Channels: ${channels} • Est. active now: ${onlineEst}`);
  }
  if (sub === 'activity_heatmap') {
    const guild = interaction.guild;
    const samples = await dbGet(client, KEY_GUILD(guild?.id || 'g', 'activity'), []);
    samples.push({ t: Date.now() }); samples.splice(0, Math.max(0, samples.length - 200));
    await dbSet(client, KEY_GUILD(guild?.id || 'g', 'activity'), samples);
    const buckets = new Array(24).fill(0);
    for (const s of samples) buckets[new Date(s.t).getUTCHours()]++;
    const max = Math.max(1, ...buckets);
    const bars = buckets.map((v, h) => `${String(h).padStart(2, '0')}: ${'█'.repeat(Math.round(v / max * 12))}`).join('\n');
    return interaction.reply({ content: '📊 **Activity Heatmap (UTC, last 200 calls)**\n```\n' + bars + '\n```' });
  }
  if (sub === 'remind_smart') {
    const text = interaction.options.getString('text');
    const min = Math.max(1, Math.min(60 * 24 * 7, interaction.options.getInteger('minutes')));
    const ms = min * 60 * 1000;
    await interaction.reply(`⏰ Reminder set for ${min} min from now: *${text}*`);
    setTimeout(() => {
      interaction.user.send(`⏰ Reminder: ${text}`).catch(() => {
        interaction.followUp({ content: `${interaction.user} ⏰ ${text}` }).catch(() => {});
      });
    }, ms);
    return;
  }
  if (sub === 'goal_tracker') {
    const action = interaction.options.getString('action');
    const text = interaction.options.getString('text') || '';
    const goals = await dbGet(client, KEY_USER(uid, 'goals'), []);
    if (action === 'add') {
      if (!text) return interaction.reply({ content: 'Provide goal text.', ephemeral: true });
      goals.push({ id: goals.length + 1, text, done: false, addedAt: Date.now() });
      await dbSet(client, KEY_USER(uid, 'goals'), goals);
      return interaction.reply(`🎯 Added goal #${goals.length}: ${text}`);
    }
    if (action === 'list') {
      if (!goals.length) return interaction.reply('No goals yet. Use `/fun useful goal_tracker action:add text:...`');
      return interaction.reply('🎯 **Your Goals:**\n' + goals.map(g => `${g.done ? '✅' : '⬜'} #${g.id} ${g.text}`).join('\n'));
    }
    if (action === 'done') {
      const id = parseInt(text);
      const g = goals.find(x => x.id === id);
      if (!g) return interaction.reply({ content: 'Goal not found.', ephemeral: true });
      g.done = true;
      await dbSet(client, KEY_USER(uid, 'goals'), goals);
      return interaction.reply(`✅ Completed: ${g.text}`);
    }
  }
  if (sub === 'poll_plus') {
    const q = interaction.options.getString('question');
    const opts = interaction.options.getString('options').split(',').map(o => o.trim()).filter(Boolean).slice(0, 10);
    if (opts.length < 2) return interaction.reply({ content: 'Need at least 2 options.', ephemeral: true });
    const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    const desc = opts.map((o, i) => `${emojis[i]} ${o}`).join('\n');
    const msg = await interaction.reply({ content: `📊 **${q}**\n\n${desc}`, fetchReply: true });
    for (let i = 0; i < opts.length; i++) await msg.react(emojis[i]).catch(() => {});
    return;
  }
  if (sub === 'event_planner') {
    const name = interaction.options.getString('name');
    const when = interaction.options.getString('when');
    const guild = interaction.guild;
    const events = await dbGet(client, KEY_GUILD(guild?.id || 'g', 'events'), []);
    events.push({ name, when, by: uid, at: Date.now() });
    await dbSet(client, KEY_GUILD(guild?.id || 'g', 'events'), events);
    return interaction.reply(`📅 **Event Planned:** ${name}\nWhen: ${when}\nBy: ${interaction.user}\nReact with ✅ to RSVP.`);
  }
  if (sub === 'focus_mode') {
    const min = Math.max(1, Math.min(180, interaction.options.getInteger('minutes')));
    await dbSet(client, KEY_USER(uid, 'focus'), { until: Date.now() + min * 60000 });
    setTimeout(() => {
      interaction.user.send(`🎯 Focus session done! ${min} minutes complete.`).catch(() => {});
    }, min * 60000);
    return interaction.reply({ content: `🎯 Focus mode on for ${min} min. I'll DM you when done.`, ephemeral: true });
  }
}

// =========================================================================
// CHAOS HANDLERS
// =========================================================================
async function runChaos(interaction, sub, client) {
  if (sub === 'corrupt') {
    const text = interaction.options.getString('text');
    const intensity = Math.max(1, Math.min(10, interaction.options.getInteger('intensity') || 3)) / 10;
    return interaction.reply(corrupt(text, intensity).slice(0, 1900));
  }
  if (sub === 'alternate_universe') {
    const theme = interaction.options.getString('theme') || pick(Object.keys(ALT_UNIVERSES));
    const server = interaction.guild?.name || 'this server';
    return interaction.reply(`🌀 **Alternate Universe (${theme})**\nIn this reality, ${server} is ${ALT_UNIVERSES[theme]}.`);
  }
  if (sub === 'plot_twist') {
    return interaction.reply(`🎬 *${interaction.options.getString('text')}* ${pick(PLOT_TWISTS)}`);
  }
  if (sub === 'fake_news') {
    const topic = interaction.options.getString('topic');
    return interaction.reply(`📰 ${pick(FAKE_NEWS_TEMPLATES).replace('{topic}', topic)}\n*— The Onion's less-credible cousin*`);
  }
  if (sub === 'glitch_text') {
    const text = interaction.options.getString('text');
    const level = Math.max(1, Math.min(10, interaction.options.getInteger('level') || 5)) / 10;
    return interaction.reply(glitch(text, level).slice(0, 1900));
  }
  if (sub === 'chaos_mode') {
    const min = Math.max(1, Math.min(60, interaction.options.getInteger('minutes')));
    const ch = interaction.channel;
    if (!ch) return interaction.reply({ content: 'Channel only.', ephemeral: true });
    await dbSet(client, KEY_GLOBAL(`chaos:${ch.id}`), { until: Date.now() + min * 60000 });
    return interaction.reply(`🌪️ Chaos mode ON in this channel for ${min} min.`);
  }
  if (sub === 'random_fact_but_wrong') {
    const topic = interaction.options.getString('topic') || pick(Object.keys(WRONG_FACTS));
    return interaction.reply(`🧠 **Did you know?** ${pick(WRONG_FACTS[topic])}\n*(this is, of course, completely false.)*`);
  }
  if (sub === 'rewrite_history') {
    const event = interaction.options.getString('event');
    return interaction.reply(`📜 ${pick(HISTORY_REWRITES).replace('{event}', event)}`);
  }
  if (sub === 'emoji_translate') {
    const text = interaction.options.getString('text');
    const density = Math.max(1, Math.min(10, interaction.options.getInteger('density') || 5)) / 10;
    return interaction.reply(emojiTranslate(text, density).slice(0, 1900));
  }
  if (sub === 'reverse_meaning') {
    const text = interaction.options.getString('text');
    const flips = [['love', 'hate'], ['hate', 'love'], ['good', 'bad'], ['bad', 'good'], ['happy', 'sad'], ['sad', 'happy'], ['always', 'never'], ['never', 'always'], ['can', "can't"], ['will', "won't"], ['yes', 'no'], ['no', 'yes'], ['like', 'despise'], ['best', 'worst'], ['worst', 'best']];
    let out = text;
    for (const [a, b] of flips) out = out.replace(new RegExp(`\\b${a}\\b`, 'gi'), b);
    if (out === text) out = `Not ${text}`;
    return interaction.reply(`🔄 **Reversed:** ${out}`);
  }
}
