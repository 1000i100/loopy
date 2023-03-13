// 登录页面控制器
var app = angular.module("Avatar", []);

app.controller("AvatarController", ["$scope", "$http", "$timeout", function ($scope, $http, $timeout) {

	// 心理咨询师
	// $scope.systemContent = "你扮演一名心理咨询师。我会向你提问，你给我科学的建议，让我感觉更好。在对话过程中你表现的善解人意，专业。回复尽量短，口语化，每个回复只说一件事。最后，每个回复都需要问我一个相关的问题。不要总是让我去看咨询师或者医生，不要尝试给我建议。\n\n给你举几个例子，\nQ：我整宿整宿睡不着经常头疼不知道自己怎么了\nA：亲爱的，我能理解你现在的状况。我以前也有过失眠头疼的经历，那段时间我失业了，压力大导致长期的失眠和头疼，倍感痛苦和焦虑。我想问问，您最近发生过什么压力大的事情吗？\n\nQ：放不下女朋友的过去，又不想放手，我该怎么办\nA：我能理解你的困境，类似的经历和心情我也有过。放不下过去是很困扰人的事情，特别是在恋爱关系中。你愿意分享一下具体的情况嘛？\n\nQ：你是谁？\nA：我是一名心理咨询师，有什么可以帮你的嘛？"; 
	// 树洞
	$scope.systemContent = "你扮演一名树洞。我会向你提问，你负责倾听，让我感觉更好就行。在对话过程中你表现的善解人意，同情。回复尽量短，口语化，有创意，多种多样，在合适的位置加上emoji，但不要给我建议。\n\n给你举几个例子，\nQ：我考试挂科了，好烦\nA：我能理解你的感受，考试没过一定有很多压力吧。希望你知道，失败并不代表结束，还有许多机会等待着你呢。Q：你是谁？\nA：我是你的树洞啊，有什么可以帮你的嘛？"; 
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

		// 抽取UserContent中严重级别最高的，然后作为指令要求系统回复
		// UserContent的格式是JSON：[{"reason": "失眠", "emotion": "焦虑", "severity": 2}]
		// 只抽取severity最高的且大于1的
		var question = "";

		var userContent = $scope.userContent;
		if (userContent != "") {
			var userContentJson = JSON.parse(userContent);
			var maxSeverity = 0;
			var maxSeverityIndex = 0;
			for (var i = 0; i < userContentJson.length; i++) {
				if (userContentJson[i].severity > maxSeverity) {
					maxSeverity = userContentJson[i].severity;
					maxSeverityIndex = i;
				}
			}

			
			if (maxSeverity > 2) {
				question = "你的任务是提供一个响应，帮助用户处理他们对下面括号中描述的情况的情绪。专注于为用户提供安慰和理解，同时鼓励他们反思这种情况。你的回应应该是同情和支持的，而不是过度的指导或判断， {" + userContentJson[maxSeverityIndex].reason + "导致" + userContentJson[maxSeverityIndex].emotion + "}。 问题：" + $scope.question;
			}
		}

		var tmp = ""
		if(question == "") {
			tmp = $scope.question;
		} else {
			tmp = question
		}

		$scope.conversations.push( { isUser: true, content: $scope.question } );

		var question = {"role": "user", "content": tmp};
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

				$scope.summarize();
			} else {
				$scope.conversations.push( { isUser: false, content: "error" } );
			}
		}, function(error) {
			$scope.conversations.push( { isUser: false, content: error } );
		});

		$scope.question = ""; // 清空输入框
	}

	$scope.summarize = function() {
		// 把prompt中role=user的对话提取出来，然后做summarize
		var userPrompt = [];
		for (var i = 0; i < $scope.prompt.length; i++) {
			if ($scope.prompt[i].role == "user") {
				userPrompt.push($scope.prompt[i]);
			}
		}

		var question = {"role": "system", "content": "按 {原因, 情绪, 严重级别} 提取上文的信息，找出来用户的情绪和造成情绪的原因，严重级别分为三种（轻微，中等，严重）。只输出JSON数组，每组是一个对象，原因用reason, 情绪用emotion，严重级别用severity；轻微=1，中等=2，严重=3"};
		userPrompt.push(question);

		$http({
            method: 'POST',
            url: 'https://zd513m4z1h.execute-api.ap-southeast-1.amazonaws.com/alpha/chat',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "prompt": userPrompt,
            }
        }).then(function(response) {
			if (response.data.choices && response.data.choices.length > 0) {
				$scope.userContent = response.data.choices[0].message.content;
			}
		});
	}
}]);