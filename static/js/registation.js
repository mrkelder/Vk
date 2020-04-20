$('input').on('input', () => {
    if ([...$('#textInput').val()].length > 0 && [...$('#password').val()].length > 0 && [...$('#login').val()].length > 0){
        $('#subBtn').attr('disabled' , false);
    }
    else{
        $('#subBtn').attr('disabled' , true);
    }
});