if(Boolean($.cookie('id'))){
    location.href = `/account/${$.cookie('id')}`;
}

$('input').on('input', () => {
    if ([...$('#textInput').val()].length > 0 && [...$('#password').val()].length > 0){
        $('#subBtn').attr('disabled' , false);
    }
    else{
        $('#subBtn').attr('disabled' , true);
    }
});