const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'pause',
    description: 'Pause the current song',
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

        if (player.paused) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('Music is already paused!')
                ]
            });
        }

        player.pause(true);

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle('⏸️ Paused')
                .setDescription('Music has been paused. Use `resume` or the ⏯️ button to continue.')
                .setFooter({ text: `Requested by ${message.author.tag} | Developed by ${client.config.developer}` })
            ]
        });
    }
};
