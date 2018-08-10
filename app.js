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
var numberPlatesLocalDataClient = {};
const options ={
    confidence:80,
    api_key:"sk_DEMODEMODEMODEMODEMODEMO"
}
const { exec } = require('child_process');

/*LOAD CARS DATA FROM LOCAL DB*/
fs.readFile('DB.json', 'utf8', function(err, data) {
    if(err) {
        numberPlatesLocalData = {};
        numberPlatesLocalDataClient = {};
        return;
    }
    data  = (data == "") ? "{}" : data;
    numberPlatesLocalData = JSON.parse(data);
    numberPlatesLocalDataClient = JSON.parse(data);
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
    function writeImageFile(id,data){
        var path = __dirname + "/public/hack18/temp/" + id + ".png";
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
                //res.numberPlatesLocalDataClient = filterOBJ(numberPlatesLocalDataClient , numberPlate => numberPlate.color);
                res.numberPlatesLocalDataClient = filterOBJ(numberPlatesLocalDataClient , numberPlate => numberPlate.color);
                //FILL DATA IN LOCAL OBJECT
                for(let i = 0;i< res.results.length;i++){
                   // addRecognizeVehicle(base64Data,res.results[i]); //TODO uncomment it for fetching from server STOPPING FOR MOCK DATA
                }

               // console.log("SENDING PROCESSED DATA TO CLIENT");
               // socket.emit('ProcessedData',res);
            }
            socket.emit('ProcessedData',res);
        });
    }


    function addRecognizeVehicle(base64Data,data){
        if(!!data && !numberPlatesLocalData[data.plate] && data.confidence >= options.confidence ){
            numberPlatesLocalData[data.plate] = {};
            //numberPlatesLocalData[data.plate].plate = data.plate;
            numberPlatesLocalData[data.plate].base64Data = base64Data;
            numberPlatesLocalData[data.plate].vehicleRecognized = false;
            numberPlatesLocalData[data.plate].confidence = data.confidence;

            /*FOR CLIENT*/
            numberPlatesLocalDataClient[data.plate] = {};
            //numberPlatesLocalDataClient[data.plate].plate = data.plate;
            numberPlatesLocalDataClient[data.plate].confidence = data.confidence;
            numberPlatesLocalDataClient[data.plate].vehicleRecognized = false;
            /*FOR CLIENT END*/

            recognizeVehicalDetails();
        }else if(!!numberPlatesLocalData[data.plate] && !numberPlatesLocalData[data.plate].vehicleRecognized){
            recognizeVehicalDetails();
        }
    }


    function recognizeVehicalDetails(){
        for (var numberPlate in numberPlatesLocalData) {
            if (numberPlatesLocalData.hasOwnProperty(numberPlate) && !numberPlatesLocalData[numberPlate].vehicleRecognized) {

                console.log(numberPlatesLocalData[numberPlate].vehicleRecognized);

                numberPlatesLocalData[numberPlate].vehicleRecognized = true;

                console.log(numberPlatesLocalData[numberPlate].vehicleRecognized);

                var recFileName = __dirname + "/public/hack18/recordedImages/" + numberPlate + ".png";
                fs.writeFile(recFileName,  numberPlatesLocalData[numberPlate].base64Data, 'base64', function(err) {
                    console.log("WRITING FILE WITH NUMBER PLATE "+numberPlate);
                    if(err) {
                        numberPlatesLocalData[numberPlate].vehicleRecognized = false;
                        return console.log(err);
                    }



                    console.log("GETTING MAKE MODEL FOR"+numberPlate);
                    var cmd = `curl -X POST -F image=@${recFileName} 'https://api.openalpr.com/v2/recognize?recognize_vehicle=1&country=us&secret_key=${options.api_key}'`;
                    console.log(cmd);
                    exec(cmd, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`exec error: ${error}`);
                            return;
                        }
                        var results = JSON.parse(stdout).results;
                        //console.log(results);
                        if(!!results && results.length > 0){
                            for(let i = 0;i< results.length;i++){
                                //if(!numberPlatesLocalData[results[i].plate]) {
                                if (results[i].confidence >= options.confidence) {

                                    //IF NUMBER PLATE NOT MATCHING DELETE IT
                                    if(numberPlate !== results[i].plate){
                                        delete numberPlatesLocalData.numberPlate;
                                    }

                                    if(!numberPlatesLocalData[results[i].plate]){
                                        //CREATE PLATE IF NOT EXISTS
                                        numberPlatesLocalData[results[i].plate]={};
                                        numberPlatesLocalDataClient[results[i].plate]={};
                                    }

                                    numberPlatesLocalData[results[i].plate].vehicleRecognized = true;
                                    numberPlatesLocalData[results[i].plate].confidence = results[i].confidence;
                                    numberPlatesLocalData[results[i].plate].color = results[i].vehicle.color[0].name;
                                    numberPlatesLocalData[results[i].plate].make = results[i].vehicle.make[0].name;
                                    numberPlatesLocalData[results[i].plate].model = results[i].vehicle.make_model[0].name;
                                    numberPlatesLocalData[results[i].plate].body_type = results[i].vehicle.body_type[0].name;
                                    numberPlatesLocalData[results[i].plate].year = results[i].vehicle.year[0].name;
                                    delete numberPlatesLocalData[results[i].plate].base64Data;


                                    /*FOR CLIENT*/
                                    numberPlatesLocalDataClient[results[i].plate].vehicleRecognized = true;
                                    numberPlatesLocalDataClient[results[i].plate].confidence = results[i].confidence;
                                    numberPlatesLocalDataClient[results[i].plate].color = results[i].vehicle.color[0].name;
                                    numberPlatesLocalDataClient[results[i].plate].make = results[i].vehicle.make[0].name;
                                    numberPlatesLocalDataClient[results[i].plate].model = results[i].vehicle.make_model[0].name;
                                    numberPlatesLocalDataClient[results[i].plate].body_type = results[i].vehicle.body_type[0].name;
                                    numberPlatesLocalDataClient[results[i].plate].year = results[i].vehicle.year[0].name;
                                    /*FOR CLIENT END*/

                                    /*WRITE LOCAL DB.JSON FILE*/
                                    fs.writeFile('DB.json', JSON.stringify(numberPlatesLocalDataClient), 'utf8', function (err) {
                                        if (err) {
                                            console.info(err);
                                            return;
                                        }
                                    });
                                    /*END*/

                                    setTimeout(function () {
                                        console.log("SENDING MAKE MODEL TO CLIENT");

                                        //var numberPlatesLocalDataClientFiltered = filterObject(numberPlatesLocalDataClient,numberPlateC => !numberPlateC.falseData);
                                        var numberPlatesLocalDataClientFiltered = filterOBJ(numberPlatesLocalDataClient , numberPlate => numberPlate.color)
                                        socket.emit('gotUpdatedVehicals',numberPlatesLocalDataClientFiltered);

                                    },500)

                                } else {
                                    //numberPlatesLocalData[numberPlate].vehicleRecognized = false;
                                    //numberPlatesLocalDataClient[numberPlate].vehicleRecognized = false;
                                    numberPlatesLocalData[numberPlate].vehicleRecognized = true;
                                    numberPlatesLocalDataClient[numberPlate].falseData = true;
                                }
                                //}
                            }
                        }else {
                            console.log(numberPlate);
                            numberPlatesLocalData[numberPlate].vehicleRecognized = true;
                            numberPlatesLocalDataClient[numberPlate].falseData = true;
                        }
                    });

                });
            }
        }
    }
    /*FUNCTIONS ENDS*/

    /*INIT*/
    openalpr.Start(null, null, 1, true,"us");
    openalpr.GetVersion ();

    socket.on('stream',function (image) {
        writeImageFile(socket.id,image)
    });

    /*INIT END*/
});

http.listen(port,function () {
    log.info('http://localhost:',port);
});
