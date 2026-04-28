const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const { Manager } = require('erela.js');
const Spotify = require('erela.js-spotify');
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

// Music Manager Setup - Fixed version
client.manager = new Manager({
    nodes: [{
        host: process.env.LAVALINK_HOST || 'localhost',
        port: parseInt(process.env.LAVALINK_PORT) || 2333,
        password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
        secure: false,
        retryDelay: 5000,
        retryAmount: 5
    }],
    plugins: [
        new Spotify({
            clientID: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET
        })
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

// Database Connection with error handling
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log(chalk.green('[DATABASE] ✅ Connected to MongoDB'));
}).catch(err => {
    console.log(chalk.red(`[DATABASE] ❌ MongoDB Connection Error: ${err.message}`));
    console.log(chalk.yellow('[DATABASE] Bot will continue without database'));
});

// Load Models
let GuildModel, UserModel;
try {
    GuildModel = require('./models/guild');
    UserModel = require('./models/user');
} catch (error) {
    console.log(chalk.yellow('[MODELS] Models not found, creating...'));
    // Create models directory and files if they don't exist
}

// Load Utilities
const EmbedUtil = require('./utils/embed');

// Music Event Handling
client.manager.on('nodeConnect', node => {
    console.log(chalk.green(`[LAVALINK] ✅ Node connected: ${node.options.host}`));
});

client.manager.on('nodeError', (node, error) => {
    console.log(chalk.red(`[LAVALINK] ❌ Node error: ${node.options.host}`, error.message));
});

client.manager.on('nodeReconnect', (node) => {
    console.log(chalk.yellow(`[LAVALINK] 🔄 Reconnecting to node: ${node.options.host}`));
});

client.manager.on('trackStart', async (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor(client.embedColor)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${track.title}](${track.uri})**`)
        .addFields(
            { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
            { name: '⏱️ Duration', value: formatDuration(track.duration), inline: true },
            { name: '🔊 Volume', value: `${player.volume}%`, inline: true },
            { name: '📻 Requested By', value: `<@${track.requester.id}>`, inline: true }
        )
        .setThumbnail(track.displayThumbnail ? track.displayThumbnail('maxresdefault') : null)
        .setFooter({ text: `🎶 Developed by ${client.developer}` })
        .setTimestamp();

    try {
        const msg = await channel.send({ embeds: [embed] });
        if (msg) {
            await createPlayerButtons(msg);
        }
    } catch (error) {
        console.error('Error sending now playing message:', error);
    }
});

client.manager.on('trackEnd', async (player, track, payload) => {
    // Handled automatically by autoPlay
});

client.manager.on('queueEnd', async (player) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (channel) {
        const embed = new EmbedBuilder()
            .setColor(client.embedColor)
            .setTitle('📋 Queue Ended')
            .setDescription('✅ Queue has ended. Add more songs to keep the music going!')
            .setFooter({ text: `🎶 Developed by ${client.developer}` })
            .setTimestamp();
        
        try {
            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error sending queue end message:', error);
        }
        
        // Don't destroy if 24/7 mode is enabled
        const guildSettings = await getGuildSettings(player.guild);
        if (!guildSettings || !guildSettings.twentyFourSeven) {
            setTimeout(() => {
                if (player && !player.playing && !player.queue.length) {
                    player.destroy();
                }
            }, 60000); // Leave after 1 minute
        }
    }
});

client.manager.on('playerMove', (player, oldChannel, newChannel) => {
    if (!newChannel) {
        const channel = client.channels.cache.get(player.textChannel);
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor(client.embedColor)
                .setTitle('⚠️ Disconnected')
                .setDescription('I was disconnected from the voice channel.')
                .setFooter({ text: `🎶 Developed by ${client.developer}` });
            channel.send({ embeds: [embed] });
        }
        player.destroy();
    }
});

// Helper Functions
function formatDuration(duration) {
    if (!duration) return '00:00';
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function createProgressBar(current, total, size = 15) {
    const progress = Math.round((size * current) / total);
    const emptyProgress = size - progress;
    const progressText = '▬'.repeat(progress);
    const emptyProgressText = '▭'.repeat(emptyProgress);
    return progressText + '🔘' + emptyProgressText;
}

async function createPlayerButtons(message) {
    const row1 = {
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

    try {
        await message.edit({ components: [row1, row2] });
    } catch (error) {
        console.error('Error adding buttons:', error);
    }
}

async function getGuildSettings(guildId) {
    if (!GuildModel) return null;
    try {
        return await GuildModel.findOne({ guildId });
    } catch (error) {
        return null;
    }
}

// Music Commands
const playCommand = {
    name: 'play',
    aliases: ['p'],
    async execute(message, args, client) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('You need to be in a voice channel!')
                ]
            });
        }

        if (!args.length) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('Please provide a song name or URL!')
                ]
            });
        }

        const search = args.join(' ');
        let player = client.manager.players.get(message.guild.id);

        if (!player) {
            player = client.manager.create({
                guild: message.guild.id,
                voiceChannel: voiceChannel.id,
                textChannel: message.channel.id,
                volume: 100,
                selfDeafen: true
            });
        }

        if (player.state !== 'CONNECTED') {
            player.connect();
        }

        try {
            const res = await player.search(search, message.author);
            
            if (res.loadType === 'LOAD_FAILED') {
                if (!player.queue.current) player.destroy();
                throw res.exception;
            }

            switch (res.loadType) {
                case 'NO_MATCHES':
                    if (!player.queue.current) player.destroy();
                    return message.reply({ 
                        embeds: [new EmbedBuilder()
                            .setColor(client.embedColor)
                            .setTitle('❌ No Results')
                            .setDescription(`No results found for: ${search}`)
                        ]
                    });

                case 'TRACK_LOADED':
                    player.queue.add(res.tracks[0]);
                    if (!player.playing && !player.paused && !player.queue.length) {
                        player.play();
                    }
                    return message.reply({ 
                        embeds: [new EmbedBuilder()
                            .setColor(client.embedColor)
                            .setTitle('✅ Added to Queue')
                            .setDescription(`**[${res.tracks[0].title}](${res.tracks[0].uri})**`)
                            .addFields(
                                { name: '👤 Artist', value: res.tracks[0].author, inline: true },
                                { name: '⏱️ Duration', value: formatDuration(res.tracks[0].duration), inline: true }
                            )
                            .setThumbnail(res.tracks[0].displayThumbnail ? res.tracks[0].displayThumbnail('maxresdefault') : null)
                            .setFooter({ text: `Requested by ${message.author.tag} | Developed by ${client.developer}` })
                        ]
                    });

                case 'PLAYLIST_LOADED':
                    player.queue.add(res.tracks);
                    if (!player.playing && !player.paused && player.queue.totalSize === res.tracks.length) {
                        player.play();
                    }
                    return message.reply({ 
                        embeds: [new EmbedBuilder()
                            .setColor(client.embedColor)
                            .setTitle('📑 Playlist Added')
                            .setDescription(`**${res.playlist.name}**`)
                            .addFields(
                                { name: '📊 Total Tracks', value: `${res.tracks.length}`, inline: true },
                                { name: '⏱️ Total Duration', value: formatDuration(res.playlist.duration), inline: true }
                            )
                            .setFooter({ text: `Requested by ${message.author.tag} | Developed by ${client.developer}` })
                        ]
                    });

                case 'SEARCH_RESULT':
                    player.queue.add(res.tracks[0]);
                    if (!player.playing && !player.paused && !player.queue.length) {
                        player.play();
                    }
                    return message.reply({ 
                        embeds: [new EmbedBuilder()
                            .setColor(client.embedColor)
                            .setTitle('✅ Added to Queue')
                            .setDescription(`**[${res.tracks[0].title}](${res.tracks[0].uri})**`)
                            .addFields(
                                { name: '👤 Artist', value: res.tracks[0].author, inline: true },
                                { name: '⏱️ Duration', value: formatDuration(res.tracks[0].duration), inline: true }
                            )
                            .setThumbnail(res.tracks[0].displayThumbnail ? res.tracks[0].displayThumbnail('maxresdefault') : null)
                            .setFooter({ text: `Requested by ${message.author.tag} | Developed by ${client.developer}` })
                        ]
                    });
            }
        } catch (error) {
            console.error('Play command error:', error);
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('An error occurred while trying to play this track.')
                ]
            });
        }
    }
};

const skipCommand = {
    name: 'skip',
    aliases: ['s', 'next'],
    async execute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('No music is currently playing!')
                ]
            });
        }

        if (!message.member.voice.channel) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('You need to be in a voice channel!')
                ]
            });
        }

        player.stop();
        return message.reply({ 
            embeds: [new EmbedBuilder()
                .setColor(client.embedColor)
                .setTitle('⏭️ Skipped')
                .setDescription('Current track has been skipped.')
                .setFooter({ text: `Developed by ${client.developer}` })
            ]
        });
    }
};

const stopCommand = {
    name: 'stop',
    aliases: ['leave', 'disconnect'],
    async execute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('No music is currently playing!')
                ]
            });
        }

        player.destroy();
        return message.reply({ 
            embeds: [new EmbedBuilder()
                .setColor(client.embedColor)
                .setTitle('⏹️ Stopped')
                .setDescription('Music has been stopped and player destroyed.')
                .setFooter({ text: `Developed by ${client.developer}` })
            ]
        });
    }
};

const queueCommand = {
    name: 'queue',
    aliases: ['q', 'list'],
    async execute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('No music is currently playing!')
                ]
            });
        }

        const queue = player.queue;
        const current = player.queue.current;

        if (!current && !queue.length) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('📋 Queue')
                    .setDescription('Queue is empty.')
                ]
            });
        }

        const embed = new EmbedBuilder()
            .setColor(client.embedColor)
            .setTitle('📋 Music Queue')
            .setDescription(
                `**Now Playing:**\n[${current.title}](${current.uri}) | \`${formatDuration(current.duration)}\`\n\n` +
                (queue.length ? queue.slice(0, 10).map((track, i) => 
                    `**${i + 1}.** ${track.title} - ${track.author} \`${formatDuration(track.duration)}\``
                ).join('\n') : 'No songs in queue')
            )
            .setFooter({ text: `Total songs: ${queue.length} | Developed by ${client.developer}` })
            .setTimestamp();

        if (queue.length > 10) {
            embed.addFields({ name: 'And more...', value: `${queue.length - 10} more songs` });
        }

        return message.reply({ embeds: [embed] });
    }
};

const pauseCommand = {
    name: 'pause',
    async execute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('No music is currently playing!')
                ]
            });
        }

        if (player.paused) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('Music is already paused!')
                ]
            });
        }

        player.pause(true);
        return message.reply({ 
            embeds: [new EmbedBuilder()
                .setColor(client.embedColor)
                .setTitle('⏸️ Paused')
                .setDescription('Music has been paused.')
                .setFooter({ text: `Developed by ${client.developer}` })
            ]
        });
    }
};

const resumeCommand = {
    name: 'resume',
    async execute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('No music is currently playing!')
                ]
            });
        }

        if (!player.paused) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('Music is not paused!')
                ]
            });
        }

        player.pause(false);
        return message.reply({ 
            embeds: [new EmbedBuilder()
                .setColor(client.embedColor)
                .setTitle('▶️ Resumed')
                .setDescription('Music has been resumed.')
                .setFooter({ text: `Developed by ${client.developer}` })
            ]
        });
    }
};

const volumeCommand = {
    name: 'volume',
    aliases: ['vol'],
    async execute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('No music is currently playing!')
                ]
            });
        }

        if (!args.length) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('🔊 Volume')
                    .setDescription(`Current volume: **${player.volume}%**`)
                ]
            });
        }

        const volume = parseInt(args[0]);
        if (isNaN(volume) || volume < 0 || volume > 100) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('Please provide a valid number between 0 and 100!')
                ]
            });
        }

        player.setVolume(volume);
        return message.reply({ 
            embeds: [new EmbedBuilder()
                .setColor(client.embedColor)
                .setTitle('🔊 Volume')
                .setDescription(`Volume set to: **${volume}%**`)
                .setFooter({ text: `Developed by ${client.developer}` })
            ]
        });
    }
};

const nowplayingCommand = {
    name: 'nowplaying',
    aliases: ['np'],
    async execute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('No music is currently playing!')
                ]
            });
        }

        const track = player.queue.current;
        const progress = createProgressBar(player.position, track.duration);
        const embed = new EmbedBuilder()
            .setColor(client.embedColor)
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${track.title}](${track.uri})**`)
            .addFields(
                { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: `${formatDuration(player.position)} / ${formatDuration(track.duration)}`, inline: true },
                { name: '📊 Progress', value: progress, inline: false },
                { name: '🔊 Volume', value: `${player.volume}%`, inline: true },
                { name: '🔁 Loop', value: player.trackRepeat ? 'Track' : player.queueRepeat ? 'Queue' : 'None', inline: true },
                { name: '📻 Requested By', value: `<@${track.requester.id}>`, inline: true }
            )
            .setThumbnail(track.displayThumbnail ? track.displayThumbnail('maxresdefault') : null)
            .setFooter({ text: `Developed by ${client.developer}` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};

const helpCommand = {
    name: 'help',
    aliases: ['h', 'commands'],
    async execute(message, args, client) {
        const embed = new EmbedBuilder()
            .setColor(client.embedColor)
            .setTitle('🎵 Music Bot Commands')
            .setDescription(`Developed by **${client.developer}**`)
            .addFields(
                { 
                    name: '🎶 Music Commands', 
                    value: [
                        '`!play <song>` - Play a song',
                        '`!skip` - Skip current song',
                        '`!stop` - Stop music',
                        '`!pause` - Pause music',
                        '`!resume` - Resume music',
                        '`!volume <0-100>` - Set volume',
                        '`!queue` - Show queue',
                        '`!nowplaying` - Show current song',
                        '`!shuffle` - Shuffle queue',
                        '`!loop` - Toggle loop mode'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⭐ Premium Features',
                    value: [
                        '`!premium` - Check premium status',
                        '`!redeem <code>` - Redeem premium code',
                        '`!playlist` - Create/manage playlists',
                        '`!24/7` - Enable 24/7 mode'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ text: `Prefix: ${client.prefix} | Use buttons for control | Developed by ${client.developer}` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};

// Register all commands
const commands = {
    play: playCommand,
    skip: skipCommand,
    stop: stopCommand,
    queue: queueCommand,
    pause: pauseCommand,
    resume: resumeCommand,
    volume: volumeCommand,
    nowplaying: nowplayingCommand,
    help: helpCommand
};

// Interaction Handler
client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        // Handle slash commands if any
        return;
    }

    if (interaction.isButton()) {
        await handlePlayerButtons(interaction, client);
    }
});

// Message Handler for Prefix Commands
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    
    // Check if message is from a blacklisted channel
    if (GuildModel) {
        try {
            const guildSettings = await GuildModel.findOne({ guildId: message.guild.id });
            if (guildSettings && guildSettings.blacklistedChannels.includes(message.channel.id)) {
                return;
            }
        } catch (error) {
            // Continue even if database check fails
        }
    }

    const prefix = client.prefix;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Find command by name or alias
    let command = commands[commandName];
    if (!command) {
        // Check aliases
        for (const [cmdName, cmd] of Object.entries(commands)) {
            if (cmd.aliases && cmd.aliases.includes(commandName)) {
                command = cmd;
                break;
            }
        }
    }

    if (!command) return;

    // Cooldown check
    if (!client.cooldowns.has(command.name)) {
        client.cooldowns.set(command.name, new Collection());
    }

    const now = Date.now();
    const timestamps = client.cooldowns.get(command.name);
    const cooldownAmount = 3000; // 3 seconds

    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply({ 
                content: `Please wait ${timeLeft.toFixed(1)} seconds before using \`${command.name}\` again.`,
                ephemeral: true 
            });
        }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    // Execute command
    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(`Error executing command ${commandName}:`, error);
        const embed = new EmbedBuilder()
            .setColor(client.embedColor)
            .setTitle('❌ Error')
            .setDescription('An error occurred while executing this command.')
            .setFooter({ text: `Developed by ${client.developer}` });
        
        message.reply({ embeds: [embed] }).catch(console.error);
    }
});

// Button Handler
async function handlePlayerButtons(interaction, client) {
    const player = client.manager.players.get(interaction.guildId);
    if (!player) {
        const embed = new EmbedBuilder()
            .setColor(client.embedColor)
            .setTitle('❌ No Player')
            .setDescription('There is no active player in this server.');
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Check if user is in the same voice channel
    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member.voice.channel || member.voice.channel.id !== player.voiceChannel) {
        const embed = new EmbedBuilder()
            .setColor(client.embedColor)
            .setTitle('❌ Error')
            .setDescription('You need to be in the same voice channel to use these controls!');
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const customId = interaction.customId;

    try {
        switch(customId) {
            case 'player_pause':
                if (player.paused) {
                    player.pause(false);
                    await interaction.reply({ 
                        embeds: [new EmbedBuilder()
                            .setColor(client.embedColor)
                            .setTitle('▶️ Resumed')
                            .setDescription('Music has been resumed.')], 
                        ephemeral: true 
                    });
                } else {
                    player.pause(true);
                    await interaction.reply({ 
                        embeds: [new EmbedBuilder()
                            .setColor(client.embedColor)
                            .setTitle('⏸️ Paused')
                            .setDescription('Music has been paused.')], 
                        ephemeral: true 
                    });
                }
                break;

            case 'player_skip':
                player.stop();
                await interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setColor(client.embedColor)
                        .setTitle('⏭️ Skipped')
                        .setDescription('Current track has been skipped.')], 
                    ephemeral: true 
                });
                break;

            case 'player_stop':
                player.destroy();
                await interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setColor(client.embedColor)
                        .setTitle('⏹️ Stopped')
                        .setDescription('Music has been stopped.')], 
                    ephemeral: true 
                });
                break;

            case 'player_shuffle':
                if (player.queue.length) {
                    player.queue.shuffle();
                    await interaction.reply({ 
                        embeds: [new EmbedBuilder()
                            .setColor(client.embedColor)
                            .setTitle('🔀 Shuffled')
                            .setDescription('Queue has been shuffled.')], 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        embeds: [new EmbedBuilder()
                            .setColor(client.embedColor)
                            .setTitle('❌ Error')
                            .setDescription('Queue is empty!')], 
                        ephemeral: true 
                    });
                }
                break;

            case 'player_loop':
                if (player.trackRepeat) {
                    player.setTrackRepeat(false);
                    player.setQueueRepeat(true);
                    await interaction.reply({ 
                        embeds: [new EmbedBuilder()
                            .setColor(client.embedColor)
                            .setTitle('🔁 Loop')
                            .setDescription('Loop mode: **Queue**')], 
                        ephemeral: true 
                    });
                } else if (player.queueRepeat) {
                    player.setQueueRepeat(false);
                    await interaction.reply({ 
                        embeds: [new EmbedBuilder()
                            .setColor(client.embedColor)
                            .setTitle('🔁 Loop')
                            .setDescription('Loop mode: **Disabled**')], 
                        ephemeral: true 
                    });
                } else {
                    player.setTrackRepeat(true);
                    await interaction.reply({ 
                        embeds: [new EmbedBuilder()
                            .setColor(client.embedColor)
                            .setTitle('🔁 Loop')
                            .setDescription('Loop mode: **Track**')], 
                        ephemeral: true 
                    });
                }
                break;

            case 'player_volume_down':
                const newVolDown = Math.max(0, player.volume - 10);
                player.setVolume(newVolDown);
                await interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setColor(client.embedColor)
                        .setTitle('🔉 Volume')
                        .setDescription(`Volume decreased to: **${newVolDown}%**`)], 
                    ephemeral: true 
                });
                break;

            case 'player_volume_up':
                const newVolUp = Math.min(100, player.volume + 10);
                player.setVolume(newVolUp);
                await interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setColor(client.embedColor)
                        .setTitle('🔊 Volume')
                        .setDescription(`Volume increased to: **${newVolUp}%**`)], 
                    ephemeral: true 
                });
                break;

            case 'player_queue':
                const queueEmbed = new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('📋 Queue')
                    .setDescription(
                        player.queue.length > 0 
                            ? player.queue.slice(0, 10).map((track, i) => 
                                `**${i + 1}.** ${track.title} - ${track.author} \`${formatDuration(track.duration)}\``
                            ).join('\n')
                            : 'Queue is empty'
                    )
                    .setFooter({ text: `Total songs: ${player.queue.length} | Developed by ${client.developer}` });
                
                if (player.queue.length > 10) {
                    queueEmbed.addFields({ 
                        name: 'And more...', 
                        value: `${player.queue.length - 10} more songs` 
                    });
                }
                
                await interaction.reply({ embeds: [queueEmbed], ephemeral: true });
                break;

            case 'player_nowplaying':
                const track = player.queue.current;
                if (!track) {
                    return interaction.reply({ 
                        embeds: [new EmbedBuilder()
                            .setColor(client.embedColor)
                            .setTitle('❌ Error')
                            .setDescription('No track is currently playing.')], 
                        ephemeral: true 
                    });
                }
                
                const progress = createProgressBar(player.position, track.duration);
                const nowPlayingEmbed = new EmbedBuilder()
                    .setColor(client.embedColor)
                    .setTitle('🎵 Now Playing')
                    .setDescription(`**[${track.title}](${track.uri})**`)
                    .addFields(
                        { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
                        { name: '⏱️ Duration', value: `${formatDuration(player.position)} / ${formatDuration(track.duration)}`, inline: true },
                        { name: '📊 Progress', value: progress, inline: false },
                        { name: '🔊 Volume', value: `${player.volume}%`, inline: true },
                        { name: '📻 Requested By', value: `<@${track.requester.id}>`, inline: true }
                    )
                    .setThumbnail(track.displayThumbnail ? track.displayThumbnail('maxresdefault') : null)
                    .setFooter({ text: `Developed by ${client.developer}` });
                
                await interaction.reply({ embeds: [nowPlayingEmbed], ephemeral: true });
                break;

            case 'player_lyrics':
                await interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setColor(client.embedColor)
                        .setTitle('📝 Lyrics')
                        .setDescription('Lyrics feature will be available soon!')], 
                    ephemeral: true 
                });
                break;
        }
    } catch (error) {
        console.error('Button handler error:', error);
        const embed = new EmbedBuilder()
            .setColor(client.embedColor)
            .setTitle('❌ Error')
            .setDescription('An error occurred while processing your request.');
        
        await interaction.reply({ embeds: [embed], ephemeral: true }).catch(console.error);
    }
}

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
            type: 2 // LISTENING
        }],
        status: 'online'
    });
    
    // Initialize Manager
    client.manager.init(client.user.id);
});

// Error Handling
process.on('unhandledRejection', (error) => {
    console.error(chalk.red('Unhandled promise rejection:'), error.message);
});

process.on('uncaughtException', (error) => {
    console.error(chalk.red('Uncaught exception:'), error.message);
});

client.on('error', (error) => {
    console.error(chalk.red('Client error:'), error.message);
});

// Login
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error(chalk.red('Failed to login:'), error.message);
});
