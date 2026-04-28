const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const { Manager } = require('erela.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Color logger without chalk
const log = {
    green: (m) => console.log(`\x1b[32m[INFO]\x1b[0m ${m}`),
    red: (m) => console.log(`\x1b[31m[ERROR]\x1b[0m ${m}`),
    yellow: (m) => console.log(`\x1b[33m[WARN]\x1b[0m ${m}`),
    cyan: (m) => console.log(`\x1b[36m[EVENT]\x1b[0m ${m}`),
    magenta: (m) => console.log(`\x1b[35m[CMD]\x1b[0m ${m}`)
};

// Client setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Config
client.config = {
    embedColor: process.env.EMBED_COLOR || '#FF0000',
    developer: process.env.DEVELOPER || 'SUBHAN',
    prefix: process.env.PREFIX || '!',
    ownerId: process.env.OWNER_ID
};

// Collections
client.commands = new Collection();
client.aliases = new Collection();
client.cooldowns = new Collection();

// Erela.js Manager (Without Spotify - Works 100%)
client.manager = new Manager({
    nodes: [
        {
            host: process.env.LAVALINK_HOST || 'localhost',
            port: parseInt(process.env.LAVALINK_PORT) || 2333,
            password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
            secure: false,
            retryDelay: 5000,
            retryAmount: 5
        }
    ],
    autoPlay: true,
    send(id, payload) {
        const guild = client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
    }
});

// MongoDB Connection
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(() => {
        log.green('Connected to MongoDB');
    }).catch(err => {
        log.red(`MongoDB Error: ${err.message}`);
    });
}

// Utility Functions
function formatDuration(ms) {
    if (!ms || isNaN(ms)) return '00:00';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function createProgressBar(player, track, size = 15) {
    if (!track || !track.duration || track.duration === 0) return '▬'.repeat(size);
    const progress = Math.round((size * player.position) / track.duration);
    const progressText = '▬'.repeat(Math.max(0, progress - 1));
    const emptyProgressText = '▬'.repeat(Math.max(0, size - progress - 1));

    if (progress === 0) return '🔘' + '▬'.repeat(size - 1);
    if (progress >= size) return '▬'.repeat(size - 1) + '🔘';
    return progressText + '🔘' + emptyProgressText;
}

function createEmbed(title, description, color) {
    return new EmbedBuilder()
        .setColor(color || client.config.embedColor)
        .setTitle(title)
        .setDescription(description || '')
        .setTimestamp()
        .setFooter({ text: `Developed by ${client.config.developer}` });
}

// Button Component Creator
function createMusicButtons() {
    return [
        {
            type: 1,
            components: [
                { type: 2, style: 2, custom_id: 'btn_pause', label: '⏯️' },
                { type: 2, style: 2, custom_id: 'btn_skip', label: '⏭️' },
                { type: 2, style: 2, custom_id: 'btn_stop', label: '⏹️' },
                { type: 2, style: 2, custom_id: 'btn_shuffle', label: '🔀' },
                { type: 2, style: 2, custom_id: 'btn_loop', label: '🔁' }
            ]
        },
        {
            type: 1,
            components: [
                { type: 2, style: 2, custom_id: 'btn_voldown', label: '🔉' },
                { type: 2, style: 2, custom_id: 'btn_volup', label: '🔊' },
                { type: 2, style: 2, custom_id: 'btn_queue', label: '📋' },
                { type: 2, style: 2, custom_id: 'btn_np', label: '🎵' },
                { type: 2, style: 2, custom_id: 'btn_lyrics', label: '📝' }
            ]
        }
    ];
}

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        try {
            const command = require(`./commands/${file}`);
            client.commands.set(command.name, command);
            if (command.aliases && Array.isArray(command.aliases)) {
                command.aliases.forEach(alias => client.aliases.set(alias, command.name));
            }
            log.green(`Loaded command: ${command.name}`);
        } catch (error) {
            log.red(`Failed to load ${file}: ${error.message}`);
        }
    }
}

// Lavalink Events
client.manager.on('nodeConnect', node => {
    log.green(`Lavalink Node Connected: ${node.options.host}`);
});

client.manager.on('nodeError', (node, error) => {
    log.red(`Lavalink Node Error: ${error.message}`);
});

client.manager.on('nodeReconnect', node => {
    log.yellow(`Lavalink Node Reconnecting: ${node.options.host}`);
});

client.manager.on('trackStart', async (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setAuthor({ name: '🎵 Now Playing', iconURL: client.user.displayAvatarURL() })
        .setDescription(`**[${track.title}](${track.uri})**`)
        .addFields(
            { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
            { name: '⏱️ Duration', value: formatDuration(track.duration), inline: true },
            { name: '🔊 Volume', value: `${player.volume}%`, inline: true },
            { name: '📻 Requested By', value: `<@${track.requester.id}>`, inline: true }
        )
        .setThumbnail(track.displayThumbnail ? track.displayThumbnail('maxresdefault') : null)
        .setFooter({ text: `🎶 Powered by ${client.config.developer}`, iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    try {
        const msg = await channel.send({ embeds: [embed], components: createMusicButtons() });
    } catch (error) {
        log.red(`Error sending Now Playing: ${error.message}`);
    }
});

client.manager.on('queueEnd', async (player) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (channel) {
        const embed = createEmbed('📋 Queue Ended', '✅ Queue has ended. Add more songs to keep the music going!');
        try {
            await channel.send({ embeds: [embed] });
        } catch (error) {
            // Ignore
        }
    }

    // Leave after 1 minute if no activity
    setTimeout(() => {
        if (player && !player.playing && !player.queue.length) {
            player.destroy();
        }
    }, 60000);
});

client.manager.on('playerMove', (player, oldChannel, newChannel) => {
    if (!newChannel) {
        const channel = client.channels.cache.get(player.textChannel);
        if (channel) {
            const embed = createEmbed('⚠️ Disconnected', 'I was disconnected from the voice channel.');
            channel.send({ embeds: [embed] }).catch(() => {});
        }
        player.destroy();
    }
});

// Button Interaction Handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const player = client.manager.players.get(interaction.guildId);
    if (!player) {
        return interaction.reply({
            embeds: [createEmbed('❌ Error', 'No active player in this server!')],
            ephemeral: true
        });
    }

    // Check if user is in same voice channel
    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member.voice.channel || member.voice.channel.id !== player.voiceChannel) {
        return interaction.reply({
            embeds: [createEmbed('❌ Error', 'You must be in the same voice channel!')],
            ephemeral: true
        });
    }

    const customId = interaction.customId;
    let replyEmbed;

    try {
        switch (customId) {
            case 'btn_pause':
                if (player.paused) {
                    player.pause(false);
                    replyEmbed = createEmbed('▶️ Resumed', 'Music has been resumed.');
                } else {
                    player.pause(true);
                    replyEmbed = createEmbed('⏸️ Paused', 'Music has been paused.');
                }
                break;

            case 'btn_skip':
                player.stop();
                replyEmbed = createEmbed('⏭️ Skipped', 'Current track has been skipped.');
                break;

            case 'btn_stop':
                player.destroy();
                replyEmbed = createEmbed('⏹️ Stopped', 'Music stopped and player destroyed.');
                break;

            case 'btn_shuffle':
                if (player.queue.length > 0) {
                    player.queue.shuffle();
                    replyEmbed = createEmbed('🔀 Shuffled', 'Queue has been shuffled.');
                } else {
                    replyEmbed = createEmbed('❌ Error', 'Queue is empty!');
                }
                break;

            case 'btn_loop':
                if (player.trackRepeat) {
                    player.setTrackRepeat(false);
                    player.setQueueRepeat(true);
                    replyEmbed = createEmbed('🔁 Loop Mode', 'Loop set to: **Queue**');
                } else if (player.queueRepeat) {
                    player.setQueueRepeat(false);
                    player.setTrackRepeat(false);
                    replyEmbed = createEmbed('🔁 Loop Mode', 'Loop set to: **Disabled**');
                } else {
                    player.setTrackRepeat(true);
                    player.setQueueRepeat(false);
                    replyEmbed = createEmbed('🔁 Loop Mode', 'Loop set to: **Track**');
                }
                break;

            case 'btn_voldown':
                const newVolDown = Math.max(0, player.volume - 10);
                player.setVolume(newVolDown);
                replyEmbed = createEmbed('🔉 Volume', `Volume decreased to: **${newVolDown}%**`);
                break;

            case 'btn_volup':
                const newVolUp = Math.min(100, player.volume + 10);
                player.setVolume(newVolUp);
                replyEmbed = createEmbed('🔊 Volume', `Volume increased to: **${newVolUp}%**`);
                break;

            case 'btn_queue':
                if (!player.queue.length && !player.queue.current) {
                    replyEmbed = createEmbed('📋 Queue', 'Queue is empty.');
                } else {
                    const current = player.queue.current;
                    const queueList = player.queue.slice(0, 10).map((track, i) =>
                        `**${i + 1}.** ${track.title} - \`${formatDuration(track.duration)}\``
                    ).join('\n');

                    replyEmbed = new EmbedBuilder()
                        .setColor(client.config.embedColor)
                        .setTitle('📋 Music Queue')
                        .setDescription(`**Now Playing:**\n[${current.title}](${current.uri})\n\n${queueList || 'No songs in queue'}`)
                        .setFooter({ text: `Total: ${player.queue.length} songs | ${client.config.developer}` });
                }
                break;

            case 'btn_np':
                const track = player.queue.current;
                if (!track) {
                    replyEmbed = createEmbed('❌ Error', 'No track is currently playing!');
                } else {
                    const progressBar = createProgressBar(player, track);
                    replyEmbed = new EmbedBuilder()
                        .setColor(client.config.embedColor)
                        .setAuthor({ name: '🎵 Now Playing', iconURL: client.user.displayAvatarURL() })
                        .setDescription(`**[${track.title}](${track.uri})**`)
                        .addFields(
                            { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
                            { name: '⏱️ Time', value: `${formatDuration(player.position)} / ${formatDuration(track.duration)}`, inline: true },
                            { name: '📊 Progress', value: progressBar, inline: false },
                            { name: '🔊 Volume', value: `${player.volume}%`, inline: true },
                            { name: '📻 Requested By', value: `<@${track.requester.id}>`, inline: true }
                        )
                        .setThumbnail(track.displayThumbnail ? track.displayThumbnail('maxresdefault') : null)
                        .setFooter({ text: `Developed by ${client.config.developer}` });
                }
                break;

            case 'btn_lyrics':
                replyEmbed = createEmbed('📝 Lyrics', '🎵 Lyrics feature coming soon!');
                break;

            default:
                replyEmbed = createEmbed('❌ Error', 'Unknown button interaction.');
        }
    } catch (error) {
        log.red(`Button Error: ${error.message}`);
        replyEmbed = createEmbed('❌ Error', 'An error occurred while processing your request.');
    }

    return interaction.reply({ embeds: [replyEmbed], ephemeral: true });
});

// Message Command Handler
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = client.config.prefix;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Find command
    let command = client.commands.get(commandName);
    if (!command) {
        const aliasCommand = client.aliases.get(commandName);
        if (aliasCommand) {
            command = client.commands.get(aliasCommand);
        }
    }

    if (!command) return;

    // Cooldown system
    if (!client.cooldowns.has(command.name)) {
        client.cooldowns.set(command.name, new Collection());
    }

    const now = Date.now();
    const timestamps = client.cooldowns.get(command.name);
    const cooldownAmount = 3000;

    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(`⏳ Please wait ${timeLeft.toFixed(1)}s before using \`${command.name}\` again.`);
        }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    // Execute command
    try {
        await command.execute(message, args, client);
        log.magenta(`${message.author.tag} used command: ${command.name}`);
    } catch (error) {
        log.red(`Command Error [${command.name}]: ${error.message}`);
        const embed = createEmbed('❌ Error', 'An unexpected error occurred while executing this command.');
        message.reply({ embeds: [embed] }).catch(() => {});
    }
});

// Ready Event
client.once('ready', () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║                                          ║
    ║        🎵 ADVANCED MUSIC BOT 🎵         ║
    ║                                          ║
    ║        Developed by ${client.config.developer}              ║
    ║        Bot is Online and Ready! ✅       ║
    ║                                          ║
    ╚══════════════════════════════════════════╝
    `);

    log.green(`Bot Tag: ${client.user.tag}`);
    log.green(`Bot ID: ${client.user.id}`);
    log.green(`Servers: ${client.guilds.cache.size}`);
    log.green(`Prefix: ${client.config.prefix}`);
    log.green(`Commands Loaded: ${client.commands.size}`);

    // Status
    client.user.setPresence({
        activities: [{
            name: `${client.config.prefix}help | ${client.guilds.cache.size} servers`,
            type: 2
        }],
        status: 'online'
    });

    // Initialize Lavalink
    client.manager.init(client.user.id);
});

// Error Handlers
process.on('unhandledRejection', (error) => {
    log.red(`Unhandled Rejection: ${error.message}`);
});

process.on('uncaughtException', (error) => {
    log.red(`Uncaught Exception: ${error.message}`);
});

client.on('error', (error) => {
    log.red(`Client Error: ${error.message}`);
});

// Login
client.login(process.env.DISCORD_TOKEN).then(() => {
    log.green('Successfully logged in!');
}).catch((error) => {
    log.red(`Login Failed: ${error.message}`);
    process.exit(1);
});
