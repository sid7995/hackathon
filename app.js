var express = require("express");
var app = new express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var openalpr = require ("node-openalpr");
var fs = require ("fs");

var Log = require('log'),
    log = new Log('debug');
var port = process.env.PORT || 3000;

app.use(express.static(__dirname + "/public"));


app.get('/',function (req,res) {
    res.redirect('index.html');
});

io.on('connection',function (socket) {

function writeImageFile(id,data){
    var path = __dirname + "/public/temp/" + id + ".png";
    var base64Data = data.replace(/^data:image\/png;base64,/, "");
    require("fs").writeFile(path, base64Data, 'base64', function(err) {
        if(err) {
            return console.log(err);
        }

        identify (path);
    });

}

function identify (path) {
    console.log (openalpr.IdentifyLicense (path, function (error, output) {
        var results = output.results;

        socket.broadcast.emit('ProcessedData',{"imageUrl":path,result:results});

        console.log (output.processing_time_ms +" "+ ((results.length > 0) ? results[0].plate : "No results"));
    }));
}

    //socket.broadcast.emit('stream',image);

    openalpr.Start ();
    openalpr.GetVersion ();

    socket.on('stream',function (image) {
        writeImageFile(socket.id,image)
    });

});

http.listen(port,function () {
    log.info('http://localhost:',port);
});
