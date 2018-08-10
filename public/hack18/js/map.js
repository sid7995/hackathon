setTimeout(function () {
    var currentLocation=[39.757,  -75.569];

    var dealerMap = $('#dealers-map').gmap3({
            center:currentLocation,
            zoom:4
        })


    function onMarkerSelected(selectedData){
        setDirection(selectedData.position);
        //LOAD OFFERS
        //LOAD REVIEWS
        $("#reviewsFrame,#offersFrame").show();
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

    dealerMap.marker([
            {position:currentLocation, icon: "http://maps.google.com/mapfiles/marker_green.png",title: "You are here."},
            {position:[40.5985676,  -75.3431932],title:"Dealer1"},
            {position:[ 32.927,  -97.092],title:"Dealer3"},
            {position:[ 42.458607,   -82.96135],title:"Dealer4"},
            {position:[ 30.075598,  -90.508722],title:"Dealer5"},
            {position:[32.798229,  -96.684755],title:"Dealer2"}
        ])
        .fit()
        .infowindow({
            content: ""
        })
        .then(function (infowindow) {

            var map = this.get(0);
            var marker = this.get(1);
            for (let i = 0; i < marker.length; i++) {
                google.maps.event.addListener(marker[i], 'click', function() {
                    console.log(i)
                    infowindow.setContent(marker[i].title);
                    infowindow.open(map, this);
                    if(i!=0){
                        onMarkerSelected(marker[i])
                    }

                });
            }

        });
},1000);