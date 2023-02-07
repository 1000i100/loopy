// 登录页面控制器
var app = angular.module("LoginApp", []);
app.controller("LoginController", ["$scope", "$http", function ($scope, $http) {

  $scope.login = function () {
    var data = {
      username: $scope.username,
			// if password is undefined, it will be set to empty string
			password: $scope.password || "",
    };

		// https://api-daily.yesbetec.com
		// https://06acc315-0f75-44e5-9c43-7b77beab5d08-8080-public.ide.workbenchapi.com

		$.ajax({
			type: "POST",
			url: "http://api-daily.yesbetec.com/login",
			data: JSON.stringify(data),
			contentType: "application/json; charset=utf-8",
			dataType: "json",
			success: function (response) {
				if (response.userid) {
          localStorage.setItem("userid", response.userid);
					localStorage.setItem("nickname", response.nickname);
          window.location.href = "main.html";
        } else {
          $scope.error = response.message;
					localStorage.setItem("userid", "");
					localStorage.setItem("nickname", "");
        }
			},
			failure: function (error) {
				$scope.error = "登录失败";
			}
		});
		

		/*
    $http.post('https://api-daily.yesbetec.com/login', data).then(
      function (response) {
        if (response.data.userid) {
          localStorage.setItem("userid", response.data.userid);
					localStorage.setItem("nickname", response.data.nickname);
          window.location.href = "main.html";
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
		*/
  };
}]);