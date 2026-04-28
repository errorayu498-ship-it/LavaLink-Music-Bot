const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const { Manager } = require('erela.js');
const Spotify = require('erela.js-spotify');
const Facebook = require('erela.js-facebook');
const AppleMusic = require('erela.js-apple');
const Deezer = require('erela.js-deezer');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    allowedMentions: { parse: ['users', 'roles'] }
});

// Collections
client.commands = new Collection();
client.prefixCommands = new Map();
client.slashCommands = new Collection();
client.aliases = new Collection();
client.cooldowns = new Collection();
client.playerManager = new Map();

// Music Manager Setup
client.manager = new Manager({
    nodes: [{
        host: process.env.LAVALINK_HOST,
        port: process.env.LAVALINK_PORT,
        password: process.env.LAVALINK_PASSWORD,
        secure: false,
        retryDelay: 5000
    }],
    plugins: [
        new Spotify({
            clientID: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET
        }),
        new Facebook(),
        new AppleMusic(),
        new Deezer()
    ],
    autoPlay: true,
    send(id, payload) {
        const guild = client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
    }
});

// Embed Color Configuration
client.embedColor = process.env.EMBED_COLOR || '#FF0000';
client.developer = process.env.DEVELOPER || 'SUBHAN';
client.prefix = process.env.PREFIX || '!';

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log(chalk.green('[DATABASE] ✅ Connected to MongoDB'));
}).catch(err => {
    console.log(chalk.red('[DATABASE] ❌ MongoDB Connection Error:', err));
});

// Load Models
const GuildModel = require('./models/guild');
const UserModel = require('./models/user');

// Load Commands
const loadCommands = () => {
    const commandFolders = fs.readdirSync('./commands');
    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`./commands/${folder}/${file}`);
            if (command.data) {
                client.slashCommands.set(command.data.name, command);
            }
            if (command.name) {
                client.prefixCommands.set(command.name, command);
                if (command.aliases) {
                    command.aliases.forEach(alias => client.aliases.set(alias, command.name));
                }
            }
        }
    }
};

// Load Utilities
const EmbedBuilder = require('./utils/embed');
const CanvasUtil = require('./utils/canvas');
const Logger = require('./utils/logger');

// Music Event Handling
client.manager.on('nodeConnect', node => {
    console.log(chalk.green(`[LAVALINK] ✅ Node connected: ${node.options.host}`));
});

client.manager.on('nodeError', (node, error) => {
    console.log(chalk.red(`[LAVALINK] ❌ Node error: ${node.options.host}`, error));
});

client.manager.on('trackStart', async (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (!channel) return;

    const embed = EmbedBuilder.musicEmbed('Now Playing', client.embedColor)
        .setDescription(`**[${track.title}](${track.uri})**`)
        .addFields(
            { name: '👤 Artist', value: track.author, inline: true },
            { name: '⏱️ Duration', value: formatDuration(track.duration), inline: true },
            { name: '🔊 Volume', value: `${player.volume}%`, inline: true },
            { name: '🎵 Source', value: track.sourceName || 'Unknown', inline: true },
            { name: '📻 Requested By', value: `<@${track.requester.id}>`, inline: true }
        )
        .setThumbnail(track.displayThumbnail('maxresdefault'))
        .setFooter({ text: `🎶 Developed by ${client.developer}` });

    const msg = await channel.send({ embeds: [embed] });
    
    // Create player buttons
    if (msg) {
        await createPlayerButtons(msg);
    }
});

client.manager.on('trackEnd', async (player, track) => {
    // Auto-play next track
});

client.manager.on('queueEnd', async (player) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (channel) {
        const embed = EmbedBuilder.musicEmbed('Queue Ended', client.embedColor)
            .setDescription('✅ Queue has ended. Add more songs to keep the music going!')
            .setFooter({ text: `🎶 Developed by ${client.developer}` });
        channel.send({ embeds: [embed] });
    }
    player.destroy();
});

// Helper Functions
function formatDuration(duration) {
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

async function createPlayerButtons(message) {
    const row = {
        type: 1,
        components: [
            {
                type: 2,
                style: 2,
                custom_id: 'player_pause',
                emoji: { name: '⏯️' }
            },
            {
                type: 2,
                style: 2,
                custom_id: 'player_skip',
                emoji: { name: '⏭️' }
            },
            {
                type: 2,
                style: 2,
                custom_id: 'player_stop',
                emoji: { name: '⏹️' }
            },
            {
                type: 2,
                style: 2,
                custom_id: 'player_shuffle',
                emoji: { name: '🔀' }
            },
            {
                type: 2,
                style: 2,
                custom_id: 'player_loop',
                emoji: { name: '🔁' }
            }
        ]
    };
    
    const row2 = {
        type: 1,
        components: [
            {
                type: 2,
                style: 2,
                custom_id: 'player_volume_down',
                emoji: { name: '🔉' }
            },
            {
                type: 2,
                style: 2,
                custom_id: 'player_volume_up',
                emoji: { name: '🔊' }
            },
            {
                type: 2,
                style: 2,
                custom_id: 'player_queue',
                emoji: { name: '📋' }
            },
            {
                type: 2,
                style: 2,
                custom_id: 'player_nowplaying',
                emoji: { name: '🎵' }
            },
            {
                type: 2,
                style: 2,
                custom_id: 'player_lyrics',
                emoji: { name: '📝' }
            }
        ]
    };

    await message.edit({ components: [row, row2] });
}

// Interaction Handler
client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const command = client.slashCommands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(error);
            const embed = EmbedBuilder.errorEmbed('Error', client.embedColor)
                .setDescription('An error occurred while executing this command.');
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }

    if (interaction.isButton()) {
        await handlePlayerButtons(interaction, client);
    }
});

// Message Handler for Prefix Commands
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    
    const prefix = client.prefix;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.prefixCommands.get(commandName) || 
                   client.prefixCommands.get(client.aliases.get(commandName));

    if (!command) return;

    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(error);
        const embed = EmbedBuilder.errorEmbed('Error', client.embedColor)
            .setDescription('An error occurred while executing this command.');
        message.reply({ embeds: [embed] });
    }
});

// Button Handler
async function handlePlayerButtons(interaction, client) {
    const player = client.manager.players.get(interaction.guildId);
    if (!player) {
        return interaction.reply({ 
            embeds: [EmbedBuilder.errorEmbed('No Player', client.embedColor)
                .setDescription('There is no active player in this server.')], 
            ephemeral: true 
        });
    }

    const customId = interaction.customId;

    try {
        switch(customId) {
            case 'player_pause':
                if (player.paused) {
                    player.pause(false);
                    await interaction.reply({ 
                        embeds: [EmbedBuilder.musicEmbed('Resumed', client.embedColor)
                            .setDescription('▶️ Music has been resumed.')], 
                        ephemeral: true 
                    });
                } else {
                    player.pause(true);
                    await interaction.reply({ 
                        embeds: [EmbedBuilder.musicEmbed('Paused', client.embedColor)
                            .setDescription('⏸️ Music has been paused.')], 
                        ephemeral: true 
                    });
                }
                break;

            case 'player_skip':
                player.stop();
                await interaction.reply({ 
                    embeds: [EmbedBuilder.musicEmbed('Skipped', client.embedColor)
                        .setDescription('⏭️ Current track has been skipped.')], 
                    ephemeral: true 
                });
                break;

            case 'player_stop':
                player.destroy();
                await interaction.reply({ 
                    embeds: [EmbedBuilder.musicEmbed('Stopped', client.embedColor)
                        .setDescription('⏹️ Music has been stopped and player destroyed.')], 
                    ephemeral: true 
                });
                break;

            case 'player_shuffle':
                player.queue.shuffle();
                await interaction.reply({ 
                    embeds: [EmbedBuilder.musicEmbed('Shuffled', client.embedColor)
                        .setDescription('🔀 Queue has been shuffled.')], 
                    ephemeral: true 
                });
                break;

            case 'player_loop':
                const loopModes = { 0: '🔁 Track', 1: '🔂 Queue', 2: '❌ None' };
                const newLoop = player.trackRepeat ? 2 : player.queueRepeat ? 0 : 1;
                
                player.setTrackRepeat(newLoop === 0);
                player.setQueueRepeat(newLoop === 1);
                
                await interaction.reply({ 
                    embeds: [EmbedBuilder.musicEmbed('Loop Mode', client.embedColor)
                        .setDescription(`Loop mode set to: ${loopModes[newLoop]}`)], 
                    ephemeral: true 
                });
                break;

            case 'player_volume_down':
                const newVolDown = Math.max(0, player.volume - 10);
                player.setVolume(newVolDown);
                await interaction.reply({ 
                    embeds: [EmbedBuilder.musicEmbed('Volume', client.embedColor)
                        .setDescription(`🔉 Volume decreased to: ${newVolDown}%`)], 
                    ephemeral: true 
                });
                break;

            case 'player_volume_up':
                const newVolUp = Math.min(100, player.volume + 10);
                player.setVolume(newVolUp);
                await interaction.reply({ 
                    embeds: [EmbedBuilder.musicEmbed('Volume', client.embedColor)
                        .setDescription(`🔊 Volume increased to: ${newVolUp}%`)], 
                    ephemeral: true 
                });
                break;

            case 'player_queue':
                const queueEmbed = EmbedBuilder.musicEmbed('Queue', client.embedColor)
                    .setDescription(player.queue.length > 0 
                        ? player.queue.slice(0, 10).map((track, i) => 
                            `**${i + 1}.** ${track.title} - ${track.author} \`${formatDuration(track.duration)}\``
                        ).join('\n')
                        : 'Queue is empty')
                    .setFooter({ text: `Total songs: ${player.queue.length} | Developed by ${client.developer}` });
                await interaction.reply({ embeds: [queueEmbed], ephemeral: true });
                break;

            case 'player_nowplaying':
                const track = player.queue.current;
                if (!track) {
                    return interaction.reply({ 
                        embeds: [EmbedBuilder.errorEmbed('No Track', client.embedColor)
                            .setDescription('No track is currently playing.')], 
                        ephemeral: true 
                    });
                }
                
                const nowPlayingEmbed = EmbedBuilder.musicEmbed('Now Playing', client.embedColor)
                    .setDescription(`**[${track.title}](${track.uri})**`)
                    .addFields(
                        { name: 'Artist', value: track.author, inline: true },
                        { name: 'Duration', value: formatDuration(track.duration), inline: true },
                        { name: 'Volume', value: `${player.volume}%`, inline: true },
                        { name: 'Requested By', value: `<@${track.requester.id}>`, inline: true }
                    )
                    .setThumbnail(track.displayThumbnail('maxresdefault'));
                await interaction.reply({ embeds: [nowPlayingEmbed], ephemeral: true });
                break;

            case 'player_lyrics':
                // Lyrics implementation
                await interaction.reply({ 
                    embeds: [EmbedBuilder.musicEmbed('Lyrics', client.embedColor)
                        .setDescription('🎵 Lyrics feature coming soon!')], 
                    ephemeral: true 
                });
                break;
        }
    } catch (error) {
        console.error(error);
        await interaction.reply({ 
            embeds: [EmbedBuilder.errorEmbed('Error', client.embedColor)
                .setDescription('An error occurred while processing your request.')], 
            ephemeral: true 
        });
    }
}

// Premium System
client.checkPremium = async function(userId) {
    const user = await UserModel.findOne({ userId });
    return user && user.premium && user.premium.expiresAt > Date.now();
};

// Ready Event
client.once('ready', () => {
    console.log(chalk.cyan(`
    ╔══════════════════════════════════════╗
    ║      🎵 Advanced Music Bot 🎵      ║
    ║       Developed by ${client.developer}      ║
    ║         Bot is Online! ✅          ║
    ╚══════════════════════════════════════╝
    `));
    
    console.log(chalk.green(`Logged in as: ${client.user.tag}`));
    console.log(chalk.green(`Serving: ${client.guilds.cache.size} servers`));
    console.log(chalk.green(`Prefix: ${client.prefix}`));
    
    // Set Status
    client.user.setPresence({
        activities: [{ 
            name: `${client.prefix}help | ${client.guilds.cache.size} servers`, 
            type: 2 
        }],
        status: 'online'
    });
    
    // Initialize Manager
    client.manager.init(client.user.id);

    // Register Slash Commands
    const commands = [];
    client.slashCommands.forEach(command => {
        if (command.data) commands.push(command.data.toJSON());
    });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    (async () => {
        try {
            console.log(chalk.yellow('Registering slash commands...'));
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands }
            );
            console.log(chalk.green('✅ Slash commands registered successfully'));
        } catch (error) {
            console.error(chalk.red('Error registering slash commands:', error));
        }
    })();
});

// Error Handling
process.on('unhandledRejection', (error) => {
    console.error(chalk.red('Unhandled promise rejection:', error));
});

process.on('uncaughtException', (error) => {
    console.error(chalk.red('Uncaught exception:', error));
});

client.on('error', (error) => {
    console.error(chalk.red('Client error:', error));
});

// Login
client.login(process.env.DISCORD_TOKEN);
