setInterval(() => {
    for (let i of $('.chat')) {
        $.ajax({
            url: '/getUserStatus',
            method: 'GET',
            data: {
                toUserId: i.getAttribute('id')
            },
            success(info) {
                const onlineBlock = $(`#${info.id}`).find('.isUserOnline');
                info.status ? onlineBlock.css('backgroundColor', app.green) : onlineBlock.css('backgroundColor', 'transparent');
            }
        });
    }
}, 30 * 1000);
// 30 секунд только потому , что это небольшой проект с малым кол-вом пользователей (по дефолту 5 минут)
