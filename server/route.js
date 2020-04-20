async function route(fastify, { assert, upload, jimp, path, fs, crypto, io }) {

    function addUserToChat({ db, mongodb, newChatId }, userId, func) {
        db.collection('users').updateOne(
            { '_id': mongodb.ObjectID(userId) },
            {
                $push: {
                    chats: newChatId
                }
            }, err => {
                assert.equal(err, null);
                func();
            });
    }

    async function sendMessages({ reply, chats, db, mongodb, user, data, funcCl }) {
        // Создание объекта сообщения для главной страницы пользователя (/account) и отправка
        const messages = [];
        for (let i of chats) {
            const info = await db.collection('users').find({
                '_id': { $ne: mongodb.ObjectID(user) },
                'chats': { $all: [mongodb.ObjectID(i._id).toString()] }
            }).toArray();
            const lastMessage = i.messages[i.messages.length - 1];
            messages.push({
                toUser: info[0].name,
                lastMessage: lastMessage,
                id: i._id,
                logo: info[0].logo,
                online: info[0].online,
                toUserId: info[0]._id,
                file: info[0].file,
                sticker: info[0].sticker
            });
        }
        reply
            .setCookie('id', mongodb.ObjectID(data['_id']).toString(), { path: '/' })
            .setCookie('name', data.name, { path: '/' })
            .view('chats', { name: data.name, chats: messages, id: mongodb.ObjectID(data['_id']).toString() });
        return { i: 'Success', inClient: funcCl };
    }

    async function giveChatInfo({ chat, db, client, mongodb, reply, userId }) {
        // Создает массив сообщений , получение информации собеседника
        const messages = [];
        for (let i of chat.messages) {
            // Собираем имя для комментария
            const userInfo = await db.collection('users').find({ _id: mongodb.ObjectID(i.userId) }).project({ name: 1, _id: 0, logo: 1 }).toArray()
            i.name = userInfo[0].name;
            i.logo = userInfo[0].logo;
            messages.push(i);
        }
        const userLogo = await db.collection('users').find({ "_id": mongodb.ObjectID(userId) }).project({ '_id': 0, logo: 1 }).toArray();
        const toUser = await db.collection('users').find({
            // Собираем информацию о собеседнике
            "_id": {
                $ne: mongodb.ObjectID(userId)
            },
            'chats': { $all: [mongodb.ObjectID(chat._id).toString()] }
        }).toArray();
        const toUserId = toUser[0]._id; // Id собеседника
        const toUserName = toUser[0].name; // Имя собеседника
        const toUserLogo = toUser[0].logo; // Аватарка пользователя
        const stickers = await db.collection('stickers').find({}).toArray();
        return { messages: messages, client: client, toUserName: toUserName, toUserId: toUserId, reply: reply, toUserLogo: toUserLogo, userLogo: userLogo[0].logo, stickers: stickers };
    }

    fastify.get('/', (req, reply) => {
        // Корневой рут (регистрация)
        if (req.cookies.id !== undefined || req.cookies.id === '') {
            reply.redirect(`/account/${req.cookies.id}`);
        }
        else {
            reply.view('index');
        }
    });

    fastify.get('/chat', (req, reply) => {
        if ([...req.query.c].length !== 24) {
            // Пользователь вписывает id чата , не соответствующий критерию (24 hex characters)
            reply.redirect('/errorLoL');
        }
        else {
            fastify.mongodb((db, client, mongodb) => {
                const chatId = req.query.c; // Id чата
                db.collection('chats').find({
                    '_id': mongodb.ObjectID(chatId)
                }).project({ messages: { $slice: -25 } }).toArray((err, arr) => {
                    assert.equal(err, null);
                    if (arr.length < 1) {
                        // В случае , если пользователей не найдено (нет такого чата)
                        // Ограничение 25 сообщений - остольные требуют подгрузки
                        reply.redirect('/errorLoL');
                        client.close();
                    }
                    else {
                        // Получение информации из функции
                        giveChatInfo({
                            chat: arr[0],
                            db: db,
                            client: client,
                            mongodb: mongodb,
                            reply: reply,
                            userId: req.cookies.id
                        }).then(({ messages, client, reply, toUserId, toUserName, toUserLogo, userLogo, stickers }) => {
                            // Отправка данных
                            reply
                                .setCookie('toUserId', toUserId, { path: '/chat' })
                                .setCookie('toUserName', toUserName, { path: '/chat' })
                                .setCookie('chatId', chatId, { path: '/chat' })
                                .setCookie('userLogo', userLogo, { path: '/chat' })
                                .view('message', { messages: messages, friendName: toUserName, name: arr[0].name, id: req.cookies.id, userLogo: toUserLogo, stickers: stickers });
                            client.close();
                        });
                    }
                });
            });
        }
    });

    fastify.get('/test' , (req  , reply) => {
        reply.view('test');
    })

    fastify.get('/registration', (req, reply) => {
        // Страница регистрации
        reply.view('registration');
    });

    fastify.post('/registrateUser', (req, reply) => {
        // Создание пользователя
        fastify.mongodb((db, client) => {
            db.collection('users').find({ login: req.body.login }).toArray((err, arr) => {
                assert.equal(err, null);
                if (arr.length < 1) {
                    const readyPassword = crypto.createHmac("sha256", 'smthLikeSecret').update(req.body.password).digest('hex');
                    db.collection('users').insertOne({ name: req.body.name, login: req.body.login, password: readyPassword, chats: [], logo: 'default.png', online: false }, (err, result) => {
                        assert.equal(err, null);
                        reply.redirect(`/account/${result.insertedId}`);
                        client.close();
                    });
                }
                else {
                    reply.redirect('/registration');
                }
            });
        });
    });

    fastify.get('/findUser', (req, reply) => {
        // Поиск и возврат пользователей в поисковеке
        fastify.mongodb((db, client) => {
            db.collection('users').find({
                $text: {
                    $search: req.query.name
                }
            }).limit(5).toArray((err, arr) => {
                assert.equal(err, null);
                reply.send(JSON.stringify(arr));
            });
        });
    });

    fastify.get('/createChat', (req, reply) => {
        // Создание нового чата , при поиске пользователя
        fastify.mongodb((db, client, mongodb) => {
            db.collection('chats').find({
                users: {
                    $all: [req.query.user, req.cookies.id]
                }
            }).toArray((err, arr) => {
                assert.equal(err, null);
                if (arr.length < 1) {
                    // В случае , если такого чата пока нет
                    db.collection('chats').insertOne({ users: [req.cookies.id, req.query.user], messages: [] }, (err, res) => {
                        assert.equal(err, null);
                        const conf = {
                            db: db,
                            mongodb: mongodb,
                            newChatId: mongodb.ObjectID(res.insertedId).toString()
                        };
                        addUserToChat(conf, req.cookies.id, () => {
                            addUserToChat(conf, req.query.user, () => {
                                reply.redirect(`/chat?c=${mongodb.ObjectID(res.insertedId).toString()}`);
                                client.close();
                            });
                        });
                    });
                }
                else {
                    // В случае , если такой чат уже есть
                    reply.redirect(`/chat?c=${mongodb.ObjectID(arr[0]._id).toString()}`);
                    client.close();
                }
            });
        });
    });

    fastify.get('/getMoreMessages', (req, reply) => {
        const messagesCount = (JSON.parse(req.query.data).mesCount * -2);
        fastify.mongodb((db, client, mongodb) => {
            db.collection('chats').find({
                '_id': mongodb.ObjectID(JSON.parse(req.query.data).chatId),
                users: {
                    $all: JSON.parse(req.query.data).users
                }
            }).project({ messages: { $slice: messagesCount }, '_id': 0, users: 0 }).toArray((err, arr) => {
                assert.equal(err, null);
                reply.send(arr[0].messages.slice(messagesCount , (JSON.parse(req.query.data).mesCount * -1)));
                client.close();
            });
        });
    });

    fastify.get('/account/:account', (req, reply) => {
        // Главная страница пользователя (список чатов)
        fastify.mongodb((db, client, mongodb) => {
            // Ищем пользователя по id
            db.collection('users').find({ '_id': mongodb.ObjectID(req.params.account) }).toArray((err, arr) => {
                assert.equal(err, null);
                if (arr.length === 0) {
                    client.close();
                    reply.redirect('/');
                }
                else {
                    const data = arr[0];
                    const userChats = [];
                    for (let i of data.chats) {
                        // Создаем ссылки на id чатов , где состоит пользователь
                        userChats.push(mongodb.ObjectID(i));
                    }
                    db.collection('chats').find({ "_id": { $in: userChats } }).toArray((err, chats) => {
                        // Получение всех чатов
                        assert.equal(err, null);
                        sendMessages({
                            mongodb: mongodb,
                            chats: chats,
                            reply: reply,
                            db: db,
                            user: req.params.account,
                            data: data,
                            funcCl: client
                        }).then(({ i, inClient }) => {
                            if (i === 'Success')
                                inClient.close();
                        });
                    });
                }
            });
        });
    });

    fastify.post('/authorization', (req, reply) => {
        // Регистрация нового пользователя
        fastify.mongodb((db, client) => {
            const collection = db.collection('users');
            collection.aggregate([
                { $match: { login: req.body.login } }
            ], (err, data) => {
                assert.equal(err, null);
                data.toArray().then(arr => {
                    const readyPassword = crypto.createHmac("sha256", 'smthLikeSecret').update(req.body.password).digest('hex');
                    if (arr.length < 1) {
                        // Если такого пользователя нет
                        reply.redirect('/');
                    }
                    else if (readyPassword === arr[0].password) {
                        // Если такой пользователь уже есть
                        reply.redirect(`/account/${arr[0]['_id']}`);
                        client.close();
                    }
                    else {
                        reply.redirect('/');
                    }
                });
            });
        });
    });

    fastify.get('/settings', (req, reply) => {
        reply.view('settings', { name: req.cookies.name });
    });

    fastify.get('/getUserStatus', (req, reply) => {
        // Возвращает статус пользователя (online / not online)
        fastify.mongodb((db, client, mongodb) => {
            db.collection('users').find({
                '_id': mongodb.ObjectID(req.query.toUserId)
            }).project({ '_id': 0, online: 1 }).toArray((err, arr) => {
                assert.equal(err, null);
                reply.send({ status: arr[0].online, id: req.query.toUserId });
                client.close();
            })
        });
    });

    fastify.route({
        // Смена информации о пользователе
        url: '/changeUserSettings',
        method: 'POST',
        preHandler: upload.single('logo_photo'),
        handler(req, reply) {
            if (req.file !== undefined) {
                // Если есть файл
                jimp.read(path.join(__dirname, `../temp/${req.file.filename}`), (err, photo) => {
                    assert.equal(err, null);
                    const nameForNewFile = `${req.file.filename}${req.file.originalname.match(/\.\w+$/)[0]}`;
                    photo.write(path.join(__dirname, `../static/img/avatars/${nameForNewFile}`));
                    fs.unlink(path.join(__dirname, `../temp/${req.file.filename}`), err => {
                        // Удаление временного файла аватарки
                        assert.equal(err, null);
                        if (req.body.name !== undefined || req.body.name !== '') {
                            // Если пользователь также указал имя
                            fastify.mongodb((db, client, mongodb) => {
                                db.collection('users').find({ '_id': mongodb.ObjectID(req.cookies.id) }).toArray((err, arr) => {
                                    assert.equal(err, null);
                                    db.collection('users').updateOne({ '_id': mongodb.ObjectID(req.cookies.id) }, { $set: { name: req.body.name, logo: nameForNewFile } }, err => {
                                        assert.equal(err, null);
                                        reply.send('Имя и фото пользователя успешно обновленны');
                                        client.close();
                                        if (arr[0].logo !== 'default.png')
                                            fs.unlink(path.join(__dirname, `../static/img/avatars/${arr[0].logo}`));
                                    });
                                });
                            });
                        }
                        else {
                            // Если пользователь не указал имени , но указал фото
                            fastify.mongodb((db, client, mongodb) => {
                                db.collection('users').updateOne({ '_id': mongodb.ObjectID(req.cookies.id) }, { $set: { logo: nameForNewFile } }, err => {
                                    assert.equal(err, null);
                                    reply.send('Фото пользователя успешно обновленно');
                                    client.close();
                                });
                            });
                        }
                    });
                });
            }
            else if (req.body.name !== undefined || req.body.name !== '') {
                // Если есть только имя
                fastify.mongodb((db, client, mongodb) => {
                    db.collection('users').updateOne({ '_id': mongodb.ObjectID(req.cookies.id) }, { $set: { name: req.body.name } }, err => {
                        assert.equal(err, null);
                        reply.send('Имя пользователя было успешно измененно');
                        client.close();
                    });
                });
            }
        }
    });

    fastify.route({
        url: '/chatFile',
        method: 'POST',
        preHandler: upload.single('msg_file'),
        handler(req, reply) {
            if (['.png', '.mp3', '.mp4', '.txt'].some(i => i == req.file.originalname.match(/\.\w+$/)[0])) {
                // Если такой файл потдержуется
                const infoAboutChat = JSON.parse(req.body.info);
                const a = fs.readFileSync(path.join(__dirname, `../temp/${req.file.filename}`));
                const file = `${req.file.filename}${req.file.originalname.match(/\.\w+$/)[0]}`;
                fs.writeFileSync(path.join(__dirname, `../static/files/${file}`), a);
                fastify.mongodb((db, client, mongodb) => {
                    // Добавление сообщение , содержащие файл
                    db.collection('chats').updateOne(
                        {
                            '_id': mongodb.ObjectID(infoAboutChat.chatId)
                        },
                        {
                            $push: {
                                messages: {
                                    userId: infoAboutChat.from,
                                    text: req.body.text,
                                    time: infoAboutChat.date,
                                    id: infoAboutChat.id,
                                    file: file
                                }
                            }
                        },
                        err => {
                            assert.equal(err, null);
                            client.close();
                            reply.code(200).send('');
                            fs.unlinkSync(path.join(__dirname, `../temp/${req.file.filename}`));
                            io.of('/chat').to(infoAboutChat.chatId).emit('receiveMessageWithFile', {
                                name: infoAboutChat.fromUser,
                                text: req.body.text,
                                id: infoAboutChat.id,
                                date: infoAboutChat.date,
                                file: file
                            });
                        }
                    );
                });
            }
            else {
                // Если такой файл не потдержуется
                fs.unlinkSync(path.join(__dirname, `../temp/${req.file.filename}`));
                reply.code(500).send('ERROR');
            }
        }
    });
}

module.exports = route;