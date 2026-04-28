const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'stop',
    aliases: ['leave', 'disconnect', 'dc'],
    description: 'Stop music and leave voice channel',
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

        player.destroy();

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle('⏹️ Stopped')
                .setDescription('Music has been stopped and the player has been destroyed.')
                .setFooter({ text: `Requested by ${message.author.tag} | Developed by ${client.config.developer}` })
            ]
        });
    }
};
