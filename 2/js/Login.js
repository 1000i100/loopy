// 登录页面控制器
var app = angular.module("LoginApp", []);
app.controller("LoginController", ["$scope", "$http", function ($scope, $http) {

  $scope.login = function () {
    var data = {
      username: $scope.username,
			// if password is undefined, it will be set to empty string
			password: $scope.password || "",
    };

		// https://api.yyds-ai.com
		// https://06acc315-0f75-44e5-9c43-7b77beab5d08-8080-public.ide.workbenchapi.com

		$.ajax({
			type: "POST",
			url: "http://api.yyds-ai.com/login",
			data: JSON.stringify(data),
			contentType: "application/json; charset=utf-8",
			dataType: "json",
			headers: {
				"connection": "keep-alive",
        "keep-alive": "timeout=60, max=100",
    	},
			success: function (response) {
				if (response.userid) {
          			localStorage.setItem("userid", response.userid);
					localStorage.setItem("nickname", response.nickname);
          			window.location.href = "index.html";
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
  };
}]);