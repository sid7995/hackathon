;(function() {
    'use strict';

    angular.module('app.ctrls', [])

    .controller('AppCtrl', ['$scope', '$mdSidenav', '$mdDialog','$anchorScroll', function($scope, $mdSidenav, $mdDialog,$anchorScroll) {

        // Open search btn
        $scope.openSearch = function() {
            $scope.isSearchOpen = true;
        };

        $scope.closeSearch = function(){
            $scope.isSearchOpen = false;
        };

        $scope.toggleSidenav = function() {
            $mdSidenav('sidenav-left').toggle();
        }

        $scope.closeDialog = function() {
            $mdDialog.hide();
        }

    }])


    .controller('DashboardCtrl', ['$scope','$http','$anchorScroll','$location', function($scope,$http,$anchorScroll,$location) {

        // === HACK18

        // data table via json
        $scope.options = {
            rowSelection: true,
            multiSelect: false,
            autoSelect: true,
            decapitate: false,
            largeEditDialog: false,
            boundaryLinks: false,
            limitSelect: true,
            pageSelect: true
        };
        $scope.selected = [];
        $scope.limitOptions = [5, 10, 15];
        $scope.query = {
            order: 'name', limit: 5, page: 1
        };
        $scope.columns = [
            {name: 'Plate', orderBy: 'plate'},
            {name: 'Type',descendFirst: true,  orderBy: 'type'},
            {name: 'Calories', numeric: true, orderBy: 'calories.value'},
            {name: 'Fat', numeric: true, orderBy: 'fat.value', unit: 'g'},
            {name: 'Protein', numeric: true, orderBy: 'protein.value', trim: true, unit: 'g'},
            {name: 'Iron', numeric: true, orderBy: 'iron.value'}
        ];

        /*$http.get('scripts/tables/sample_cars.json').then(function(desserts) {
            $scope.desserts = desserts.data;
        });*/

        $scope.toggleLimitOptions = function () {
            $scope.limitOptions = $scope.limitOptions ? undefined : [5, 10, 15];
        };

        $scope.getTypes = function () {
            return ['Candy', 'Ice cream', 'Other', 'Pastry'];
        };

        $scope.onPaginate = function(page, limit) {
            console.log('Scope Page: ' + $scope.query.page + ' Scope Limit: ' + $scope.query.limit);
            console.log('Page: ' + page + ' Limit: ' + limit);

            $scope.promise = $timeout(function () {

            }, 2000);
        };



        var gotoMapSection = function() {
            $location.hash('map-review-offers-section');
            $anchorScroll();
        };

        $scope.log =function(data){
            console.log(data);
            gotoMapSection();
            $('#dealers-map').css("opacity",1);
        }



















//ORIGINAL CODE
      /*  var objCars = {"CRZNUSA": {
            "vehicleRecognized": true,
                "confidence": 92.8623046875,
                "color": "silver-gray",
                "make": "chevrolet",
                "model": "chevrolet_captiva",
                "body_type": "sedan-standard",
                "year": "2005-2009"
        }};

        var carNumbers = Object.keys(objCars);

        var cars =[];
        for(let i=0;i<=carNumbers.length;i++){
            if(!!(objCars[carNumbers[i]] && objCars[carNumbers[i]].make)){
                objCars[carNumbers[i]].plate = carNumbers[i];
                objCars[carNumbers[i]].logo = `${objCars[carNumbers[i]].make.toLowerCase()}_thumb.png`;
                cars.push(objCars[carNumbers[i]]);
                //$scope.desserts = objCars[carNumbers[i];
            }
        }
        //$scope.cars*/
//ORIGINAL CODE
        $scope.cars =[];


        /*MOCK*/
        var isNotCalled = true;
        socket.on('ProcessedData',function(data){
            if(isNotCalled && Object.keys(data).length){
                isNotCalled =false;
                $http.get('scripts/tables/sample_cars.json').then(function(cars) {
                    $scope.cars = cars.data.data;
                    $scope.$apply();
                });
            }
        });


    }])


})();
