setTimeout(function(){

/*VARIABLES*/
var canvas = document.getElementById("preview");
var context = canvas.getContext("2d");
canvas.width=640;
canvas.height=480;
context.width=canvas.width;
context.height=canvas.height;
var video = document.getElementById("video");
//var socket = io();
/*VARIABLES END*/


/*FUNCTIONS*/
function logger (msg){
    $('#logger').text(msg);
}

function loadCam(stream){
    video.src = window.URL.createObjectURL(stream);
    logger('camera loaded');
}

function loadFail(){
    logger('camera fail');
}

function viewVideo(){
    context.drawImage(video,0,0,context.width,context.height);
    socket.emit('stream',canvas.toDataURL('image/png'));
}

function prepareNumberPlatesMasks(result){
    var cords = result.coordinates;
    if(!cords){
        return "0,0 0,0 0,0 0,0";
    }
    return `${cords[0].x},${cords[0].y} ${cords[1].x},${cords[1].y} ${cords[2].x},${cords[2].y} ${cords[3].x},${cords[3].y}`;
}
/*FUNCTIONS END*/

/*ACTIONS*/
$(function () {
    navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia
        || navigator.msgGetUserMedia);

    if(navigator.getUserMedia){
        navigator.getUserMedia({video :true},loadCam,loadFail);
    }
    setInterval(function () {
        viewVideo(video,context);
    },100);
});
/*ACTIONS ENDS*/

/*RECEIVER*/
socket.connect().on('ProcessedData',function (res) {
    if(res.numberPlatesLocalDataClient){
        $("#recVehicals").html(JSON.stringify(res.numberPlatesLocalDataClient));
    }

    if(!$.isEmptyObject(res.results)){
        for(let i = 0;i< res.results.length;i++){
            $( `.numberPlateFill:eq( ${i} )` ).attr( "points", prepareNumberPlatesMasks(res.results[i]) );
        }
    }else {
        $(".numberPlateFill").attr( "points", "0,0 0,0 0,0 0,0");
    }
});

socket.connect().on('gotUpdatedVehicals',function (res) {
    $("#recVehicals").html(JSON.stringify(res));
});

/*RECEIVER ENDS*/
},1000);