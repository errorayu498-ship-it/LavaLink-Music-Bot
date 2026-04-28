const { EmbedBuilder } = require('discord.js');

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

module.exports = {
    name: 'play',
    aliases: ['p'],
    description: 'Play a song from YouTube/Spotify',
    async execute(message, args, client) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('You need to be in a voice channel!')
                ]
            });
        }

        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('I need permissions to join and speak in your voice channel!')
                ]
            });
        }

        if (!args.length) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
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

        if (player.voiceChannel !== voiceChannel.id) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('You need to be in the same voice channel as the bot!')
                ]
            });
        }

        const loadingMsg = await message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setDescription('🔍 Searching...')
            ]
        });

        try {
            const res = await player.search(search, message.author);

            if (loadingMsg) await loadingMsg.delete().catch(() => {});

            if (res.loadType === 'LOAD_FAILED') {
                if (!player.queue.current) player.destroy();
                throw res.exception;
            }

            switch (res.loadType) {
                case 'NO_MATCHES':
                    if (!player.queue.current) player.destroy();
                    return message.reply({
                        embeds: [new EmbedBuilder()
                            .setColor(client.config.embedColor)
                            .setTitle('❌ No Results')
                            .setDescription(`No results found for: **${search}**`)
                        ]
                    });

                case 'TRACK_LOADED':
                    const track = res.tracks[0];
                    player.queue.add(track);

                    if (!player.playing && !player.paused && !player.queue.length) {
                        player.play();
                    }

                    return message.reply({
                        embeds: [new EmbedBuilder()
                            .setColor(client.config.embedColor)
                            .setTitle('✅ Added to Queue')
                            .setDescription(`**[${track.title}](${track.uri})**`)
                            .addFields(
                                { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
                                { name: '⏱️ Duration', value: formatDuration(track.duration), inline: true },
                                { name: '📊 Queue Position', value: `${player.queue.length}`, inline: true }
                            )
                            .setThumbnail(track.displayThumbnail ? track.displayThumbnail('maxresdefault') : null)
                            .setFooter({ text: `Requested by ${message.author.tag} | Developed by ${client.config.developer}` })
                        ]
                    });

                case 'PLAYLIST_LOADED':
                    const playlist = res.playlist;
                    player.queue.add(res.tracks);

                    if (!player.playing && !player.paused && player.queue.totalSize === res.tracks.length) {
                        player.play();
                    }

                    return message.reply({
                        embeds: [new EmbedBuilder()
                            .setColor(client.config.embedColor)
                            .setTitle('📑 Playlist Added')
                            .setDescription(`**${playlist.name}**`)
                            .addFields(
                                { name: '📊 Total Tracks', value: `${res.tracks.length}`, inline: true },
                                { name: '⏱️ Duration', value: formatDuration(playlist.duration), inline: true },
                                { name: '📻 Source', value: playlist.source || 'Unknown', inline: true }
                            )
                            .setFooter({ text: `Requested by ${message.author.tag} | Developed by ${client.config.developer}` })
                        ]
                    });

                case 'SEARCH_RESULT':
                    const searchTrack = res.tracks[0];
                    player.queue.add(searchTrack);

                    if (!player.playing && !player.paused && !player.queue.length) {
                        player.play();
                    }

                    return message.reply({
                        embeds: [new EmbedBuilder()
                            .setColor(client.config.embedColor)
                            .setTitle('✅ Added to Queue')
                            .setDescription(`**[${searchTrack.title}](${searchTrack.uri})**`)
                            .addFields(
                                { name: '👤 Artist', value: searchTrack.author || 'Unknown', inline: true },
                                { name: '⏱️ Duration', value: formatDuration(searchTrack.duration), inline: true },
                                { name: '📊 Queue Position', value: `${player.queue.length}`, inline: true }
                            )
                            .setThumbnail(searchTrack.displayThumbnail ? searchTrack.displayThumbnail('maxresdefault') : null)
                            .setFooter({ text: `Requested by ${message.author.tag} | Developed by ${client.config.developer}` })
                        ]
                    });
            }
        } catch (error) {
            if (loadingMsg) await loadingMsg.delete().catch(() => {});
            console.error('Play command error:', error);

            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('An error occurred while trying to play this track. Please try again.')
                ]
            });
        }
    }
};
