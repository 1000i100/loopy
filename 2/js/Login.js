// 登录页面控制器
var app = angular.module("LoginApp", []);
app.controller("LoginController", ["$scope", "$http", function ($scope, $http) {
	// $scope.userName = "test";
	// $scope.password = "";

  $scope.login = function () {
    var data = {
      username: $scope.username,
			// if password is undefined, it will be set to empty string
			password: $scope.password || "",
    };

    $http.post("https://06acc315-0f75-44e5-9c43-7b77beab5d08-8080-public.ide.workbenchapi.com/login", data).then(
      function (response) {
        if (response.data.userid) {
          localStorage.setItem("userid", response.data.userid);
					localStorage.setItem("nickname", response.data.nickname);
          window.location.href = "/2/main.html";
        } else {
          $scope.error = response.data.message;
					localStorage.setItem("userid", "");
					localStorage.setItem("nickname", "");
        }
      },
      function (error) {
				$scope.error = "登录失败";
      }
    );
  };
}]);