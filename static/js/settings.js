$('#logOut').click(() => {
    $.removeCookie('name');
    $.removeCookie('id');
    localStorage.removeItem('id');
    window.location.href = 'http://localhost:8080/';
});


$('#set_body').submit(e => {
    e.preventDefault();
    if ($('#changeName').val() !== '' || $('#file').val() !== '') {
        const formData = new FormData($('#set_body')[0]);
        $.ajax({
            url: '/changeUserSettings',
            data: formData,
            method: 'POST',
            processData: false,
            contentType: false,
            enctype: 'multipart/form-data'
        });
    }
});