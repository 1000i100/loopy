// A list of CausalLoop object, support New, Delete, Edit, Save, Load, Import, Export, etc.
// Path: 2/js/Loopy.js

// write an angular service, which name is CLDService
angular.module('CLDService', [])
.factory('myService', ["$http", function($http) {
    var loadSecret = function() {
        return $http.get('http://api.yyds-ai.com/secret');
    }

    return {
        loadSecret: loadSecret
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

    this.init = function() {
        // load secret from service and save it to local storage
        myService.loadSecret().then(function(response) {
            localStorage.setItem("secret", "Bearer " + response.data);
        });
    }

    $scope.logout = function() {
        $scope.userid = "";

        // clear the local storage
        localStorage.removeItem("userid");

        // refresh the page to clear the data
        window.location.href = "login.html";
    }
}]);

