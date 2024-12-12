const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core'); // Use the standard `ytdl-core`
const ytSearch = require('yt-search'); // Add yt-search for keyword searching

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});


require('dotenv').config()

client.login(process.env.DISCORD_TOKEN);

client.on('ready', () => {
    console.log(`Bot đã sẵn sàng: ${client.user.tag}`);
});

let player;
let connection;

client.on('messageCreate', async (message) => {
    if (message.content.startsWith('/f')) {
        const args = message.content.split(' ').slice(1);
        const query = args.join(' ');

        if (!query) {
            return message.reply('Vui lòng cung cấp URL YouTube hoặc từ khoá để tìm kiếm!');
        }

        // Search YouTube if not a valid URL
        let url = query;
        if (!ytdl.validateURL(query)) {
            const searchResult = await ytSearch(query);
            if (!searchResult.videos.length) {
                return message.reply('Không tìm thấy bài hát nào với từ khoá bạn cung cấp.');
            }
            url = searchResult.videos[0].url;
        }

        // Join the voice channel
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('Bạn cần ở trong một kênh thoại để phát nhạc!');
        }

        connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        player = createAudioPlayer();
        const stream = await ytdl(url, { filter: 'audioonly', highWaterMark: 1 << 25 });
        const resource = createAudioResource(stream);

        player.play(resource);
        connection.subscribe(player);

        const videoInfo = await ytdl.getInfo(url);
        message.reply(`Đang phát: **${videoInfo.videoDetails.title}**`);

        player.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();
            connection = null;
            player = null;
        });

        player.on('error', (error) => {
            console.error(`Lỗi khi phát nhạc: ${error.message}`);
            message.reply('Đã xảy ra lỗi khi phát nhạc!');
        });
    } else if (message.content === 'stop' && player) {
        player.stop();
        message.reply('Đã dừng nhạc.');
    }
});
