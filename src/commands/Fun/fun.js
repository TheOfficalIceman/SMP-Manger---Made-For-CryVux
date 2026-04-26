import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
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
// =========================================================================
// EXTRA POOLS (new commands)
// =========================================================================
const ZODIAC = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const HOROSCOPES = ['Today the universe owes you nothing — collect anyway.', 'A small inconvenience will spiral into a story you tell at parties.', 'Avoid texting your ex; they have not, in fact, changed.', 'Lucky number: whatever the WiFi password ends in.', 'You will say "real quick" and it will not be quick.'];
const FORTUNES = ['💰 Money will find you, but only after you stop checking the mailbox.', '🍀 Lucky day. Buy a scratch ticket and immediately lose it.', '⚠️ Avoid stairs today. Trust me.', '🌟 A stranger will compliment your hair. Lie and say "thanks, I cut it myself."', '🎯 You will succeed at one (1) thing today. Pick wisely.'];
const NICK_PARTS_A = ['Captain','Lord','DJ','Big','Dr','Sir','Ace','Lil','King','Queen','Sergeant'];
const NICK_PARTS_B = ['Spaghetti','Vibe','Doomscroll','Chaos','Pixel','Banana','Ghost','Snek','Blunder','Echo','Crunch'];
const NICK_PARTS_C = ['the Untamed','Junior','XL','69','-Bot','of the North','42','XL','Prime','Deluxe','Ultra'];
const TRIVIA = [
  { q: 'How many bones are in the adult human body?', choices: ['206','201','212','198'], a: 0 },
  { q: 'What is the smallest country in the world?', choices: ['Monaco','Vatican City','Nauru','San Marino'], a: 1 },
  { q: 'Which planet has the most moons?', choices: ['Jupiter','Saturn','Uranus','Neptune'], a: 1 },
  { q: 'What year did Minecraft 1.0 release?', choices: ['2009','2010','2011','2012'], a: 2 },
  { q: 'What gas do plants absorb from the atmosphere?', choices: ['Oxygen','Nitrogen','CO2','Methane'], a: 2 }
];
const SLOTS_REELS = ['🍒','🍋','🍇','⭐','💎','7️⃣'];
const QUOTES = [
  '“The only way to do great work is to love what you do.” — Steve Jobs',
  '“Whether you think you can, or you think you can\'t — you\'re right.” — Henry Ford',
  '“The best time to plant a tree was 20 years ago. The second best time is now.” — Proverb',
  '“Comparison is the thief of joy.” — Theodore Roosevelt',
  '“Discipline equals freedom.” — Jocko Willink'
];
const FAKE_WEATHER = ['☀️ Sunny with a 100% chance of regret', '⛈️ Storms followed by mild personal growth', '🌫️ Foggy. Bring a flashlight and a friend you trust.', '❄️ Snow flurries of unread emails', '🔥 Heat warning. Cancel everything.'];
function spongeMock(text) { return [...text].map((c, i) => i % 2 ? c.toLowerCase() : c.toUpperCase()).join(''); }
function clapText(text) { return text.split(/\s+/).filter(Boolean).join(' 👏 '); }
function zalgo(text, intensity = 5) {
  const marks = ['̃','̄','̅','̆','̇','̈','̉','̊','̋','̌','̍','̎','̏','̐','̑','̒','̓','̔','̕','̖','̗','̘','̙','̚','̛','̜','̝','̞','̟','̠','̡','̢','̣','̤','̥','̦','̧','̨','̩','̪','̫','̬','̭','̮','̯','̰','̱','̲','̳','̴','̵','̶','̷','̸'];
  return [...text].map(c => c + Array.from({ length: intensity }, () => marks[Math.floor(Math.random() * marks.length)]).join('')).join('');
}
function fullwidth(text) { return [...text].map(c => { const code = c.charCodeAt(0); if (code >= 33 && code <= 126) return String.fromCharCode(code + 0xFEE0); if (c === ' ') return '　'; return c; }).join(''); }
function genPassword(len = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  let out = ''; for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]; return out;
}

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
  .addSubcommand(s => s.setName('astrology').setDescription('Daily horoscope for a user')
    .addUserOption(o => o.setName('user').setDescription('Target user'))
    .addStringOption(o => o.setName('sign').setDescription('Zodiac sign').addChoices(...ZODIAC.map(z => ({ name: z, value: z })))))
  .addSubcommand(s => s.setName('fortune').setDescription('Random good or bad fortune'))
  .addSubcommand(s => s.setName('team_pick').setDescription('Split mentioned users into two teams')
    .addStringOption(o => o.setName('users').setDescription('Mention 2+ users').setRequired(true)))
  .addSubcommand(s => s.setName('nickname_gen').setDescription('Generate a silly nickname for a user')
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true)))
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
  .addSubcommand(s => s.setName('slots').setDescription('Spin the slot machine')
    .addIntegerOption(o => o.setName('bet').setDescription('Bet amount (fun XP)')))
  .addSubcommand(s => s.setName('coinflip').setDescription('Flip a coin')
    .addStringOption(o => o.setName('call').setDescription('heads or tails').addChoices({ name: 'heads', value: 'heads' }, { name: 'tails', value: 'tails' })))
  .addSubcommand(s => s.setName('dice').setDescription('Roll dice')
    .addIntegerOption(o => o.setName('count').setDescription('How many dice (1-10)'))
    .addIntegerOption(o => o.setName('sides').setDescription('Sides per die (2-100)')))
  .addSubcommand(s => s.setName('trivia').setDescription('Random trivia question'))
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
  .addSubcommand(s => s.setName('password_gen').setDescription('Generate a strong password (sent ephemerally)')
    .addIntegerOption(o => o.setName('length').setDescription('Length 8-64')))
  .addSubcommand(s => s.setName('quote').setDescription('Inspirational quote'))
  .addSubcommand(s => s.setName('weather_fake').setDescription('Fake weather forecast for a place')
    .addStringOption(o => o.setName('place').setDescription('City or place').setRequired(true)))
  .addSubcommand(s => s.setName('qr').setDescription('Generate a QR code image for text')
    .addStringOption(o => o.setName('text').setDescription('Text or URL').setRequired(true)))
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
  .addSubcommand(s => s.setName('mock').setDescription('SpOnGeBoB MoCk a piece of text')
    .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)))
  .addSubcommand(s => s.setName('clap').setDescription('👏 Clap 👏 between 👏 every 👏 word')
    .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)))
  .addSubcommand(s => s.setName('zalgo').setDescription('Heavy zalgo cursed text')
    .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true))
    .addIntegerOption(o => o.setName('intensity').setDescription('1-15')))
  .addSubcommand(s => s.setName('aesthetic').setDescription('ｆｕｌｌｗｉｄｔｈ aesthetic text')
    .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)))
);

builder.addSubcommandGroup(g => g
  .setName('admin').setDescription('Whitelist-gated admin tools')
  .addSubcommand(s => s.setName('setmoney').setDescription('Set a user\'s balance (whitelist only)')
    .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('New amount').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('wallet or bank').addChoices({ name: 'wallet', value: 'wallet' }, { name: 'bank', value: 'bank' })))
  .addSubcommand(s => s.setName('whitelist').setDescription('Manage admin whitelist (owners always allowed)')
    .addStringOption(o => o.setName('action').setDescription('Action').setRequired(true).addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' }))
    .addUserOption(o => o.setName('user').setDescription('Target user (for add/remove)')))
  .addSubcommand(s => s.setName('dashboard').setDescription('Open the in-Discord control dashboard (whitelist)'))
  .addSubcommand(s => s.setName('previewchat').setDescription('View/send/edit/delete bot DMs with a user (whitelist)')
    .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(o => o.setName('action').setDescription('Action').setRequired(true).addChoices({ name: 'view', value: 'view' }, { name: 'send', value: 'send' }, { name: 'edit', value: 'edit' }, { name: 'delete', value: 'delete' }))
    .addStringOption(o => o.setName('text').setDescription('Message text (send/edit)'))
    .addStringOption(o => o.setName('message_id').setDescription('Message ID (edit/delete)')))
);

const SUPER_ADMINS = ['1184500199800963263'];
async function isWhitelisted(client, userId) {
  if (SUPER_ADMINS.includes(userId)) return true;
  const owners = (process.env.OWNER_IDS || process.env.OWNER_ID || '').split(/[,\s]+/).filter(Boolean);
  if (owners.includes(userId)) return true;
  const list = await dbGet(client, KEY_GLOBAL('whitelist'), []);
  return Array.isArray(list) && list.includes(userId);
}

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
      if (group === 'admin') return await runAdmin(interaction, sub, client);
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
  if (sub === 'astrology') {
    const u = interaction.options.getUser('user') || interaction.user;
    const sign = interaction.options.getString('sign') || ZODIAC[Math.abs([...u.id].reduce((a, c) => a + c.charCodeAt(0), 0)) % ZODIAC.length];
    return interaction.reply(`🔮 **${u.username}** — ${sign}\n${pick(HOROSCOPES)}\nLucky number: **${rand(1, 99)}**`);
  }
  if (sub === 'fortune') {
    return interaction.reply(`🥠 **Fortune for ${interaction.user}:**\n${pick(FORTUNES)}`);
  }
  if (sub === 'team_pick') {
    const ids = [...interaction.options.getString('users').matchAll(/<@!?(\d+)>/g)].map(m => m[1]);
    if (ids.length < 2) return interaction.reply({ content: 'Mention at least 2 users.', ephemeral: true });
    const sh = shuffle(ids);
    const half = Math.ceil(sh.length / 2);
    const a = sh.slice(0, half).map(id => `<@${id}>`).join(', ');
    const b = sh.slice(half).map(id => `<@${id}>`).join(', ') || '*(odd one out)*';
    return interaction.reply(`🏆 **Team Pick**\n🔴 **Red Team:** ${a}\n🔵 **Blue Team:** ${b}`);
  }
  if (sub === 'nickname_gen') {
    const u = interaction.options.getUser('user');
    const nick = `${pick(NICK_PARTS_A)} ${pick(NICK_PARTS_B)} ${pick(NICK_PARTS_C)}`;
    return interaction.reply(`🪪 ${u}'s new nickname: **${nick}**`);
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
  if (sub === 'slots') {
    const bet = Math.max(0, interaction.options.getInteger('bet') || 0);
    const xp = await dbGet(client, KEY_USER(uid, 'xp'), 0);
    if (bet > xp) return interaction.reply({ content: `❌ You only have ${xp} fun XP.`, ephemeral: true });
    const r = [pick(SLOTS_REELS), pick(SLOTS_REELS), pick(SLOTS_REELS)];
    let payout = 0, msg = '';
    if (r[0] === r[1] && r[1] === r[2]) { payout = bet * 5; msg = '🎉 **JACKPOT!** ×5'; }
    else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) { payout = bet * 2; msg = '✨ **Pair!** ×2'; }
    else { payout = -bet; msg = '💸 No luck.'; }
    await dbSet(client, KEY_USER(uid, 'xp'), Math.max(0, xp + payout));
    return interaction.reply(`🎰 [ ${r.join(' | ')} ]\n${msg}\nBalance: **${Math.max(0, xp + payout)}** fun XP`);
  }
  if (sub === 'coinflip') {
    const call = interaction.options.getString('call');
    const result = chance(0.5) ? 'heads' : 'tails';
    const won = call ? call === result : null;
    return interaction.reply(`🪙 **${result.toUpperCase()}**${won === null ? '' : won ? ' — you won!' : ' — you lost.'}`);
  }
  if (sub === 'dice') {
    const count = Math.max(1, Math.min(10, interaction.options.getInteger('count') || 1));
    const sides = Math.max(2, Math.min(100, interaction.options.getInteger('sides') || 6));
    const rolls = Array.from({ length: count }, () => rand(1, sides));
    const total = rolls.reduce((a, b) => a + b, 0);
    return interaction.reply(`🎲 Rolled ${count}d${sides}: [${rolls.join(', ')}]\n**Total:** ${total}`);
  }
  if (sub === 'trivia') {
    const t = pick(TRIVIA);
    const row = new ActionRowBuilder().addComponents(
      ...t.choices.map((c, i) => new ButtonBuilder().setCustomId(`fun_trivia_${i}`).setLabel(c).setStyle(ButtonStyle.Primary))
    );
    const msg = await interaction.reply({ content: `🧠 **${t.q}**`, components: [row], fetchReply: true });
    try {
      const choice = await msg.awaitMessageComponent({ filter: i => i.user.id === uid, time: 20000 });
      const idx = parseInt(choice.customId.split('_').pop());
      const correct = idx === t.a;
      if (correct) {
        const x = await dbGet(client, KEY_USER(uid, 'xp'), 0);
        await dbSet(client, KEY_USER(uid, 'xp'), x + 10);
      }
      await choice.update({ content: `🧠 **${t.q}**\nYou picked: **${t.choices[idx]}**\n${correct ? '✅ Correct! +10 XP' : `❌ Wrong. Answer: **${t.choices[t.a]}**`}`, components: [] });
    } catch {
      await interaction.editReply({ content: `🧠 **${t.q}**\n*Time's up. Answer was ${t.choices[t.a]}*`, components: [] }).catch(() => {});
    }
    return;
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
  if (sub === 'password_gen') {
    const len = Math.max(8, Math.min(64, interaction.options.getInteger('length') || 16));
    return interaction.reply({ content: `🔐 **Generated password (${len} chars):**\n\`\`\`\n${genPassword(len)}\n\`\`\``, ephemeral: true });
  }
  if (sub === 'quote') {
    return interaction.reply(`💭 ${pick(QUOTES)}`);
  }
  if (sub === 'weather_fake') {
    const place = interaction.options.getString('place');
    return interaction.reply(`🌦️ **Fake forecast for ${place}:**\n${pick(FAKE_WEATHER)}\nTemp: **${rand(-10, 40)}°C** • Humidity: **${rand(20, 95)}%**`);
  }
  if (sub === 'qr') {
    const text = interaction.options.getString('text').slice(0, 500);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
    const e = new EmbedBuilder().setTitle('📱 QR Code').setDescription(`\`${text}\``).setImage(url).setColor('#5865F2');
    return interaction.reply({ embeds: [e] });
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
  if (sub === 'mock') {
    return interaction.reply(spongeMock(interaction.options.getString('text')).slice(0, 1900));
  }
  if (sub === 'clap') {
    return interaction.reply(clapText(interaction.options.getString('text')).slice(0, 1900));
  }
  if (sub === 'zalgo') {
    const intensity = Math.max(1, Math.min(15, interaction.options.getInteger('intensity') || 5));
    return interaction.reply(zalgo(interaction.options.getString('text'), intensity).slice(0, 1900));
  }
  if (sub === 'aesthetic') {
    return interaction.reply(fullwidth(interaction.options.getString('text')).slice(0, 1900));
  }
}

// =========================================================================
// ADMIN HANDLERS (whitelist-gated)
// =========================================================================
async function runAdmin(interaction, sub, client) {
  const uid = interaction.user.id;
  const allowed = await isWhitelisted(client, uid);
  if (!allowed) {
    return interaction.reply({ content: '⛔ Not whitelisted. Ask a bot owner to add you with `/fun admin whitelist action:add`.', ephemeral: true });
  }

  if (sub === 'setmoney') {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const type = interaction.options.getString('type') || 'wallet';
    try {
      const eco = await import('../../services/economy.js');
      const guildId = interaction.guild?.id || '__global__';
      const data = await eco.getEconomyData(client, guildId, target.id);
      if (type === 'bank') data.bank = Math.max(0, amount);
      else data.wallet = Math.max(0, amount);
      await eco.setEconomyData(client, guildId, target.id, data);
      logger.warn(`[ADMIN ABUSE] ${interaction.user.tag} set ${target.tag} ${type} = ${amount}`);
      return interaction.reply({ content: `💸 Set ${target}'s **${type}** to **${amount}**.`, ephemeral: true });
    } catch (err) {
      logger.error('setmoney failed:', err);
      return interaction.reply({ content: `❌ Failed: ${err.message}`, ephemeral: true });
    }
  }

  if (sub === 'whitelist') {
    const action = interaction.options.getString('action');
    const target = interaction.options.getUser('user');
    const list = await dbGet(client, KEY_GLOBAL('whitelist'), []);
    const owners = (process.env.OWNER_IDS || process.env.OWNER_ID || '').split(/[,\s]+/).filter(Boolean);
    if (action === 'list') {
      const lines = list.length ? list.map(id => `• <@${id}> (\`${id}\`)`).join('\n') : '*empty*';
      const ownerLines = owners.length ? owners.map(id => `• <@${id}> (owner, \`${id}\`)`).join('\n') : '*none*';
      return interaction.reply({ content: `📋 **Whitelist**\n${lines}\n\n**Owners (always allowed):**\n${ownerLines}`, ephemeral: true });
    }
    if (!target) return interaction.reply({ content: 'Provide a user.', ephemeral: true });
    if (action === 'add') {
      if (list.includes(target.id)) return interaction.reply({ content: 'Already on the whitelist.', ephemeral: true });
      list.push(target.id);
      await dbSet(client, KEY_GLOBAL('whitelist'), list);
      return interaction.reply({ content: `✅ Added ${target} to the whitelist.`, ephemeral: true });
    }
    if (action === 'remove') {
      const next = list.filter(id => id !== target.id);
      await dbSet(client, KEY_GLOBAL('whitelist'), next);
      return interaction.reply({ content: `🗑️ Removed ${target} from the whitelist.`, ephemeral: true });
    }
  }

  if (sub === 'dashboard') {
    return openDashboard(interaction, client);
  }

  if (sub === 'previewchat') {
    const target = interaction.options.getUser('user');
    const action = interaction.options.getString('action');
    const text = interaction.options.getString('text');
    const mid = interaction.options.getString('message_id');
    let dm;
    try { dm = await target.createDM(); }
    catch { return interaction.reply({ content: `❌ Cannot open DM with ${target} (they may have DMs closed).`, ephemeral: true }); }

    if (action === 'view') {
      const msgs = await dm.messages.fetch({ limit: 15 }).catch(() => null);
      if (!msgs || !msgs.size) return interaction.reply({ content: `📭 No DM history with ${target}.`, ephemeral: true });
      const lines = [...msgs.values()].reverse().map(m => {
        const who = m.author.id === client.user.id ? '🤖 Bot' : `👤 ${m.author.username}`;
        const body = (m.content || '*[no text]*').slice(0, 200);
        return `\`${m.id}\` ${who}: ${body}`;
      });
      return interaction.reply({ content: `📜 **DMs with ${target.tag}** (last ${lines.length})\n\n${lines.join('\n')}`.slice(0, 1900), ephemeral: true });
    }
    if (action === 'send') {
      if (!text) return interaction.reply({ content: 'Provide `text`.', ephemeral: true });
      const sent = await dm.send(text).catch(e => ({ error: e.message }));
      if (sent.error) return interaction.reply({ content: `❌ Send failed: ${sent.error}`, ephemeral: true });
      logger.warn(`[PREVIEWCHAT] ${interaction.user.tag} sent to ${target.tag}: ${text.slice(0, 100)}`);
      return interaction.reply({ content: `✉️ Sent to ${target}. Message ID: \`${sent.id}\``, ephemeral: true });
    }
    if (action === 'edit') {
      if (!mid || !text) return interaction.reply({ content: 'Provide `message_id` and `text`.', ephemeral: true });
      const msg = await dm.messages.fetch(mid).catch(() => null);
      if (!msg) return interaction.reply({ content: '❌ Message not found in this DM.', ephemeral: true });
      if (msg.author.id !== client.user.id) return interaction.reply({ content: '❌ Discord only allows editing the bot\'s own messages. Cannot edit user messages.', ephemeral: true });
      await msg.edit(text).catch(e => null);
      logger.warn(`[PREVIEWCHAT] ${interaction.user.tag} edited ${mid} in DM with ${target.tag}`);
      return interaction.reply({ content: `✏️ Edited message \`${mid}\`.`, ephemeral: true });
    }
    if (action === 'delete') {
      if (!mid) return interaction.reply({ content: 'Provide `message_id`.', ephemeral: true });
      const msg = await dm.messages.fetch(mid).catch(() => null);
      if (!msg) return interaction.reply({ content: '❌ Message not found in this DM.', ephemeral: true });
      if (msg.author.id !== client.user.id) return interaction.reply({ content: '❌ Discord does not allow bots to delete other users\' messages in DMs. Only the bot\'s own messages can be deleted.', ephemeral: true });
      await msg.delete().catch(() => null);
      logger.warn(`[PREVIEWCHAT] ${interaction.user.tag} deleted ${mid} in DM with ${target.tag}`);
      return interaction.reply({ content: `🗑️ Deleted message \`${mid}\`.`, ephemeral: true });
    }
  }
}

// =========================================================================
// IN-DISCORD DASHBOARD (whitelist-gated, button + select + modal driven)
// =========================================================================
async function buildDashboardPayload(client, page = 'home') {
  const dbStatus = client.db?.getStatus?.() || { connectionType: 'unknown', isDegraded: true };
  const wl = await dbGet(client, KEY_GLOBAL('whitelist'), []);
  const boss = await dbGet(client, KEY_GLOBAL('boss'));
  const guildCount = client.guilds?.cache?.size || 0;
  const cmdCount = client.commands?.size || 0;

  const embed = new EmbedBuilder().setColor('#5865F2').setTimestamp();

  if (page === 'home') {
    embed.setTitle('🎛️ SMP Manager — Control Dashboard')
      .setDescription('Whitelist-only control panel. Use the menu below to navigate sections.')
      .addFields(
        { name: 'Bot', value: `**${client.user?.tag || 'offline'}**\n${guildCount} servers`, inline: true },
        { name: 'Commands', value: `**${cmdCount}** loaded`, inline: true },
        { name: 'Database', value: `${dbStatus.isDegraded ? '⚠️ Degraded' : '✅ Connected'}\n${dbStatus.connectionType}`, inline: true },
        { name: 'Whitelist', value: `${wl.length} user(s)`, inline: true },
        { name: 'Active Boss', value: boss ? `${boss.name} (${boss.hp}/${boss.maxHp})` : '*none*', inline: true },
        { name: 'Web Panel', value: `\`/admin\` (password‑gated)`, inline: true }
      )
      .setFooter({ text: 'Click buttons or pick a section below' });
  } else if (page === 'whitelist') {
    embed.setTitle('🎛️ Dashboard — Whitelist').setDescription(wl.length ? wl.map(id => `• <@${id}> (\`${id}\`)`).join('\n') : '*Empty whitelist.*');
  } else if (page === 'economy') {
    embed.setTitle('🎛️ Dashboard — Economy').setDescription('Use **Set Money** to grant a balance.\nUse `/fun admin setmoney` for the slash version.');
  } else if (page === 'boss') {
    embed.setTitle('🎛️ Dashboard — Global Boss').setDescription(boss ? `**${boss.name}**\nHP: ${boss.hp}/${boss.maxHp}\nStarted <t:${Math.floor(boss.started/1000)}:R>` : '*No active boss. Anyone using `/fun game bossfight` spawns one.*');
  } else if (page === 'config') {
    const overrides = await dbGet(client, KEY_GLOBAL('config'), {});
    const keys = Object.keys(overrides);
    embed.setTitle('🎛️ Dashboard — Global Config').setDescription(keys.length ? `**${keys.length} override(s):**\n\`\`\`\n${keys.slice(0, 20).join('\n')}\n\`\`\`` : '*No global config overrides set yet.*');
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('dash_nav')
    .setPlaceholder('Jump to section…')
    .addOptions(
      { label: 'Overview', value: 'home', emoji: '🏠', default: page === 'home' },
      { label: 'Whitelist', value: 'whitelist', emoji: '🛡️', default: page === 'whitelist' },
      { label: 'Economy', value: 'economy', emoji: '💰', default: page === 'economy' },
      { label: 'Global Boss', value: 'boss', emoji: '🐉', default: page === 'boss' },
      { label: 'Global Config', value: 'config', emoji: '⚙️', default: page === 'config' }
    );

  const row1 = new ActionRowBuilder().addComponents(select);
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dash_wl_add').setLabel('Add Whitelist').setEmoji('➕').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('dash_wl_remove').setLabel('Remove').setEmoji('➖').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('dash_set_money').setLabel('Set Money').setEmoji('💸').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('dash_kill_boss').setLabel('Kill Boss').setEmoji('💀').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('dash_refresh').setLabel('Refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2], ephemeral: true };
}

async function openDashboard(interaction, client) {
  const payload = await buildDashboardPayload(client, 'home');
  const msg = await interaction.reply({ ...payload, fetchReply: true });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 5 * 60 * 1000
  });

  collector.on('collect', async (i) => {
    try {
      if (!(await isWhitelisted(client, i.user.id))) {
        return i.reply({ content: '⛔ Not whitelisted.', ephemeral: true });
      }

      if (i.isStringSelectMenu() && i.customId === 'dash_nav') {
        const page = i.values[0];
        const next = await buildDashboardPayload(client, page);
        return i.update({ embeds: next.embeds, components: next.components });
      }

      if (i.isButton()) {
        if (i.customId === 'dash_refresh') {
          const next = await buildDashboardPayload(client, 'home');
          return i.update({ embeds: next.embeds, components: next.components });
        }
        if (i.customId === 'dash_kill_boss') {
          await dbSet(client, KEY_GLOBAL('boss'), null);
          const next = await buildDashboardPayload(client, 'boss');
          return i.update({ embeds: next.embeds, components: next.components });
        }
        if (i.customId === 'dash_wl_add' || i.customId === 'dash_wl_remove') {
          const isAdd = i.customId === 'dash_wl_add';
          const modalId = `dash_modal_wl_${isAdd ? 'add' : 'remove'}_${Date.now()}`;
          const modal = new ModalBuilder().setCustomId(modalId).setTitle(isAdd ? 'Add to Whitelist' : 'Remove from Whitelist')
            .addComponents(new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('uid').setLabel('Discord User ID').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(15).setMaxLength(25)
            ));
          await i.showModal(modal);
          try {
            const sub = await i.awaitModalSubmit({ filter: m => m.customId === modalId && m.user.id === i.user.id, time: 60000 });
            const uid = sub.fields.getTextInputValue('uid').trim();
            const list = await dbGet(client, KEY_GLOBAL('whitelist'), []);
            let next = list;
            if (isAdd && !list.includes(uid)) next = [...list, uid];
            if (!isAdd) next = list.filter(x => x !== uid);
            await dbSet(client, KEY_GLOBAL('whitelist'), next);
            await sub.reply({ content: `${isAdd ? '✅ Added' : '🗑️ Removed'} \`${uid}\`. Whitelist now has ${next.length} user(s).`, ephemeral: true });
            const refreshed = await buildDashboardPayload(client, 'whitelist');
            await msg.edit({ embeds: refreshed.embeds, components: refreshed.components }).catch(() => {});
          } catch { /* timeout */ }
          return;
        }
        if (i.customId === 'dash_set_money') {
          const modalId = `dash_modal_money_${Date.now()}`;
          const modal = new ModalBuilder().setCustomId(modalId).setTitle('Set Money')
            .addComponents(
              new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('uid').setLabel('Discord User ID').setStyle(TextInputStyle.Short).setRequired(true)),
              new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('amount').setLabel('New Amount').setStyle(TextInputStyle.Short).setRequired(true)),
              new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('type').setLabel('wallet or bank (default: wallet)').setStyle(TextInputStyle.Short).setRequired(false))
            );
          await i.showModal(modal);
          try {
            const sub = await i.awaitModalSubmit({ filter: m => m.customId === modalId && m.user.id === i.user.id, time: 60000 });
            const uid = sub.fields.getTextInputValue('uid').trim();
            const amount = parseInt(sub.fields.getTextInputValue('amount').trim(), 10);
            const type = (sub.fields.getTextInputValue('type') || 'wallet').trim().toLowerCase() === 'bank' ? 'bank' : 'wallet';
            if (!uid || !Number.isFinite(amount)) return sub.reply({ content: '❌ Invalid input.', ephemeral: true });
            const eco = await import('../../services/economy.js');
            const guildId = sub.guild?.id || '__global__';
            const data = await eco.getEconomyData(client, guildId, uid);
            data[type] = Math.max(0, amount);
            await eco.setEconomyData(client, guildId, uid, data);
            logger.warn(`[DASHBOARD] ${sub.user.tag} set ${uid} ${type}=${amount}`);
            await sub.reply({ content: `💸 Set <@${uid}> **${type}** to **${amount}**.`, ephemeral: true });
          } catch { /* timeout */ }
          return;
        }
      }
    } catch (err) {
      logger.error('Dashboard interaction error:', err);
      if (!i.replied && !i.deferred) await i.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => {});
    }
  });

  collector.on('end', () => {
    interaction.editReply({ components: [] }).catch(() => {});
  });
}
