# SMP Manager / TitanBot

A modular Discord community bot (originally "Touchpoint Support") with an Express-based admin web panel.

## Recent additions (Apr 2026)
- `/fun` mega-command now has **60 subcommands** across social/game/useful/chaos + admin (still 100 top-level commands, under Discord's hard cap).
- New chaos: `mock`, `clap`, `zalgo`, `aesthetic`. New social: `astrology`, `fortune`, `team_pick`, `nickname_gen`. New game: `slots`, `coinflip`, `dice`, `trivia`. New useful: `password_gen`, `quote`, `weather_fake`, `qr`.
- `/fun admin dashboard` — interactive in-Discord control panel (whitelist-only): Overview / Whitelist / Economy / Boss / Config sections, button + select-menu + modal driven.
- **Multi-bot support**: setting `DISCORD_TOKEN_2` env var spawns a second Discord client (same code, same DB) alongside the primary. Only the primary serves the web panel.
- Hardcoded SUPER_ADMIN: `1184500199800963263` (always passes whitelist in both bot and web admin).

## Stack
- Node.js 18+ (ES modules)
- discord.js v14
- Express v5 (admin panel + health endpoints on port 5000)
- PostgreSQL (Replit built-in DB), with in-memory fallback
- node-cron for scheduled jobs

## Run
- `npm start` (workflow: `Start application`) — starts the bot + web server on port 5000
- The bot needs `DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID` to actually connect to Discord. Without them, the bot runs in **web-only mode** (web/admin still works, no Discord login).

## Admin Panel
- URL: `/admin` (login at `/admin/login`)
- Password: stored in `ADMIN_PASSWORD` env var (currently set to `172160`)
- Whitelisted GUI for editing safe config (presence, embed colors, economy, welcome/goodbye, custom commands). Does NOT allow raw file editing.

## Important Customizations
- **Global config**: `getGuildConfigKey` in `src/utils/database.js` ignores `guildId` and always returns the same key (`guild:__global__:config`). One config is shared by every server the bot joins. Touches all 99+ commands automatically through the existing `guildConfig` service.
- **Server snapshot (`!saveserver` / `!loadserver`)**: stored under one global key (`global:server:snapshot`) instead of per-guild. Saving in any server overwrites the same snapshot; loading in any server restores from it.
- **`/fun` command**: bundles 40 new sub-features into one slash command to stay under Discord's 100-command-per-app cap. Groups: `social`, `game`, `useful`, `chaos`. Lives at `src/commands/Fun/fun.js`. AI-style commands intentionally omitted (no LLM key).

## Project Layout
- `src/app.js` — bot entry, web server, cron, shutdown handling. Discord login is wrapped in try/catch so a missing/invalid token doesn't crash the process.
- `src/commands/<Category>/*.js` — slash commands (auto-loaded recursively)
- `src/handlers/` — event/interaction/command-loader plumbing
- `src/services/` — business logic (guildConfig, economy, leveling, tickets, etc.)
- `src/web/adminRoutes.js` — admin panel routes + HTML
- `src/utils/database.js` — DB wrapper + key helpers
- `data/` — JSON data files (custom commands, config overrides)
- `scripts/` — migration/backup utilities

## Environment
- `DATABASE_URL`, `PG*` — Replit-provisioned PostgreSQL
- `ADMIN_PASSWORD` — admin panel password
- `PORT=5000`, `WEB_HOST=0.0.0.0`
- `OWNER_ID`, `OWNER_IDS` — bot owner Discord IDs (already set)
- `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` — required for actual Discord connection (not set; bot runs web-only)
