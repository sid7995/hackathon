setTimeout(function () {
    var currentLocation=[39.757,  -75.569];
    var mapServiceBaseURL = "/hack18/services/";

    var dealerMapDiv = $('#dealers-map');

    var dealerMap = dealerMapDiv.gmap3({
            center:currentLocation,
            zoom:4
        });


    socket.on("getMapData",function (data) {
        $.get(`${mapServiceBaseURL}${data.model}.json`,function (res) {
            console.log("FROM SERVICE",res);
            updateMarkers(res);
        });


    });

    function updateMarkers(res) {
        if(!!res.data && res.data.length) {
            var MARKERS = res.data.map((marker) => {
                marker.position = [marker.latitude,marker.longitude];
                delete marker.latitude;
                delete marker.longitude;
                return marker;
            });
            MARKERS.push({position:currentLocation, icon: "http://maps.google.com/mapfiles/marker_green.png",dealerName: "You are here."});

            dealerMap.marker(MARKERS)
                .fit()
                .infowindow({
                    content: ""
                })
                .then(function (infowindow) {

                    var map = this.get(0);
                    var marker = this.get(1);
                    for (let i = 0; i < marker.length; i++) {

                        google.maps.event.addListener(marker[i], 'mouseover', function() {
                            infowindow.setContent(marker[i].dealerName);
                            infowindow.open(map, this);
                        });

                        google.maps.event.addListener(marker[i], 'mouseout', function() {
                            infowindow.close(map, this);
                        });

                        google.maps.event.addListener(marker[i], 'click', function() {
                            if(i!=0){
                                onMarkerSelected(marker[i]);
                            }
                        });
                    }

                }).then(function () {
                $('.main-content').animate({
                    scrollTop: $("#map-review-offers-section").offset().top
                }, 500);

                dealerMapDiv.css("opacity",1);
            });
        }
    }


    function onMarkerSelected(selectedData){

        //LOAD REVIEWS
        let reviewsFrame = $("#reviewsFrame");
        reviewsFrame.attr("src",`/reviews/${selectedData.reviewUrl.match(/www.(.*).com/)[1]}/${selectedData.make}/${selectedData.model}`).show();

        //LOAD OFFERS
        let offersFrame = $("#offersFrame");
        offersFrame.attr("src",`/offers/${selectedData.offerUrl.match(/www.(.*).com/)[1]}/${selectedData.make}`).show();

        setDirection(selectedData.position);

    }

    function setDirection(destination){
        $("#directionBox").html("");
        dealerMap.route({
            origin:currentLocation,
            destination:destination,
            travelMode: google.maps.DirectionsTravelMode.DRIVING
        }).directionsrenderer(function (results) {
            if (results) {
                return {
                    panel: "#directionBox",
                    directions: results
                }
            }
        });
    }

},1000);