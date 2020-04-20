async function sockets(fastify, { assert, io, fs, path }) {

    function changeOnlineStatus(db, client, mongodb, user, status) {
        db.collection('users').updateOne(
            { '_id': mongodb.ObjectID(user) },
            {
                $set: {
                    online: status
                }
            },
            err => {
                assert.equal(err, null);
                client.close();
            }
        );
    }


    const chat = io.of('/chat'); // namespace для отправки сообщений
    const userTyping = io.of('userTyping'); // namespace для 'Пользователь N печатает'
    const online = io.of('/online'); // namespace для online статуса пользователей
    const notification = io.of('/notification'); // namespace для получения уведоблений

    notification.on('connection', socket => {
        socket.on('createNotNode', userId => {
            const notRooms = [];
            fastify.mongodb((db, client, mongodb) => {
                db.collection('users').find({ '_id': mongodb.ObjectID(userId) }).project({ '_id': 0, chats: 1 }).toArray((err, arr) => {
                    assert.equal(err, null);
                    for (let i of arr[0].chats) {
                        notRooms.push(i);
                        socket.join(i);
                    }
                    client.close();
                    socket.on('receiveNot', info => {
                        notification.to(info.chatId).emit('sendNot', info);
                    });
                    socket.on('disconnect', () => {
                        for (let i of notRooms) {
                            socket.leave(i);
                        }
                    });
                });
            });
        });
    });

    chat.on('connection', socket => {
        socket.on('createRoom', chatName => {
            socket.join(chatName);
            socket.on('sendMessage', e => {
                // Конфигурация сообщения
                const messageForUser = {
                    text: e.text,
                    date: e.date,
                    id: e.id,
                    name: e.fromUser
                };
                fastify.mongodb((db, client, mongodb) => {
                    // Отправка сообщения в БД
                    db.collection('chats').updateOne(
                        { '_id': mongodb.ObjectID(e.chatId) },
                        {
                            $push: {
                                messages: {
                                    userId: e.from,
                                    text: e.text,
                                    time: e.date,
                                    id: e.id
                                }
                            }
                        }, err => {
                            assert.equal(err, null);
                            client.close();
                        });
                });
                // Моментальная отправка сообщения другому пользователю
                chat.to(chatName).emit('receiveMessage', messageForUser);
            });
            socket.on('sendSticker', info => {
                const messageForUser = {
                    sticker: info.sticker,
                    date: info.date,
                    id: info.id,
                    name: info.fromUser
                };
                fastify.mongodb((db, client, mongodb) => {
                    db.collection('chats').updateOne({ '_id': mongodb.ObjectID(info.chatId) },
                        {
                            $push: {
                                messages: {
                                    userId: info.from,
                                    text: '',
                                    time: info.date,
                                    id: info.id,
                                    sticker: info.sticker
                                }
                            }
                        },
                        err => {
                            assert.equal(err, null);
                            client.close();
                        });

                });
                chat.to(info.chatId).emit('receiveSticker', messageForUser);
            });
            socket.on('disconnect', () => {
                socket.leave(chatName);
            });
        });
    });

    userTyping.on('connection', socket => {
        socket.on('createTypingConnection', chatId => {
            socket.join(chatId);
            socket.on('userIsTyping', info => {
                userTyping.to(chatId).emit('receiveTyping', info);
            });
            socket.on('disconnect', () => {
                socket.leave(chatId);
            });
        });
    });

    online.on('connection', socket => {
        socket.on('userGotOnline', user => {
            fastify.mongodb((db, client, mongodb) => {
                changeOnlineStatus(db, client, mongodb, user, true);
            });
            socket.on('disconnect', () => {
                fastify.mongodb((db, client, mongodb) => {
                    changeOnlineStatus(db, client, mongodb, user, false);
                });
            });
        });
    });
}

module.exports = sockets;