;(function() {
    'use strict';

    angular.module('app.ctrls', [])

    .controller('AppCtrl', ['$scope', '$mdSidenav', '$mdDialog', function($scope, $mdSidenav, $mdDialog) {

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


    .controller('DashboardCtrl', ['$scope', function($scope) {

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
            $('.main-content').animate({
                scrollTop: $("#map-review-offers-section").offset().top
            }, 500);


        };

        $scope.log =function(data){
            console.log(data);
            gotoMapSection();
            $('#dealers-map').css("opacity",1);
        }

        $scope.cars =[];
        var isNotCalled = true;
        socket.on('gotVehical',function (res) {
            console.log(res);
          if(isNotCalled){
                isNotCalled =false;
                  var found = $scope.cars.find(function(element) {
                      return element.plate === res.plate;
                  });
                  if(!found){
                      console.log("SCOPE UPDATED");
                      $scope.cars.push(res);
                      $scope.$apply();
                  }
              isNotCalled = true;
            }
        });
    }])
})();
