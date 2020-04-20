class Main {
    constructor(id, name) {
        this.name = name;
        this.id = id;
        if ($.cookie('id') === undefined && localStorage.getItem('id') !== null) {
            $.cookie('id', localStorage.getItem('id'));
            this.id = localStorage.getItem('id');
        }
        if (localStorage.getItem('id') === null && $.cookie('id') !== undefined) {
            localStorage.setItem('id', $.cookie('id'));
        }
        this.mc = '#4a76a8';
        this.bgc = '#edeef0';
        this.white = '#f0f0f0';
        this.grey = '#a8adb8';
        this.green = 'rgb(35, 255, 171)';
        this.notSocket = io('/notification');
    }
    online() {
        if (this.name !== undefined) {
            const online = io('/online');
            online.emit('userGotOnline', this.id);
        }
    }
    headerSearch() {
        $('#search').focus(() => {
            if ([...$('#search').val()].length > 0) {
                $('#searchResults').css('display', 'flex');
            }
        });
        $('#search').focusout((e) => {
            if (e.relatedTarget === null) {
                $('#searchResults').css('display', 'none');
            }
            else {
                $('#searchResults').css('display', 'flex');
            }
        });
        $('#search').on('input', () => {
            if ([...$('#search').val()].length > 0) {
                $('.foundUser').remove();
                $.ajax({
                    url: "/findUser",
                    type: "GET",
                    data: { name: $('#search').val() },
                    success(e) {
                        const users = JSON.parse(e);
                        for (let i of users) {
                            if (i._id !== $.cookie('id'))
                                $('#searchResults').find('#foundResults').after(`<a class="foundUser" href="/createChat?user=${i._id}"><img src="/img/avatars/${i.logo}" alt="user"><div class="info"><h5>${i.name}</h5></div></a>`);
                        }
                    }
                });
                $('#searchResults').css('display', 'flex');
            }
            else {
                $('#searchResults').css('display', 'none');
            }
        });
    }
    getNotification() {
        // Принятие увеодмления
        $('#notificationSound')[0].addEventListener('canplay', () => {
            this.notSocket.emit('createNotNode', $.cookie('id'));
        });
        this.notSocket.on('sendNot', info => {
            if (info.chatId !== $.cookie('chatId')) {
                $('#notificationSound')[0].currentTime = 0; // сбрасываем время звука уведобления
                $('#notificationSound')[0].play(); // звук уведомления
                const removeNotification = setTimeout(() => {
                    $(`#not${info.id}`).remove();
                }, 10 * 1000);
                $('#notificationBlock').append(`<div class="notification" id="not${info.id}"><div class="notLogo"><img src="/img/avatars/${info.logo}" alt="avatar"></div><div class="notData"><div class="notInfo"><b>${info.fromUser}</b><span>${info.date}</span></div><div class="notText"><p>${info.text}</p></div></div><div class="notClose"><button onclick="app.closeNotification(${removeNotification} , '#not${info.id}')"></button></div></div>`);
            }
        });
    }
    closeNotification(timeOutObject, notId) {
        // Удаляет уведомление
        clearTimeout(timeOutObject);
        $(notId).remove();
    }
}

const app = new Main($.cookie('id'), $.cookie('name'));
app.online();
app.headerSearch();
if (location.href !== 'http://localhost:8080/')
    app.getNotification(); // подключаем уведомления