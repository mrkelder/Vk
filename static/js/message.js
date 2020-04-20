function checkProperDate(number) {
    if (number < 10) {
        return `0${number}`;
    }
    else {
        return number;
    }
}
function msgBlock(text, id, date, author, logo) {
    return `<div class="message" id="${id}"><input class="mesCheckbox" type="checkbox" name="" id="${id}"><label class="messageContainer" for="${id}"><div class="checkMes"></div><div class="messageBlock"><img src="${logo}" class="msgLogo" alt="logo"><div class="msgInfo"><div class="userInfo"><b>${author}</b><span>${date}</span></div><p>${text}</p></div></div></label></div>`;
}

function stickerBlock(sticker, id, date, author, logo) {
    return `<div class="message" id="${id}"><input class="mesCheckbox" type="checkbox" name="" id="${id}"><label class="messageContainer" for="${id}"><div class="checkMes"></div><div class="messageBlock"><img src="${logo}" class="msgLogo" alt="logo"><div class="msgInfo"><div class="userInfo"><b>${author}</b><span>${date}</span></div><img class="msgSticker" src="/img/stickers${sticker}"/></div></div></label></div>`;
}

function generateFile(text, id, date, author, logo, file) {
    if ([...text].length === 0) {
        // Если в сообщении нет текста
        switch (file.match(/\.\w+$/)[0]) {
            case '.png':
                return `<div class="message" id="${id}"><input class="mesCheckbox" type="checkbox" name="" id="${id}"><label class="messageContainer" for="${id}"><div class="checkMes"></div><div class="messageBlock"><img src="${logo}" class="msgLogo" alt="logo"><div class="msgInfo"><div class="userInfo"><b>${author}</b><span>${date}</span></div><img class="msgImg" src="/files/${file}" class=""/></div></div></label></div>`;
            case '.mp3':
                return `<div class="message" id="${id}"><input class="mesCheckbox" type="checkbox" name="" id="${id}"><label class="messageContainer" for="${id}"><div class="checkMes"></div><div class="messageBlock"><img src="${logo}" class="msgLogo" alt="logo"><div class="msgInfo"><div class="userInfo"><b>${author}</b><span>${date}</span></div><audio class="msgAudio" src="/files/${file}" controls></audio></div></div></label></div>`;
            case '.mp4':
                return `<div class="message" id="${id}"><input class="mesCheckbox" type="checkbox" name="" id="${id}"><label class="messageContainer" for="${id}"><div class="checkMes"></div><div class="messageBlock"><img src="${logo}" class="msgLogo" alt="logo"><div class="msgInfo"><div class="userInfo"><b>${author}</b><span>${date}</span></div><video class="msgVideo" src="/files/${file}" controls preload="metadata"></video></div></div></label></div>`;
            case '.txt':
                return `<div class="message" id="${id}"><input class="mesCheckbox" type="checkbox" name="" id="${id}"><label class="messageContainer" for="${id}"><div class="checkMes"></div><div class="messageBlock"><img src="${logo}" class="msgLogo" alt="logo"><div class="msgInfo"><div class="userInfo"><b>${author}</b><span>${date}</span></div><a class="msgTxt" href="/files/${file}">${file}</a></div></div></label></div>`;
        }
    }
    else {
        switch (file.match(/\.\w+$/)[0]) {
            case '.png':
                return `<div class="message" id="${id}"><input class="mesCheckbox" type="checkbox" name="" id="${id}"><label class="messageContainer" for="${id}"><div class="checkMes"></div><div class="messageBlock"><img src="${logo}" class="msgLogo" alt="logo"><div class="msgInfo"><div class="userInfo"><b>${author}</b><span>${date}</span></div><p>${text}</p><img class="msgImg" src="/files/${file}"/></div></div></label></div>`;
            case '.mp3':
                return `<div class="message" id="${id}"><input class="mesCheckbox" type="checkbox" name="" id="${id}"><label class="messageContainer" for="${id}"><div class="checkMes"></div><div class="messageBlock"><img src="${logo}" class="msgLogo" alt="logo"><div class="msgInfo"><div class="userInfo"><b>${author}</b><span>${date}</span></div><p>${text}</p><audio class="msgAudio" src="/files/${file}" controls></audio></div></div></label></div>`;
            case '.mp4':
                return `<div class="message" id="${id}"><input class="mesCheckbox" type="checkbox" name="" id="${id}"><label class="messageContainer" for="${id}"><div class="checkMes"></div><div class="messageBlock"><img src="${logo}" class="msgLogo" alt="logo"><div class="msgInfo"><div class="userInfo"><b>${author}</b><span>${date}</span></div><p>${text}</p><video class="msgVideo" src="/files/${file}" controls preload="metadata"></video></div></div></label></div>`;
            case '.txt':
                return `<div class="message" id="${id}"><input class="mesCheckbox" type="checkbox" name="" id="${id}"><label class="messageContainer" for="${id}"><div class="checkMes"></div><div class="messageBlock"><img src="${logo}" class="msgLogo" alt="logo"><div class="msgInfo"><div class="userInfo"><b>${author}</b><span>${date}</span></div><p>${text}</p><a class="msgTxt" href="/files/${file}">${file}</a></div></div></label></div>`;
        }
    }
}

const chat = io('/chat');
const userTyping = io('/userTyping');
const input = $('#inputChat');
const messagesField = $('#messages');
const to = $.cookie('toUserId');
const chatId = $.cookie('chatId');
const from = $.cookie('id');
let hideTyping;
let isEmojisOn = false;

$('document').ready(() => {
    $('#messages').scrollTop($('#userTyping').offset().top);
    chat.emit('createRoom', chatId);
    chat.on('receiveMessage', msg => {
        // Получение сообщения
        if ($.cookie('name') !== msg.name) {
            $('#userTyping').before(msgBlock(msg.text, msg.id, msg.date, msg.name, $('#logoPhoto').attr('src')));
        }
    });
    chat.on('receiveSticker', msg => {
        // Получение стикера
        if ($.cookie('name') === msg.name) {
            $('#userTyping').before(stickerBlock(msg.sticker, msg.id, msg.date, msg.name, `/img/avatars/${$.cookie('userLogo')}`));
        }
        else {
            $('#userTyping').before(stickerBlock(msg.sticker, msg.id, msg.date, msg.name, $('#logoPhoto').attr('src')));
        }
    });
    chat.on('receiveMessageWithFile', msg => {
        if ($.cookie('name') === msg.name) {
            $('#userTyping').before(generateFile(msg.text, msg.id, msg.date, msg.name, `/img/avatars/${$.cookie('userLogo')}`, msg.file));
        }
        else {
            $('#userTyping').before(generateFile(msg.text, msg.id, msg.date, msg.name, $('#logoPhoto').attr('src'), msg.file));
        }
    });
    userTyping.emit('createTypingConnection', chatId);
    userTyping.on('receiveTyping', info => {
        // Скрипт для отображения/скрытия строчки 'Пользователь N печатает'
        if (info !== from) {
            clearTimeout(hideTyping);
            for (let i = 1; i <= 3; i++) {
                $(`#loadingDots .dot:nth-child(${i})`).css({
                    backgroundColor: app.grey,
                    animation: `dots 1s ease ${i * .25}s infinite`
                });
            }
            $('#userTyping p').css('color', app.grey);
            hideTyping = setTimeout(() => {
                $('#loadingDots .dot').css({
                    backgroundColor: 'transparent',
                    animation: 'none'
                });
                $('#userTyping p').css('color', 'transparent');
            }, 3000);
        }
    });
});

$('#messages').scroll(() => {
    // При скроле сообщений подгружаем сообщения (если позиция === 0)
    if($('#messages').scrollTop() === 0){
        let permission = true;
        for(let i of $('#messages').find('.message')){
            if(i.getAttribute('id') === 'msg1')
                permission = false
        }
        if(permission){
            const arrayForSure = [];
            arrayForSure.push($.cookie('id') , $.cookie('toUserId'))
            const dataForSure = JSON.stringify({ chatId: $.cookie('chatId'), users: arrayForSure , mesCount: $('#messages').find('.message').length})
            $.ajax({
                url: '/getMoreMessages',
                method: 'GET',
                data: {
                    data: dataForSure
                },
                success(info){
                    const userLogo = `/img/avatars/${$.cookie('userLogo')}`;
                    const anotherUserLogo = $('#logoPhoto').attr('src');
                    console.log(info)
                    for(let i of info.reverse()){
                        let name = i.userId === $.cookie('id') ? $.cookie('name') : $('#userName').text();
                        if(i.file !== undefined){
                            if ($.cookie('name') === name) {
                                $('#messages').prepend(generateFile(i.text, i.id, i.time, name, userLogo, i.file));
                            }
                            else {
                                $('#messages').prepend(generateFile(i.text, i.id, i.time, name, anotherUserLogo, i.file));
                            }
                        }
                        else if(i.sticker !== undefined){
                            if ($.cookie('name') === name) {
                                $('#messages').prepend(stickerBlock(i.sticker, i.id, i.time, name, userLogo));
                            }
                            else {
                                $('#messages').prepend(stickerBlock(i.sticker, i.id, i.time, name, anotherUserLogo));
                            }
                        }
                        else{
                            if ($.cookie('name') === name) {
                                $('#messages').prepend(msgBlock(i.text, i.id, i.time, name, userLogo));
                            }
                            else {
                                $('#messages').prepend(msgBlock(i.text, i.id, i.time, name, anotherUserLogo));
                            }
                            
                        }
                    }
                }
            });
        }
    }
});

$('#form').submit(e => {
    e.preventDefault();
});

$('#fileToChat').change(() => {
    // Добавляет строку статуса о файле
    const file = $('#fileToChat')[0].files[0];
    const fileName = [...file.name].length > 30 ? `${[...file.name].slice(0, 30).join('')}...` : file.name;
    $('#fileStatusName').text(fileName);
    $('#fileStatus').css('display', 'flex');
});

$('#fileStatusButton').click(() => {
    // Кнопка , для отмены файла
    $('#fileToChat').val('');
    $('#fileStatus').css('display', 'none');
});


$('body').keypress(e => {
    // Отправка сообщения при нажатии enter
    if (e.code === 'Enter') {
        // Проверка , что была нажата клавиша enter
        const time = new Date();
        const formData = new FormData($('#form')[0]);
        const file = $('#fileToChat')[0].files[0];
        let day = checkProperDate(time.getDate());
        let month = checkProperDate(time.getMonth() + 1);
        let year = time.getFullYear();
        let id;
        let text = input.val();
        try {
            id = `msg${Number($('#messages').find('.message')[$('#messages').find('.message').length - 1].getAttribute('id').match(/\d+/)[0]) + 1}`;
        }
        catch (err) {
            id = 'msg1';
        }
        if (file !== undefined) {
            // В случае , если есть файл
            formData.append('info', JSON.stringify({
                date: `${day}.${month}.${year}`,
                id: id,
                from: from,
                to: to,
                chatId: chatId,
                fromUser: app.name,
                chatId: $.cookie('chatId')
            }));
            $.ajax({
                url: '/chatFile',
                data: formData,
                method: 'POST',
                processData: false,
                contentType: false,
                enctype: 'multipart/form-data',
                success(e) {
                    // console.log(e)
                    // generateFile(text, id, `${day}.${month}.${year}`, app.name, `/img/avatars/${$.cookie('userLogo')}`, file.name);
                },
                error(err) {
                    alert('Потдержуются только файлы с расширением: .png , .mp3 , .mp4 , .txt');
                }
            });
            app.notSocket.emit('receiveNot', {
                date: `${day}.${month}.${year}`,
                id: id,
                text: 'Файл',
                from: from,
                to: to,
                chatId: chatId,
                fromUser: app.name,
                logo: $.cookie('userLogo')
            });
        }
        else if ([...input.val()].length > 0) {
            // В случае , если есть только текст
            chat.emit('sendMessage', {
                date: `${day}.${month}.${year}`,
                id: id,
                text: text,
                from: from,
                to: to,
                chatId: chatId,
                fromUser: app.name
            });
            
            app.notSocket.emit('receiveNot', {
                date: `${day}.${month}.${year}`,
                id: id,
                text: text,
                from: from,
                to: to,
                chatId: chatId,
                fromUser: app.name,
                logo: $.cookie('userLogo')
            });
            $('#userTyping').before(msgBlock(text, id, `${day}.${month}.${year}`, app.name, `/img/avatars/${$.cookie('userLogo')}`));
            $('#messages').scrollTop($('#messages')[0].clientHeight + 9999); // Скролл к последнему сообщению (9999 - просто цифра , чтобы проскролить до упора)
        }
        $('#fileToChat').val('');
        $('#fileStatus').css('display', 'none');
        input.val('');
    }
});

input.keypress(() => {
    // Отправка сокета для отображения 'Пользователь N печатает'
    userTyping.emit('userIsTyping', from);
});

$('.emoji').click(e => {
    // Использование emoji
    const emoji = e.target.innerText;
    const inputText = input.val();
    input.val(inputText + emoji);
});

$('#smile').click(() => {
    const emojis = $('#stickersAndEmoji');
    isEmojisOn === true ? emojis.css('display', 'none') : emojis.css('display', 'flex');
    isEmojisOn = !isEmojisOn;
});

$('.stickerPack').click(e => {
    if (e.target.id === 'emoji') {
        // Если пользователь переходит на эмодзи
        $('#slideStickerBlocks').css('right', '0px');
    }
    else {
        const stickerPackPosition = $(`#st_${e.target.id.match(/[0-9a-z]+$/)[0]}`).attr('data-postition');
        $('#slideStickerBlocks').css('right', `${stickerPackPosition}px`);
    }
});

$('.sticker').click(e => {
    // Отправляем стикер
    const emojis = $('#stickersAndEmoji');
    const time = new Date();
    let day = checkProperDate(time.getDate());
    let month = checkProperDate(time.getMonth() + 1);
    let year = time.getFullYear();
    let id;
    try {
        id = `msg${Number($('#messages').find('.message')[$('#messages').find('.message').length - 1].getAttribute('id').match(/\d+/)[0]) + 1}`;
    }
    catch (err) {
        id = 'msg1';
    }
    chat.emit('sendSticker', {
        date: `${day}.${month}.${year}`,
        id: id,
        sticker: e.target.getAttribute('src').match(/\/sticker\d+\/.+/)[0],
        from: from,
        to: to,
        chatId: chatId,
        fromUser: app.name
    });
    app.notSocket.emit('receiveNot', {
        date: `${day}.${month}.${year}`,
        id: id,
        text: 'Стикер',
        from: from,
        to: to,
        chatId: chatId,
        fromUser: app.name,
        logo: $.cookie('userLogo')
    });
    emojis.css('display', 'none');
    isEmojisOn = false;
});