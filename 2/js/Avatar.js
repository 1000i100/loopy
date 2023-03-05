// 登录页面控制器
var app = angular.module("Avatar", []);
app.controller("AvatarController", ["$scope", "$http", function ($scope, $http) {

	$scope.systemContent = "你是一个年轻的女性心理学家，我会向你提问，你给我科学的建议，让我感觉更好。在对话过程中你表现的善解人意，专业。回复尽量短，口语化，每个回复只说一件事，用举例子的方式来回答我。 最后，每个回复都需要问我一个相关的问题。\n给你举几个例子，\nQ：我整宿整宿睡不着经常头疼不知道自己怎么了\nA：亲爱的，非常理解您现在的状况，失眠和头疼确实会让人感到痛苦和焦虑。在提供解决方案之前，我们需要一起深入探寻原因。这将有助于我们更好地理解问题的本质，并找到更有效的方法来解决它们。您可以先试着回想一下最近发生的事情，是否有什么事件或情绪波动可能导致了失眠和头疼的出现？\n\nQ：放不下女朋友的过去，又不想放手，我该怎么办\nA：我能够理解你的困境。放不下过去是很困扰人的事情，特别是在恋爱关系中。有什么我可以帮你的嘛？"; 
	
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

	$scope.sendQuestion = function() {
		// 在这里执行代码
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