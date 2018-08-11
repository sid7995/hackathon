var express = require("express");
var app = new express();
var http = require("http").Server(app);
var request = require('request');
var cheerio = require('cheerio');
var io = require("socket.io")(http);
var openalpr = require ("node-openalpr");
var fs = require ("fs");
var Log = require('log'),
    log = new Log('debug');
var port = process.env.PORT || 3001;
var numberPlatesLocalData = {};
//var numberPlatesLocalDataClient = {};
var isCarInCamera = false;
var latestCameraBase64Data = {plate:"",base64:""}; //hold latest camera image
const options ={
    confidence:80,
    api_key:"sk_DEMODEMODEMODEMODEMODEMO"
}
const { exec } = require('child_process');

/*LOAD CARS DATA FROM LOCAL DB*/
fs.readFile('DB.json', 'utf8', function(err, data) {
    if(err) {
        numberPlatesLocalData = {};
        return;
    }
    data  = (data == "") ? "{}" : data;
    numberPlatesLocalData = JSON.parse(data);
});
/*END*/


app.use(express.static(__dirname + "/public"));


app.get('/',function (req,res) {
    res.redirect('index.html');
});

/*SCRAPPING*/
app.get('/offers/:dealer/:make', function(req, res){
    var url = `https://www.${req.params.dealer}.com/Specials?make=${req.params.make}`;
    request(url, function(error, response, html){
        if(!error){
            var $ = cheerio.load(html);


            //remove header
            $("header").remove();

            //remove footer
            $("footer").remove();

            //remove filters
            $(".horizontal-filters-content").remove();

            //remove pagination
            //$("section[data-attr='card-specialsPagination-577821b2-fe70-4452-bfad-04dd63a4f97b-a2c4bd9e-4f08-4eb1-9b1a-4e2bb22c1f7b']" ).remove();

            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end($.html());
        }
    })

});
/*SCRAPPING END*/

io.on('connection',function (socket) {



    /*UTILS*/
    const filterOBJ = function( obj, predicate) {
        var result = {}, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key) && predicate(obj[key])) {
                result[key] = obj[key];
            }
        }

        return result;
    };
    /*UTILS ENDS*/

/*FUNCTIONS*/
    function writeImageFile(tempImageName,data){
        var path = __dirname + "/public/hack18/temp/" + tempImageName + ".png";
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
                isCarInCamera = true; //If result is not 0 it means some car is in camera
                res.results = results;
                for(let i = 0;i< res.results.length;i++){
                    if(!!res.results[i] && res.results[i].confidence >= options.confidence ) {
                        latestCameraBase64Data.plate = res.results[i].plate;
                        latestCameraBase64Data.base64 = base64Data;

                        if(!!numberPlatesLocalData[res.results[i].plate]){
                            console.log(" WITHOUT CALLING SERVER SENDING MAKE MODEL TO CLIENT");
                            socket.emit('gotVehical',numberPlatesLocalData[res.results[i].plate]);
                        }
                    }
                }


            }else {
                isCarInCamera = false;
            }
            socket.emit('NumberPlateData',res);
        });
    }


    setInterval(function(){
        //console.log("isCarInCamera",isCarInCamera);
        if(isCarInCamera){

            if(!!numberPlatesLocalData[latestCameraBase64Data.plate]){
                console.log(" WITHOUT CALLING SERVER SENDING MAKE MODEL TO CLIENT INTERVAL");
                socket.emit('gotVehical',numberPlatesLocalData[latestCameraBase64Data.plate]);
            }else {
                recognizeVehicalDetailsAndSendToClient(latestCameraBase64Data);
            }
        }
    }, 5000);


    function recognizeVehicalDetailsAndSendToClient(data){

        var recFileName = __dirname + "/public/hack18/recordedImages/" + data.plate + ".png";

        fs.writeFile(recFileName,  data.base64, 'base64', function(err) {
            if(err) {
                return console.log(err);
            }
            var cmd = `curl -X POST -F image=@${recFileName} 'https://api.openalpr.com/v2/recognize?recognize_vehicle=1&country=us&secret_key=${options.api_key}'`;
            console.log("CALLING CLOUD ALPR API FOR CAR DETAILS");
            console.log(cmd);
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return;
                }
                var results = JSON.parse(stdout).results;
                console.log(results);
                if(!!results && results.length > 0){
                    for(let i = 0;i< results.length;i++){
                        if (results[i].confidence >= options.confidence) {
                            //CREATE PLATE IF NOT EXISTS
                            if(!numberPlatesLocalData[results[i].plate]){
                                numberPlatesLocalData[results[i].plate]={};
                                numberPlatesLocalData[results[i].plate].plate = results[i].plate;
                                numberPlatesLocalData[results[i].plate].logo = `${results[i].vehicle.make[0].name.toLowerCase()}_thumb.png`,
                                numberPlatesLocalData[results[i].plate].confidence = results[i].confidence;
                                numberPlatesLocalData[results[i].plate].color = results[i].vehicle.color[0].name;
                                numberPlatesLocalData[results[i].plate].make = results[i].vehicle.make[0].name;
                                numberPlatesLocalData[results[i].plate].model = results[i].vehicle.make_model[0].name;
                                numberPlatesLocalData[results[i].plate].body_type = results[i].vehicle.body_type[0].name;
                                numberPlatesLocalData[results[i].plate].year = results[i].vehicle.year[0].name;
                            }else {
                                console.log("SENDING MAKE MODEL TO CLIENT");
                            }
                            socket.emit('gotVehical',numberPlatesLocalData[results[i].plate]);
                            /*WRITE LOCAL DB.JSON FILE*/
                            fs.writeFile('DB.json', JSON.stringify(numberPlatesLocalData), 'utf8', function (err) {
                                if (err) {
                                    console.info(err);
                                    return;
                                }
                            });
                            /*END*/

                        }
                    }
                }
            });

        });
    }
    /*FUNCTIONS ENDS*/

    /*INIT*/
    openalpr.Start(null, null, 10, true,"us");//config, runtime, count, start_queue, region
    openalpr.GetVersion ();

    var tempImageName;
    socket.on('stream',function (image) {
        if(!tempImageName){
            tempImageName = socket.id;
        }
        writeImageFile(tempImageName,image)
    });

    /*INIT END*/
});

http.listen(port,function () {
    log.info('http://localhost:',port);
});
