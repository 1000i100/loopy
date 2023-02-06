// A list of CausalLoop object, support New, Delete, Edit, Save, Load, Import, Export, etc.
// Path: 2/js/Loopy.js

// write an angular service, which name is CLDService
angular.module('CLDService', [])
.factory('myService', ["$http", function($http) {
    var load = function() {
        return [
            new CausalLoop("test1", "房价和人口的关系", "7H2g9A1E/IrfPpsHRO5--fTzup_52_Q4L1z4iKvGVyeafymQGePZsgbBHeTVFjaFLsZfWLfL0fq73MgSLH1dKxjezafc6a6Z302RyqOcqv4i5pJtt1W1tIUIjrpwDwm5kYZMBCZuHX6Sep1T42nTEhfnW4Dd2WLOnmaBRe0hhwwPxjNHofQzZv_RscAjZuxHOGUVd5hJmLi9Z2tOlBbTBq4LrGs7y-EryfNlozuShMUI6G14sQFXJZYxQkePB6HDg_pVgc6OudO8qgSliTSZ0NSmH6KGJ2u6Agu8UH4Nwxe1XW6_TxDDmebUQhL76q5w7Q0PAZNBDMALq0k4XDuNv5ej0XX2KIRRZsCZt6cZozZk48UEFCAQk_bYen0rAR4awneeGU6luvJxJ78-3vIU8oDrYLxqfil-veOxJOgxIKAGJH4AHcY1fix5Fwa1jHS8kJYLemMzPLopv2xYu_6d1Kw.."),
            new CausalLoop("test2", "房价和人口的关系2", "CE4CMiAwK8vCcRx_CHAAA-AAHAAJNOERH4VQgAAAAAAAAAAAAHNvbWV0aGluZ2Bzb21ldGhpbmcgZWxzZWA-YGBgYGAuLi4.")
        ]
    }

    var loadURL = function(userid) {
        return $http.get('https://06acc315-0f75-44e5-9c43-7b77beab5d08-8080-public.ide.workbenchapi.com/CLDs?user_id=' + userid);
    };

    var create = function(userid) {
        return $http.post('https://06acc315-0f75-44e5-9c43-7b77beab5d08-8080-public.ide.workbenchapi.com/CLDs?user_id=' + userid);
    };

    var save = function(userid, SelectedItem) {
        // Issue a POST request to update the data
        return $http.post('https://06acc315-0f75-44e5-9c43-7b77beab5d08-8080-public.ide.workbenchapi.com/CLDs/' + SelectedItem.id + '?user_id=' + userid, SelectedItem);
    }

    var remove = function(userid, SelectedItem) {
        // Issue a POST request to update the data
        return $http.delete('https://06acc315-0f75-44e5-9c43-7b77beab5d08-8080-public.ide.workbenchapi.com/CLDs/' + SelectedItem.id + '?user_id=' + userid, SelectedItem);
    }   

    return {
        load: loadURL,
        save: save,
        new: create,
        delete: remove,
    }
}])

angular.module('myApp', ['CLDService'])
.controller('CLDController', ['myService', '$scope', function CLDController(myService, $scope) {
    var ctrl = this;
    
    $scope.SelectedItem = null;

    // get the userid from local storage
    $scope.userid = localStorage.getItem("userid");
    $scope.nickname = localStorage.getItem("nickname");

    if (!$scope.userid) {
        // 暂时没有访客模式，直接跳转到登录页面
        window.location.href = "login.html";
    }

    this.IsChanged = false;

    myService.load($scope.userid).then(function(response) {
        $scope.CausalLoops = JSON.parse(response.data);

        // return undefined if no item
        $scope.SelectedItem = $scope.CausalLoops[0];

        setTimeout(function checkIframe() {
            var iframe = document.getElementById('cldFrame');
            var w = iframe.contentWindow;
            if (w.loopy.loadFromData) {
                // if has at least one item, Select the first item
                if ($scope.CausalLoops.length > 0) {
                    $scope.handleClick($scope.CausalLoops[0]);
                } else {
                    // create a blank item
                    $scope.new();
                }
            } else {
              setTimeout(checkIframe, 100);
            }
          }, 100);

        // Remove function for $scope.CausalLoops
        $scope.CausalLoops.Remove = function(item) {
            var index = this.indexOf(item);
            if (index > -1) {
                this.splice(index, 1);
            }
        }
    });

    this.init = function() {
    }

    $scope.logout = function() {
        $scope.userid = "";

        // clear the local storage
        localStorage.removeItem("userid");

        // refresh the page to clear the data
        window.location.href = "login.html";
    }

    $scope.handleClick = function(item) {    
        var w = document.getElementById("cldFrame").contentWindow;
        w.loopy.loadFromData(item.body);
        $scope.SelectedItem = item;
        ctrl.IsChanged = false;
    }

    $scope.save = function() {
        // load data from loopy diagram
        var w = document.getElementById("cldFrame").contentWindow;
        var data = w.loopy.getDataAsURL();
        $scope.SelectedItem.body = data;

        myService.save($scope.userid, $scope.SelectedItem)
    }

    $scope.new = function() {
        // var blank = new CausalLoop("test2", "...", "CE4CMiAwK8vCcRx_CHAAA-AAHAAJNOERH4VQgAAAAAAAAAAAAHNvbWV0aGluZ2Bzb21ldGhpbmcgZWxzZWA-YGBgYGAuLi4.");
        myService.new($scope.userid).then(function(response) {
            var newCLD = JSON.parse(response.data);
            $scope.CausalLoops.push(newCLD);
            $scope.handleClick(newCLD);
        });
    }

    $scope.delete = function() {
        myService.delete($scope.userid, $scope.SelectedItem).then(function(response) {
            $scope.CausalLoops.Remove($scope.SelectedItem)

            // if has at least one item, Select the first item
            if ($scope.CausalLoops.length > 0) {
                $scope.handleClick($scope.CausalLoops[0]);
            } else {
                // create a blank item
                $scope.new();
            }
        });
    }
}]);

// Create a CaualLoop object, which has name, json for its body
function CausalLoop(id, name, body) {
    // Global unique ID 
    this.id = id;

    // Name of the causal loop object
    this.name = name;

    // JSON for the causal loop object
    this.body = body;
}

