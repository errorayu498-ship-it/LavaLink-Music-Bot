const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'volume',
    aliases: ['vol', 'v'],
    description: 'Adjust the music volume',
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

        if (!args.length) {
            // Show current volume
            const volumeBar = createVolumeBar(player.volume);
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('🔊 Current Volume')
                    .setDescription(`**${player.volume}%**\n${volumeBar}`)
                    .setFooter({ text: `Developed by ${client.config.developer}` })
                ]
            });
        }

        const volume = parseInt(args[0]);

        if (isNaN(volume) || volume < 0 || volume > 100) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('Please provide a valid number between **0** and **100**!')
                ]
            });
        }

        player.setVolume(volume);

        const volumeBar = createVolumeBar(volume);
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle('🔊 Volume Adjusted')
                .setDescription(`Volume set to: **${volume}%**\n${volumeBar}`)
                .setFooter({ text: `Requested by ${message.author.tag} | Developed by ${client.config.developer}` })
            ]
        });
    }
};

function createVolumeBar(volume) {
    const filled = Math.round(volume / 10);
    const empty = 10 - filled;
    return '🔴'.repeat(filled) + '⚪'.repeat(empty);
}
