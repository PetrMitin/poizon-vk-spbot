const { VK, Keyboard, MessageContext } = require(`vk-io`);
const path = require('path')
const { SessionManager } = require(`@vk-io/session`);
const { HearManager } = require(`@vk-io/hear`);
const { SceneManager, StepScene } = require(`@vk-io/scenes`);
require('dotenv').config()
const base = require(path.resolve(__dirname, 'base.json')) || [];
const play = require(path.resolve(__dirname, 'playlist.json'));
const acc = require(path.resolve(__dirname, 'accounts.json'));
const fs = require("fs");
const { parseUserApiToken, spamToGroup, spamToGroups, verifyAdmin } = require('./utils');
//567995123

const vk = new VK({
	token: process.env.VK_API_TOKEN
});

vk.updates.start()
.then((then) => {
	console.clear();
	console.log(`\n`);
	console.log('\x1b[0m» \x1b[36m Скрипт\x1b[34m Роман Свешников\x1b[36m Запущен\x1b[34m!\x1b[36m');
	console.log(`\x1b[0m» \x1b[36m Введите\x1b[34m JS\x1b[36m команду ниже\x1b[34m:\x1b[36m\n`)
	process.openStdin().on('data', function(chunk) { 
		try {
			console.log(`\x1b[0m» \x1b[36m${eval(`${chunk}`)}`);
		} catch (e) {
			console.log(`\x1b[0m» \x1b[36m${e}`);
		};
	});
})
.catch(console.error());

const sessionManager = new SessionManager();
const sceneManager = new SceneManager();
const bot = new HearManager();

vk.updates.on(`message_new`, sessionManager.middleware);
vk.updates.on(`message_new`, sceneManager.middleware);
vk.updates.on(`message_new`, sceneManager.middlewareIntercept);
vk.updates.on('message_new', bot.middleware);

function find(id){ 
	for(i=0;i<base.length;i++) { 
		if(id == base[i].id) return i; 
	} 
};
function save() { 
	fs.writeFileSync(path.resolve(__dirname, 'base.json'), JSON.stringify(base, null, "\t"));
};
function saveP() { 
	fs.writeFileSync(path.resolve(__dirname, 'playlist.json'), JSON.stringify(play, null, "\t"));
};
function saveA() { 
	fs.writeFileSync(path.resolve(__dirname, 'accounts.json'), JSON.stringify(acc, null, "\t"));
};

sceneManager.addScenes([
	new StepScene(`scene1`, [
		async (context) => {
			if (context.scene.step.firstTime || !context.text) {
				return await context.send(`• Одноразовый старт?\nЕсли нет то введите число.`, {
                    keyboard: Keyboard.keyboard([
                        [
                            Keyboard.textButton({
                                label: 'Да',
                                color: Keyboard.POSITIVE_COLOR
                            }),
                            Keyboard.textButton({
                                label: '10',
                                color: Keyboard.NEGATIVE_COLOR
                            }),
                        ],
                    ]).inline()
                });
			};
			context.scene.state.a1 = context.text;
			return await context.scene.step.next();
		},
        async (context) => {
			var { a1 } = context.scene.state;
            if (context.scene.step.firstTime || !context.text) {
                if (`${a1}`.match(/\D/) == null) {
                    return await context.send(`• Выберите плейлист Групп, плейлист Аккаунтов и текст для рассылки.\n\nПример:\n1 (номер плейлиста групп)\n2 (номер плейлиста аккаунтов)\n3 (текст рассылки)`);
                } else {
                    context.scene.state.a1 = 1;
                    return await context.send(`• Выберите плейлист Групп, плейлист Аккаунтов и текст для рассылки.\n\nПример:\n1 (номер плейлиста групп)\n2 (номер плейлиста аккаунтов)\n3 (текст рассылки)`);
                };
            };
            context.scene.state.a2 = context.text;
            return await context.scene.step.next();
        },
        async (context) => {
            if (context.scene.step.firstTime || !context.text) {
                return await context.send(`• Запускаем?\n<<Да>>/<<Нет>>`, {
                    keyboard: Keyboard.keyboard([
                        [
                            Keyboard.textButton({
                                label: 'Да',
                                color: Keyboard.POSITIVE_COLOR
                            }),
                            Keyboard.textButton({
                                label: 'Нет',
                                color: Keyboard.NEGATIVE_COLOR
                            }),
                        ],
                    ]).inline()
                });
            };
            context.scene.state.a3 = context.text;
            return await context.scene.step.next();
        },
		async (context) => {
			const { a1, a2, a3 } = context.scene.state;
            if (context.scene.step.firstTime || !context.text) {
                var getParams = a2.replace(/\n/gi, "|1q5w9e6r3a2c|").split("|1q5w9e6r3a2c|");
                var indexP = play.findIndex(x => x.id === Number(getParams[0]));
                if (indexP < 0) {
                    await context.send(`• Отменяем. ГруппЛист не найден!`);
                    return await context.scene.leave();    
                };
                var indexA = acc.findIndex(x => x.id === Number(getParams[1]));
                if (indexA < 0) {
                    await context.send(`• Отменяем. АккЛист не найден!`);
                    return context.scene.leave();    
                };
                if (`${a3}`.toLowerCase().includes("да")) {
                    if (getParams.length !== 3) {
                        await context.send(`• Отменяем. Не указан 1 или более параметров в вопросе:\n\n"Выберите плейлист Групп, плейлист Аккаунтов и текст для рассылки".`);
                        return await context.scene.leave();    
                    };
                    var idNum = 0;
                    try {
                        idNum = base[base.length-1].id+1;
                    } catch {
                        idNum = idNum+1;
                    };
                    base.push({
                        id: idNum,
                        play: Number(getParams[0]),
                        acc: Number(getParams[1]),
                        text: getParams[2],
                        rep: Number(a1),
                        indexPlay: indexP,
                        indexAcc: indexA,
                        doGroup: 0,
                        toGroup: play[indexP].groups.length,
                        doAcc: 0,
                        toAcc: acc[indexA].accounts.length,
                        end: 0,
                        isRunningFirstTime: true
                    });
                    save();
                    //const accListString = base[base.length-1].acc.map(accId => `https://vk.com/id${accId}`).join(' \n')
                    //const groupListString = base[base.length-1].play.map(groupId => `https://vk.com/id${groupId}`).join(' \n')
                    return await context.send(`• Запущено! Мы уведомим вас когда закончим!\n`);
                } else {
                    await context.send(`• Отменяем.`);
                    return await context.scene.leave();
                };
            };
            context.scene.state.a4 = context.text;
            return await context.scene.step.next();
		}
	])
]);

var owner_ids = parseInt(process.env.OWNERS_ID);
const adminIdArr = [owner_ids, 324721103]

async function poll() {
    try {
            base.forEach(async function(data, index){
                if (data.end === 1 || !data.isRunningFirstTime) {
                    data.isRunningFirstTime = false
                    //this.splice(index, 1)
                    return save()
                }
                data.isRunningFirstTime = false
                save()
                console.log(`Начат заказ ${data.id}`)
                const groupsArr = play[data.indexPlay].groups;
                const tokensArr = acc[data.indexAcc].accounts;
                const text = data.text
                const reps = data.rep * groupsArr.length
                await spamToGroups(groupsArr, tokensArr, text, reps, async () => {
                    await vk.api.messages.send({
                        user_id: owner_ids,
                        random_id: 0,
                        message: `• Заказ №${data.id} выполнен.`
                    });
                    data.end = 1;
                    save();
                })
            }, base);
    } catch (e) {
        console.log(e)
    };
}

let totalTime = 0
base.forEach((el) => {
    totalTime += el.toGroup * 60000
})

setInterval(() => {
    save()
    poll()
}, 60000)

//"vk1.a.kZ-2BePHkinZqrau7NaIe2dRWAVerYe0BK0PQxsfKGXSHnsCf6_748gYdr7smWxjRIXLloHYjG8gzAsqkb-d-0e4ufkVwrFiofNwHO4kxBqc6Z1cJVVKzQx7uKSYpfJ4kRbCfYAphOd498zqYVBIBcYfwE6AM9loTgE4jjlFgzPiRskcmlM-Jt_HhdJBoHHYzidbi5CsKLJIPbuvDYblYg",

bot.hear(/!заказать/i, async (context) => {
    if (!verifyAdmin(context.senderId, adminIdArr)) return;
	await context.scene.enter(`scene1`);
});
bot.hear(/!групплисты/i, async (context) => {
    if (!verifyAdmin(context.senderId, adminIdArr)) return;
	await context.send(`📖 Привет!\n\nЧтобы создать плейлист, напишите «создать групплист «Номер» »\n\n
    Чтобы добавить группы, напишите «в групплист «номер» «ссылка» » \n\n
    Чтобы убрать группы из плейлиста, напишите «из групплиста «номер» «ссылка» »\n\n
    Чтобы удалить плейлист, напишите «удалить групплист «номер» »`);
});


bot.hear(/^(?:создать групплист) ?([0-9]+)?$/i, async (context) => {
    if (!verifyAdmin(context.senderId, adminIdArr)) return;
    if (!context.$match[1]) return await context.send(`ID не указан.`);
    for (i=0;i<play.length;i++) {
        if (play[i].id == context.$match[1]) {
            return await context.send(`ID уже занят.`);
        };
    };
    await context.send(`• Готово! Добавлен ГруппЛист №${context.$match[1]}.`);
    play.push({
        id: Number(context.$match[1]),
        groups: []
    });
    saveP()
});
bot.hear(/^(?:удалить групплист) ?([0-9]+)?$/i, async (context) => {
    if (!verifyAdmin(context.senderId, adminIdArr)) return;
    if (!context.$match[1]) return await context.send(`ID не указан.`);
    for (i=0;i<play.length;i++) {
        if (play[i].id == context.$match[1]) {
            await context.send(`• Готово! Удален ГруппЛист №${context.$match[1]}.`);
            var index = play.findIndex(x => x.id === Number(context.$match[1]));
            if (index < 0) return await context.send(`ID не занят.`);
            play.splice(index,1);
            saveP()
            return;
        };
    };
    return await context.send(`ID не занят.`);
});
bot.hear(/^(?:создать акклист) ?([0-9]+)?$/i, async (context) => {
    if (!verifyAdmin(context.senderId, adminIdArr)) return;
    if (!context.$match[1]) return await context.send(`ID не указан.`);
    for (i=0;i<acc.length;i++) {
        if (acc[i].id == context.$match[1]) {
            return await context.send(`ID уже занят.`);
        };
    };
    await context.send(`• Готово! Создан АккЛист №${context.$match[1]}.`);
    acc.push({
        id: Number(context.$match[1]),
        accounts: []
    });
    saveA()
});
bot.hear(/^(?:удалить акклист) ?([0-9]+)?$/i, async (context) => {
    if (!verifyAdmin(context.senderId, adminIdArr)) return;
    if (!context.$match[1]) return await context.send(`ID не указан.`);
    for (i=0;i<acc.length;i++) {
        if (acc[i].id == context.$match[1]) {
            await context.send(`• Готово! Удален АккЛист №${context.$match[1]}.`);
            var index = acc.findIndex(x => x.id === Number(context.$match[1]));
            if (index < 0) return await context.send(`ID не занят.`);
            acc.splice(index,1);
            saveA()
            return;
        };
    };
    return await context.send(`ID не занят.`);
});

bot.hear(/^(?:удалить заказ) ?([0-9]+)?$/i, async (context) => {
    if (!verifyAdmin(context.senderId, adminIdArr)) return;
    if (!context.$match[1]) return await context.send(`ID не указан.`);
    var ends = 1;
    base.forEach(async function(data){
        if (data.id == context.$match[1]) {
            var index = base.findIndex(x => x.id === Number(context.$match[1]));
            if (index < 0) return await context.send(`ID не занят.`);
            await context.send(`• Готово! Удален Заказ №${context.$match[1]}.`);
            base.splice(index,1);
            save();
            ends = 0;
            return;
        };
    });
    if (ends == 1) return await context.send(`ID не занят.`);
});

bot.hear(/^(?:в групплист) ?([0-9]+)? ?([\s\S]+)?$/i, async (context) => {
    if (!verifyAdmin(context.senderId, adminIdArr)) return;
    for (i=0;i<play.length;i++) {
        if (play[i].id == context.$match[1]) {
            var links = context.$match[2].split(" ");
            var id_links = [];
            for (i=0;i<links.length;i++) {
                var recharch = await vk.api.utils.resolveScreenName({
                    screen_name: `${links[i]}`.replace("https", "").replace("http", "").replace("vk.com", "").replace(/\//gi, "").replace(":", "")
                }).then((a) => {
                    if (a.length == 0) 
                        id_links.push(Number(links[i]));
                    else
                        id_links.push(a.object_id);
                }).catch((b) => {
                });
            };
            if (id_links.length !== 0) {
                var index = play.findIndex(x => x.id === Number(context.$match[1]));
                for (i=0;i<id_links.length;i++) {
                    play[index].groups.push(id_links[i]);
                };
            };
           
            await context.send(`• Готово! В ГруппЛисты добавлены Ваши группы.`);
            saveP();
            return;
        };
    };
    return context.send(`ID не найден.`);
});
bot.hear(/^(?:из групплиста) ?([0-9]+)? ?([\s\S]+)?$/i, async (context) => {
    if (!verifyAdmin(context.senderId, adminIdArr)) return;
    for (i=0;i<play.length;i++) {
        if (play[i].id == context.$match[1]) {
            var links = context.$match[2].split(" ");
            var id_links = [];
            for (i=0;i<links.length;i++) {
                var recharch = await vk.api.utils.resolveScreenName({
                    screen_name: `${links[i]}`.replace("https", "").replace("http", "").replace("vk.com", "").replace(/\//gi, "").replace(":", "")
                }).then((a) => {
                    if (a.length == 0) 
                        id_links.push(Number(links[i]));
                    else
                        id_links.push(a.object_id);
                }).catch((b) => {
                });
            };
            if (id_links.length !== 0) {
                var index = play.findIndex(x => x.id === Number(context.$match[1]));
                for (i=0;i<id_links.length;i++) {
                    var indexG = play[index].groups.findIndex(x => x === Number(id_links[i]));
                    if (indexG >= 0) play[index].groups.splice(indexG,1);
                };
            };
            await context.send(`• Готово! Из ГруппЛиста удалены Ваши группы.`);
            saveP();
            return;
        };
    };
    return await context.send(`ID не найден.`);
});
bot.hear(/^(?:в акклист) ?([0-9]+)? ?([^]+)?$/i, async (context) => {
    if (!verifyAdmin(context.senderId, adminIdArr)) return;
    for (i=0;i<acc.length;i++) {
        if (acc[i].id == context.$match[1]) {
            var links = context.$match[2].split(" ");
            var id_links = [];
            for (i=0;i<links.length;i++) {
                var getToken = ``;
                try {
                    getToken =  parseUserApiToken(links[i])
                } catch {
                    getToken =  `${links[i]}`;
                };
                id_links.push(getToken);
            };
            if (id_links.length !== 0) {
                var index = acc.findIndex(x => x.id === Number(context.$match[1]));
                for (i=0;i<id_links.length;i++) {
                    acc[index].accounts.push(id_links[i]);
                };
            };
            await context.send(`• Готово! В АккЛист добавлены Ваши аккаунты.`);
            saveA();
            return;
        };
    };
    return await context.send(`ID не найден.`);
});
bot.hear(/^(?:из акклиста) ?([0-9]+)? ?([^]+)?$/i, async (context) => {
    if (!verifyAdmin(context.senderId, adminIdArr)) return;
    for (i=0;i<acc.length;i++) {
        if (acc[i].id == context.$match[1]) {
            var links = context.$match[2].split(" ");
            var id_links = [];
            for (i=0;i<links.length;i++) {
                var recharch = await vk.api.utils.resolveScreenName({
                    screen_name: `${links[i]}`.replace("https", "").replace("http", "").replace("vk.com", "").replace(/\//gi, "").replace(":", "")
                }).then((a) => {
                    if (a.length == 0) 
                        id_links.push(Number(links[i]));
                    else
                        id_links.push(a.object_id);
                }).catch((b) => {
                });
            };
            if (id_links.length !== 0) {
                var index = acc.findIndex(x => x.id === Number(context.$match[1]));
                for (i=0;i<id_links.length;i++) {
                    var indexG = acc[index].accounts.findIndex(x => x === Number(id_links[i]));
                    if (indexG >= 0) acc[index].accounts.splice(indexG,1);
                };
            };
            await context.send(`• Готово! Из АккЛиста удалены Ваши аккаунты.`);
            saveA();
            return;
        };
    };
    return await context.send(`ID не найден.`);
});

bot.hear(/!аккаунты/i, async (context) => {
    if (!verifyAdmin(context.senderId, adminIdArr)) return;
	await context.send(`• Делаю проверку аккаунтов...`);
    var cheackeng = [];
    var a = 0,
        b = 0;
    for (a=0;a<acc.length;a++) {
        a = a;
        for (b=0;b<acc[a].accounts.length;b++) {
            b = b;
            var user = new VK({
                token: `${acc[a].accounts[b]}`
            });
            var getId = await user.api.users.get()
            .then(async(a) => {
                var accs = await vk.api.users.get({
                    user_ids: a[0].id
                });
                if (accs[0].deactivated) {
                    cheackeng.push(`• @id${a[0].id} | ${accs[0].deactivated}`);
                    acc[a].accounts.splice(b, 1);
                };
            })
            .catch(async(c) => {
                cheackeng.push(`${acc[a].accounts[b]} | does not work`);
                var index = acc[a].accounts.findIndex(x => x === acc[a].accounts[b]);
                acc[a].accounts.splice(index, 1);
            });
        };
    };
    saveA();
    if (cheackeng.length == 0) cheackeng.push(`Все работают без ошибок!`)
    await context.send(`• Аккаунты успешно проверенны, и невалидные удалены:\n\n${cheackeng.join("\n")}`)
});

bot.hear(/!выполняются/i, async (context) => {
    if (!verifyAdmin(context.senderId, adminIdArr)) return;
    var list = [];
    base.forEach(function(data){
        if (data.end == 0) {
            list.push(`• ID: ${data.id}\n• ГруппЛист: ${data.play}\n• АккЛист: ${data.acc}\n• Текст: ${data.text}\n• Еще повторов: ${data.rep}\n\n`);
        };  
    });
    if (list.length == 0) list.push("Заказы не найдены.");
    await context.send(`• Посмотрели все Выполняющиеся:\n\n${list.join("\n")}`)
});

bot.hear(/!старт/i, async (context, next) => {
    console.log(context.senderId, owner_ids)
    if (!verifyAdmin(context.senderId, adminIdArr)) return;
    contextPref = context;
	await context.send(`📖 Привет! Вот все Кнопочки:`, {
	    keyboard: Keyboard.keyboard([
	        [
                Keyboard.textButton({
                    label: '!заказать'
                }),
		        Keyboard.textButton({
		            label: `!групплисты`
		        }),
	        ], 
	        [
                Keyboard.textButton({
                    label: '!аккаунты'
                }),
		        Keyboard.textButton({
		            label: `!выполняются`
		        }),
	        ], 
	    ]).inline()
	});
    next()
});