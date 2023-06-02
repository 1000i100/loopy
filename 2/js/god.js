
class PromptTemplate {
  constructor(inputVariables, template) {
    this.inputVariables = inputVariables;
    this.template = template;
  }

  format(values) {
    let formattedTemplate = this.template;
    for (const variable of this.inputVariables) {
      formattedTemplate = formattedTemplate.replace(`{${variable}}`, values[variable]);
    }
    return formattedTemplate;
  }
}

class Command {
  constructor(openAIChat, name) {
		this.openAIChat = openAIChat;
		this.name = name;
  }

  execute(thought, reason, criticism, speaker, history) {
    throw new Error("Abstract method 'execute' must be implemented in derived classes.");
  }

	handleResponse(res, addLine) {
		addLine(res.data.choices[0].message.content)
	}

  execute_general(history, instruct) {
    return new Promise((resolve, reject) => {
      console.log(instruct);

      let prompt = [] // history.slice(0, -1);
      prompt.push({ role: "user", content: instruct });

      this.openAIChat.chat(prompt, (res) => {
        if (!res.data.choices || res.data.choices.length == 0) {
          reject(res);
        } else {
          resolve(res);
        }
      }, (err) => {
        console.error(err) // 打印错误信息，例如{errMsg: 'request:fail'}
        reject(err);
      });
    });
  }
}

class NLGCommand extends Command {
  static template = `客户的问题：{question}
---------------------------
指令：{task}
---------------------------
参考内容：{reference}
---------------------------
请严格按照指令的要求回答，不回复额外的内容。
回答：`;

	constructor(openAIChat) {
		super(openAIChat, "按活动的目标生成回答");
	}

  execute(question, activity, dependencies) {
    const instruct = new PromptTemplate(["question", "task", "reference"], NLGCommand.template);
		let reference = dependencies.map(item => activity.data[item]).join('');

    return this.execute_general(history, 
			instruct.format({ question: question, task: activity.task, reference: reference }));
  }
}

class SearchCommand extends Command {
	constructor(openAIChat) {
		super(openAIChat, "从互联网搜索相关信息");
	}

  execute(question, activity, dependencies) {
    return new Promise((resolve, reject) => {
      console.log(question);
			
			// call Lambda function to retrieve reference content 
      this.openAIChat.search(question, (res) => {
        if (!res.data.choices || res.data.choices.length == 0) {
          reject(res);
        } else {
          resolve(res);
        }
      }, (err) => {
        console.error(err) // 打印错误信息，例如{errMsg: 'request:fail'}
        reject(err);
      });
    });
  }
}

class RetrieverCommand extends Command {
	constructor(openAIChat) {
		super(openAIChat, "检索相关内容");
	}

  execute(question, activity, dependencies) {
    return new Promise((resolve, reject) => {
      console.log(question);
			
			// call Lambda function to retrieve reference content 
      this.openAIChat.retrieve(question, "rich_all", (res) => {
        if (!res.data.choices || res.data.choices.length == 0) {
          reject(res);
        } else {
          resolve(res);
        }
      }, (err) => {
        console.error(err) // 打印错误信息，例如{errMsg: 'request:fail'}
        reject(err);
      });
    });
  }

	handleResponse(res, addLine) {
		let jsonObject = JSON.parse(res.data.choices[0].message.content);
		for (const examples of jsonObject) {
			const content = "相关性：" + examples.score + "\n" + examples.content;
			addLine(content);
		}
	}
}

class CompressorCommand extends Command {
  static template = `客户的问题：\n{question}
---------------------------\n\n
参考内容：\n{reference}
---------------------------\n\n
指令：从参考内容中挑选出和客户的问题直接相关的句子，并把它们汇总给出摘要`;

	constructor(openAIChat) {
		super(openAIChat, "根据客户的问题和活动的目标来筛选参考内容");
	}

  execute(question, activity, dependencies) {
    const instruct = new PromptTemplate(["question", "task", "reference"], CompressorCommand.template);
		let reference = dependencies.map(item => activity.data[item]).join('');

    return this.execute_general(history, 
			instruct.format({ question: question, task: activity.task, reference: reference }));
  }
}


var app = angular.module('myApp', []);
app.controller('myCtrl', ["$scope", "$http", function ($scope, $http) {
	const openAIChat = new OpenAIChat($http);

  // 初始化活动数组，并添加一个默认活动
  $scope.activities = [
    {
      name: '活动-根因识别',
      task: '识别导致客户问题的原因',
			commands: {
				// 'Retriever': new RetrieverCommand(openAIChat),
				'Search': new SearchCommand(openAIChat),
				'NLG': new NLGCommand(openAIChat),
				'Compressor': new CompressorCommand(openAIChat)
			},
			dependencies: {
				'Search': [],
				'Compressor': ['Search	'],
				'NLG': ['Compressor']
			},
			data: {
			},
    }
  ];
    
	// 选中的活动初始化为空,
  $scope.selectedActivity = {};

	// 管道初始化为空
	$scope.pipeline = {};
	$scope.response = [];

	$scope.addLine = function(text, color='black', size=10, weight='normal') {
		$scope.response.push({text: text, color: color, size: size, weight: weight});
	};
    
  // 添加新的活动
  $scope.addActivity = function() {
    $scope.activities.push({
      name: '新的活动',
      task: '',
			commands: []
    });
  };
    
  // 选择活动
  $scope.selectActivity = function(index) {
    $scope.selectedActivity = $scope.activities[index];
		$('#configModal').modal('show');
  };

	$scope.execute = function() {
		console.log($scope.question)
		$scope.response = [];
	
		$scope.activities.reduce(function(promise, activity) {
			return promise.then(function() {
				return $scope.executeActivity(activity, $scope.question);
			});
		}, Promise.resolve());
	};

	$scope.executeActivity = async function(activity, question) {
		$scope.addLine('正在执行活动 ---- ' + activity.name + ': ' + activity.task, 'green', 12, 'bold');

		// $TODO: 这里通过thought来决定怎么执行Command
		$scope.addLine('命令执行策略：顺序执行已配置的命令', 'blue', 12, 'bold');

		let executed = {};
    for (let step in activity.commands) {
      if (!executed[step]) {
        for (let dependency of activity.dependencies[step]) {
          if (!executed[dependency]) {
            executed[dependency] = true;
            await $scope.executeCommand(dependency, activity.commands[dependency], activity, $scope.question);
          }
        }
        executed[step] = true;
        await $scope.executeCommand(step, activity.commands[step], activity, $scope.question);
      }
    }
	};

	$scope.executeCommand = function(name, command, activity, question) {
		return new Promise(function(resolve, reject) {
			$scope.addLine('正在执行命令 ---- ' + command.name, 'green', 12, 'bold');
			
			command.execute(question, activity, activity.dependencies[name]).then((res) => {
				console.log(res);

				$scope.addLine('返回值：', 'blue', 12, 'bold');
				command.handleResponse(res, $scope.addLine);
				$scope.$apply();

				activity.data[name] = res.data.choices[0].message.content;

				resolve();  // Resolve the promise
			}).catch((err) => {
				console.error(err);
				reject(err);  // Reject the promise
			});
		});
	};	
}]);
