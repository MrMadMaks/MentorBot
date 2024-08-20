require('dotenv').config();
const {
    Bot,
    Keyboard,
    InlineKeyboard,
    GrammyError,
    HttpError,
    session,
} = require('grammy');
const { getRandomQuestion, getCorrectAnswer } = require('./utils');

const bot = new Bot(process.env.BOT_API_KEY);

bot.use(session());

bot.command('start', async (ctx) => {

    const channel = 'hello_world_singularity';
    const channelId = -1001728607448

    const userId = ctx.from.id;

    const isSubscribed = await ctx.api.getChatMember(channelId, userId)

    if (isSubscribed.status === 'member' || isSubscribed.status === 'creator') {
        const startKeyboard = new Keyboard()
            .text('HTML/CSS')
            .text('GIT')
            .row()
            .text('JavaScript')
            .text('TypeScript')
            .row()
            .text('React')
            .text('Случайный вопрос')
            .resized();
        await ctx.reply('С чего начнем? Выбери тему вопроса в меню 👇', {
            reply_markup: startKeyboard,
        });
    } else {
        ctx.reply('Для использования бота, пожалуйста, подпишитесь на мой канал: t.me/' + channel);
    }
});

bot.hears(
    ['HTML/CSS', 'GIT', 'JavaScript', 'TypeScript', 'React', 'Случайный вопрос'],
    async (ctx) => {
        const topic = ctx.message.text.toLowerCase();
        const { question, questionTopic } = getRandomQuestion(topic);

        let inlineKeyboard;

        if (question.hasOptions) {
            const buttonRows = question.options.map((option) => [
                InlineKeyboard.text(
                    option.text,
                    JSON.stringify({
                        type: `${questionTopic}-option`,
                        isCorrect: option.isCorrect,
                        questionId: question.id,
                    }),
                ),
            ]);

            inlineKeyboard = InlineKeyboard.from(buttonRows);
        } else {
            inlineKeyboard = new InlineKeyboard().text(
                'Узнать ответ',
                JSON.stringify({
                    type: questionTopic,
                    questionId: question.id,
                }),
            );
        }

        await ctx.reply(question.text, {
            reply_markup: inlineKeyboard,
        });
    },
);

bot.on('callback_query:data', async (ctx) => {
    const callbackData = JSON.parse(ctx.callbackQuery.data);

    if (!callbackData.type.includes('option')) {
        const answer = getCorrectAnswer(callbackData.type, callbackData.questionId);
        await ctx.reply(answer, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
        });
        await ctx.answerCallbackQuery();
        return;
    }

    if (callbackData.isCorrect) {
        await ctx.reply('Верно ✅');
        await ctx.answerCallbackQuery();
        return;
    }

    const answer = getCorrectAnswer(
        callbackData.type.split('-')[0],
        callbackData.questionId,
    );
    await ctx.reply(`Неверно ❌ Правильный ответ: ${answer}`);
    await ctx.answerCallbackQuery();
});

bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
        console.error('Error in request:', e.description);
    } else if (e instanceof HttpError) {
        console.error('Could not contact Telegram:', e);
    } else {
        console.error('Unknown error:', e);
    }
});

bot.start();