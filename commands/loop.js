const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'loop',
    aliases: ['repeat', 'l'],
    description: 'Toggle loop mode (track/queue/off)',
    async execute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        
        if (!player) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('No music is currently playing!')
                ]
            });
        }

        if (!message.member.voice.channel) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('You need to be in a voice channel!')
                ]
            });
        }

        if (message.member.voice.channel.id !== player.voiceChannel) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('You need to be in the same voice channel as the bot!')
                ]
            });
        }

        let mode;

        if (args[0] && ['track', 'queue', 'off', 'none'].includes(args[0].toLowerCase())) {
            switch (args[0].toLowerCase()) {
                case 'track':
                    player.setTrackRepeat(true);
                    player.setQueueRepeat(false);
                    mode = '🔂 Track';
                    break;
                case 'queue':
                    player.setTrackRepeat(false);
                    player.setQueueRepeat(true);
                    mode = '🔁 Queue';
                    break;
                case 'off':
                case 'none':
                    player.setTrackRepeat(false);
                    player.setQueueRepeat(false);
                    mode = '❌ Disabled';
                    break;
            }
        } else {
            // Toggle mode
            if (player.trackRepeat) {
                player.setTrackRepeat(false);
                player.setQueueRepeat(true);
                mode = '🔁 Queue';
            } else if (player.queueRepeat) {
                player.setTrackRepeat(false);
                player.setQueueRepeat(false);
                mode = '❌ Disabled';
            } else {
                player.setTrackRepeat(true);
                player.setQueueRepeat(false);
                mode = '🔂 Track';
            }
        }

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle('🔁 Loop Mode')
                .setDescription(`Loop mode set to: **${mode}**`)
                .setFooter({ text: `Requested by ${message.author.tag} | Developed by ${client.config.developer}` })
            ]
        });
    }
};
