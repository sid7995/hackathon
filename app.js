var express = require("express");
var app = new express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var openalpr = require ("node-openalpr");
var fs = require ("fs");
var Log = require('log'),
    log = new Log('debug');
var port = process.env.PORT || 3001;
var numberPlatesLocalData = {};
var numberPlatesLocalDataClient = {};
const { exec } = require('child_process');


app.use(express.static(__dirname + "/public"));


app.get('/',function (req,res) {
    res.redirect('index.html');
});

io.on('connection',function (socket) {

function addRecognizeVehicle(base64Data,data){
    if(!numberPlatesLocalData[data.plate] && !!data.matches_template && data.confidence >= 80 ){
        numberPlatesLocalData[data.plate] = {};
        numberPlatesLocalData[data.plate].plate = data.plate;
        numberPlatesLocalData[data.plate].base64Data = base64Data;
        numberPlatesLocalData[data.plate].vehicleRecognized = false;
        numberPlatesLocalData[data.plate].matches_template = data.matches_template;
        numberPlatesLocalData[data.plate].confidence = data.confidence;

        /*FOR CLIENT*/
        numberPlatesLocalDataClient[data.plate] = {};
        numberPlatesLocalDataClient[data.plate].plate = data.plate;
        numberPlatesLocalDataClient[data.plate].matches_template = data.matches_template;
        numberPlatesLocalDataClient[data.plate].confidence = data.confidence;
        /*FOR CLIENT END*/

        recognizeVehicals();
    }
}
function recognizeVehicals(){
    for (var numberPlate in numberPlatesLocalData) {
        if (numberPlatesLocalData.hasOwnProperty(numberPlate) && !numberPlatesLocalData[numberPlate].vehicleRecognized) {
                numberPlatesLocalData[numberPlate].vehicleRecognized = true;
            var recFileName = __dirname + "/public/recordedImages/" + numberPlate + ".png";
            fs.writeFile(recFileName,  numberPlatesLocalData[numberPlate].base64Data, 'base64', function(err) {
                if(err) {
                    numberPlatesLocalData[numberPlate].vehicleRecognized = false;
                    return console.log(err);
                }
                console.log("GETTING MAKE MODEL");
                var cmd = `curl -X POST -F image=@${recFileName} 'https://api.openalpr.com/v2/recognize?recognize_vehicle=1&country=us&secret_key=sk_98ba118ad36639cde45ff912'`;
                exec(cmd, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`exec error: ${error}`);
                        return;
                    }
                    var results = JSON.parse(stdout).results;
                    console.log(results);
                    if(results.length > 0){
                        for(let i = 0;i< results.length;i++){
                            if(!!numberPlatesLocalData[results[i].plate]){
                                if(results[i].confidence >= 90){
                                    numberPlatesLocalData[results[i].plate].vehicleRecognized = true;
                                    numberPlatesLocalData[results[i].plate].color = results[i].vehicle.color[0].name;
                                    numberPlatesLocalData[results[i].plate].make = results[i].vehicle.make[0].name;
                                    numberPlatesLocalData[results[i].plate].model = results[i].vehicle.make_model[0].name;
                                    numberPlatesLocalData[results[i].plate].body_type = results[i].vehicle.body_type[0].name;
                                    numberPlatesLocalData[results[i].plate].year = results[i].vehicle.year[0].name;
                                    delete numberPlatesLocalData[results[i].plate].base64Data;


                                    /*FOR CLIENT*/
                                    numberPlatesLocalDataClient[results[i].plate].color = results[i].vehicle.color[0].name;
                                    numberPlatesLocalDataClient[results[i].plate].make = results[i].vehicle.make[0].name;
                                    numberPlatesLocalDataClient[results[i].plate].model = results[i].vehicle.make_model[0].name;
                                    numberPlatesLocalDataClient[results[i].plate].body_type = results[i].vehicle.body_type[0].name;
                                    numberPlatesLocalDataClient[results[i].plate].year = results[i].vehicle.year[0].name;
                                    /*FOR CLIENT END*/

                                }else {
                                    numberPlatesLocalData[results[i].plate].vehicleRecognized = false;
                                }
                            }
                        }
                        setTimeout(function () {
                            console.log("SENDING MAKE MODEL TO CLIENT");
                            socket.emit('gotUpdatedVehicals',numberPlatesLocalDataClient);
                        },100)

                    }
                });

            });
        }
    }
}
function writeImageFile(id,data){
    var path = __dirname + "/public/temp/" + id + ".png";
    var base64Data = data.replace(/^data:image\/png;base64,/, "");
        fs.writeFile(path, base64Data, 'base64', function(err) {
        if(err) {
            return console.log(err);
        }
        identify (path,base64Data);
    });
}

function identify (path,base64Data) {
    openalpr.IdentifyLicense (path, function (error, output) {
        var res={};
        var results = output.results;
        if(!!results && results.length > 0 ){
            res.results = results;
            res.numberPlatesLocalDataClient = numberPlatesLocalDataClient;
            //FILL DATA IN LOCAL OBJECT
            for(let i = 0;i< res.results.length;i++){
                addRecognizeVehicle(base64Data,res.results[i]);
            }
        }
        socket.emit('ProcessedData',res);

    });
}
    openalpr.Start ();
    openalpr.GetVersion ();

    socket.on('stream',function (image) {
        writeImageFile(socket.id,image)
    });

});

http.listen(port,function () {
    log.info('http://localhost:',port);
});
