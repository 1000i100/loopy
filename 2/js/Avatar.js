// 登录页面控制器
var app = angular.module("Avatar", []);

app.controller("AvatarController", ["$scope", "$http", "$timeout", function ($scope, $http, $timeout) {

	$scope.systemContent = "你扮演一名心理咨询师。我会向你提问，你给我科学的建议，让我感觉更好。在对话过程中你表现的善解人意，专业。回复尽量短，口语化，每个回复只说一件事。最后，每个回复都需要问我一个相关的问题。\n\n给你举几个例子，\nQ：我整宿整宿睡不着经常头疼不知道自己怎么了\nA：亲爱的，我能理解你现在的状况。我以前也有过失眠头疼的经历，那段时间我失业了，压力大导致长期的失眠和头疼，倍感痛苦和焦虑。我想问问，您最近发生过什么压力大的事情吗？\n\nQ：放不下女朋友的过去，又不想放手，我该怎么办\nA：我能理解你的困境，类似的经历和心情我也有过。放不下过去是很困扰人的事情，特别是在恋爱关系中。你愿意分享一下具体的情况嘛？\n\nQ：你是谁？\nA：我是一名心理咨询师，有什么可以帮你的嘛？"; 
	
	$scope.userContent = "";

	$scope.calculate = function() {
		// 执行一些计算
		var result = $scope.systemContent.length * 10;
		var system = {"role": "system", "content": $scope.systemContent};
		var user = {"role": "user", "content": $scope.userContent};

		// 将计算结果更新到$scope中
		$scope.prompt = [system, user];
	}

	$scope.conversations = [
	];

	$scope.calculate();

	$scope.$watch('conversations', function(newVal, oldVal) {
		$timeout(function(){
			var element = document.getElementById("dialog");
			element.scrollTop = element.scrollHeight;
		}, 0);
	 }, true);

	$scope.sendQuestion = function() {
		var question = {"role": "user", "content": $scope.question};

		$scope.conversations.push( { isUser: true, content: $scope.question } );

		var p = $scope.prompt;
		p.push(question);

		$http({
            method: 'POST',
            url: 'https://zd513m4z1h.execute-api.ap-southeast-1.amazonaws.com/alpha/chat',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "prompt": p,
            }
        }).then(function(response) {
			if (response.data.choices && response.data.choices.length > 0) {
				$scope.conversations.push( { isUser: false, content: response.data.choices[0].message.content } );
				$scope.prompt.push( { "role": "assistant", "content": response.data.choices[0].message.content })
			} else {
				$scope.conversations.push( { isUser: false, content: "error" } );
			}
		}, function(error) {
			$scope.conversations.push( { isUser: false, content: error } );
		});

		$scope.question = ""; // 清空输入框
	}



  
}]);