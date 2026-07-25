require('dotenv').config();
const mineflayer = require('mineflayer');
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_TOKEN;
if (!token) {
    console.error('❌ Токен не найден в .env!');
    process.exit(1);
}
console.log('✅ Токен загружен');

const tgBot = new TelegramBot(token, { polling: true });

// ===== ВСЕ БОТЫ (список доступных) =====
const ALL_BOTS = [
    'Shkiper',
    'Narcos',
    'uHTuMkA',
    'Oo_Timur_oO',
    'Bot5',
    'Bot6'
];

// ===== СОСТОЯНИЕ =====
let activeBots = {};
let chatId = null;

// ===== СОЗДАТЬ КНОПКИ =====
function getMainKeyboard() {
    const buttons = ALL_BOTS.map(name => [{ text: name, callback_data: `start_${name}` }]);
    buttons.push([{ text: '🔄 Обновить статус', callback_data: 'status' }]);
    buttons.push([{ text: '❌ Остановить всех', callback_data: 'stop_all' }]);
    return {
        reply_markup: {
            inline_keyboard: buttons
        }
    };
}

// ===== КНОПКИ ДЛЯ УПРАВЛЕНИЯ ОДНИМ БОТОМ =====
function getBotControlKeyboard(name) {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: `🔴 Остановить ${name}`, callback_data: `stop_${name}` }],
                [{ text: '🔙 Назад', callback_data: 'back' }]
            ]
        }
    };
}

// ===== СОЗДАТЬ БОТА =====
function createBotInstance(username) {
    const bot = mineflayer.createBot({
        host: process.env.SERVER_HOST,
        port: parseInt(process.env.SERVER_PORT),
        username: username,
        auth: 'offline'
    });

    let loggedIn = false;

    bot.once('spawn', () => {
        tgBot.sendMessage(chatId, `✅ ${username} зашёл на сервер`);
        bot.chat('/login ' + process.env.PASSWORD);
    });

    bot.on('chat', (sender, message) => {
        if (message.includes('/login') && !loggedIn) {
            bot.chat('/login ' + process.env.PASSWORD);
            loggedIn = true;
            tgBot.sendMessage(chatId, `🔑 ${username} залогинился`);

            setTimeout(() => {
                bot.chat('/god');
                tgBot.sendMessage(chatId, `✨ ${username} → /god`);
            }, 1000);

            setTimeout(() => {
                bot.chat('/vanish');
                tgBot.sendMessage(chatId, `👻 ${username} → /vanish`);
            }, 2000);

            setTimeout(() => {
                tgBot.sendMessage(chatId, `✅ ${username} готов`);
            }, 3000);
        }
    });

    bot.on('kicked', (reason) => {
        tgBot.sendMessage(chatId, `❌ ${username} кикнут: ${reason}`);
        delete activeBots[username];
    });

    bot.on('error', (err) => {
        tgBot.sendMessage(chatId, `⚠️ ${username} ошибка: ${err.message}`);
    });

    bot.on('end', () => {
        tgBot.sendMessage(chatId, `🔌 ${username} отключился`);
        delete activeBots[username];
    });

    return bot;
}

// ===== ЗАПУСТИТЬ БОТА =====
function startBot(username) {
    if (activeBots[username]) {
        tgBot.sendMessage(chatId, `⚠️ ${username} уже запущен`);
        return;
    }

    tgBot.sendMessage(chatId, `🚀 Запускаю ${username}...`);
    const bot = createBotInstance(username);
    activeBots[username] = bot;
}

// ===== ОСТАНОВИТЬ БОТА =====
function stopBot(username) {
    if (!activeBots[username]) {
        tgBot.sendMessage(chatId, `❌ ${username} не запущен`);
        return;
    }

    activeBots[username].end();
    delete activeBots[username];
    tgBot.sendMessage(chatId, `🛑 ${username} остановлен`);
}

// ===== ОСТАНОВИТЬ ВСЕХ =====
function stopAllBots() {
    const names = Object.keys(activeBots);
    if (names.length === 0) {
        tgBot.sendMessage(chatId, '❌ Нет активных ботов');
        return;
    }

    names.forEach(name => {
        activeBots[name].end();
        delete activeBots[name];
    });

    tgBot.sendMessage(chatId, `🛑 Все боты остановлены (${names.length})`);
}

// ===== СТАТУС =====
function showStatus() {
    const names = Object.keys(activeBots);
    if (names.length === 0) {
        tgBot.sendMessage(chatId, '📭 Активных ботов нет', getMainKeyboard());
        return;
    }

    const list = names.map(n => `✅ ${n}`).join('\n');
    tgBot.sendMessage(chatId, `📋 Активные боты:\n${list}`, getMainKeyboard());
}

// ===== ТЕЛЕГРАМ КОМАНДЫ =====

// /start — показать меню
tgBot.onText(/\/start/, (msg) => {
    chatId = msg.chat.id;
    tgBot.sendMessage(chatId, '🤖 Выберите бота для запуска:', getMainKeyboard());
});

// Нажатие на кнопку
tgBot.on('callback_query', (query) => {
    const data = query.data;
    chatId = query.message.chat.id;

    if (data.startsWith('start_')) {
        const name = data.replace('start_', '');
        startBot(name);
        tgBot.answerCallbackQuery(query.id, `Запускаю ${name}...`);
    } 
    else if (data.startsWith('stop_')) {
        const name = data.replace('stop_', '');
        stopBot(name);
        tgBot.answerCallbackQuery(query.id, `Останавливаю ${name}...`);
    }
    else if (data === 'stop_all') {
        stopAllBots();
        tgBot.answerCallbackQuery(query.id, 'Останавливаю всех...');
    }
    else if (data === 'status') {
        showStatus();
        tgBot.answerCallbackQuery(query.id, 'Обновлено');
    }
    else if (data === 'back') {
        tgBot.sendMessage(chatId, '🔙 Возврат в главное меню', getMainKeyboard());
        tgBot.answerCallbackQuery(query.id, 'Назад');
    }

    tgBot.answerCallbackQuery(query.id);
});

console.log('🤖 Telegram-бот с управлением ботами запущен!');