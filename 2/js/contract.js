class RiskAnalysisCommand extends Command {
  static template = `你是一个合同的审核员，我会给你一份合同。你根据合同内容和中国的相关法律法规，帮我找出来该合同的风险点，注意我是甲方，只找出对甲方的风险。你回答的时候，请首先引用原文的条款，然后告诉我风险是什么。请注意，合同中部分的内容可能留白，这些不是风险，再寻找风险点的时候请忽略它们，以后会填的。客户的问题：{question}
---------------------------
合同如下：
{contract}
---------------------------
你必须使用下面JSON的格式输出。

输出格式:
{
    "risk": [
       {
           "text": "合同中有风险的段落的前10个字符，严格遵守原始文字",
           "suggestion": "风险的描述以及建议"
       }
    ]
}

确保输出可以被 Python json.loads 正确解析。`;
  
  constructor(openAIChat) {
    super(openAIChat, "风险分析");
  }
  
  execute(contract) {
    const instruct = new PromptTemplate(["contract"], RiskAnalysisCommand.template);
    return this.execute_general([], instruct.format({ contract: contract }));
  }
}

class EmbeddingCommand extends Command {  
  constructor(openAIChat) {
    super(openAIChat, "获取Embedding");
  }
  
  execute(text) {
    return new Promise((resolve, reject) => {
      this.openAIChat.embedding(text, (res) => {
        
        // if res.data 是 []
        if (Array.isArray(res.data)) {
          resolve(res.data);
        } else {
          reject(res)
        }
      }, (err) => {
        console.error(err) // 打印错误信息，例如{errMsg: 'request:fail'}
        reject(err);
      });
    });
  }
}

class ChatCommand extends Command {
  static template = `合同片段如下：
{contract}
---------------------------
参考上面的合同片段，回答客户的问题：
{question}`;

  constructor(openAIChat) {
    super(openAIChat, "风险分析");
  }
  
  execute(prompt, chunk) {
    var systemContent = "你是一个中国顶尖律所的律师，帮助用户审核合同内容，解读条款，识别条款的风险。回答要简洁易懂，让初中生能听明白。"; 
    var system = {"role": "system", "content": systemContent};

    // prompt是一个[]， 在prompt头部加上一个item
    prompt.unshift(system);

    // $TODO: update the content property of last prompt if chunk has text input
    if (chunk) {
      const instruct = new PromptTemplate(["contract", 'question'], ChatCommand.template);
      const question = prompt[prompt.length - 1].content;
      prompt[prompt.length - 1].content = instruct.format({ contract: chunk, question: question });

      console.log(prompt[prompt.length - 1].content);
    }

    return new Promise((resolve, reject) => {
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


// 在你的页面中
window.addEventListener('message', function(event) {
  var selectedText = event.data;
  // document.getElementById('selected-text').textContent = selectedText;

  // Get the current scope
  var scope = angular.element(document.getElementById('riskController')).scope();

  // 调用scope的方法addSuggestion
  scope.$apply(function() {
    scope.addSuggestion(selectedText);
  });
});


var dropZone = document.getElementById('drop-zone');

dropZone.addEventListener('dragover', function(e) {
  e.stopPropagation();
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  this.classList.add('dragover');
});

dropZone.addEventListener('dragleave', function(e) {
    this.classList.remove('dragover');
});

dropZone.addEventListener('drop', function(e) {
  e.stopPropagation();
  e.preventDefault();
  this.classList.remove('dragover');
  var file = e.dataTransfer.files[0];
  if(file.type == "application/pdf") {
      var fileReader = new FileReader();            
      fileReader.onload = function() {
          var blob = new Blob([this.result], {type: 'application/pdf'});
          var url = URL.createObjectURL(blob);
          var viewerUrl = 'pdf.js/web/viewer.html?file=' + encodeURIComponent(url);
          document.getElementById('pdf-viewer').src = viewerUrl;

          dropZone.style.display = 'none'; // Hide the drop zone


          // Get the current scope
          var scope = angular.element(document.getElementById('riskController')).scope();

          // Load the PDF file
          var loadingTask = pdfjsLib.getDocument(url);
          loadingTask.promise.then(function(pdf) {
              var maxPages = pdf.numPages;
              var countPromises = []; // collecting all page promises
              for (var j = 1; j <= maxPages; j++) {
                  var page = pdf.getPage(j);
                  var txt = "";
                  countPromises.push(page.then(function(page) { // add page promise
                      var textContent = page.getTextContent();
                      return textContent.then(function(text) { // return content promise
                        var items = text.items;
                        return items.reduce(function(acc, item, idx) {
                            // 如果是第一个元素，直接返回内容
                            if (idx === 0) {
                                return item.str;
                            }
                            // 获取 acc 的最后一个字符
                            var lastChar = acc.slice(-1);
                            // 如果最后一个字符不是'。', '：' 或者'：', 使用 '' 连接，否则根据 hasEOL 来决定
                            var delimiter = ['。', '：', '；'].includes(lastChar) ? (item.hasEOL ? '\n\n' : '') : '';
                            return acc + delimiter + item.str;
                        }, '');
                      });
                  }));
              }

              // Wait for all pages and join text
              Promise.all(countPromises).then(function(texts) {
                  var pdfText = texts.join('');

                  var chunks = scope.splitContract(pdfText);
                  const size = chunks.length;

                  // Start the progress bar
                  var progressBar = document.querySelector('.progress-bar');
                  var progress = 0;
                  progressBar.style.width = progress + '%';
                  var progressInterval = setInterval(function() {
                      progress += 10 / size;
                      if (progress > 100) progress = 100;
                      progressBar.style.width = progress + '%';
                  }, 5000);

                  // Assume loadRisks() returns a Promise that resolves with the new risks
                  scope.loadRisks(chunks).then(function([newRisks, embeddings]) {
                      // Update $scope.risks
                      scope.$apply(function() {
                          scope.risks = newRisks;
                          scope.embeddings = embeddings
                      });

                      // Stop the progress bar
                      clearInterval(progressInterval);
                      document.querySelector('.progress').style.display = 'none';
                  }).catch(function(err) {
                      console.error(err);
                      clearInterval(progressInterval);

                      // 把progress-text控件的文字改成错误信息
                      document.querySelector('#progress-text').textContent = err;
                  });
              });
          });
      };
      fileReader.readAsArrayBuffer(file);
  } else {
      alert("File type is not PDF");
  }
});


var app = angular.module('myApp', []);
app.controller('riskController', ["$scope", "$http", function ($scope, $http) {
    const openAIChat = new OpenAIChat($http);
    const riskAnalysisCommand = new RiskAnalysisCommand(openAIChat);
    const embeddingCommand = new EmbeddingCommand(openAIChat);

    $scope.question = "";
    $scope.disableInput = false;
    $scope.risks = [];
    $scope.embeddings = {}
    $scope.conversations = [
        {
            content: "你好,有什么可以帮助您的？请可以在左侧用鼠标选择感兴趣的条款，划词提问，或者直接输入问题。",
            isUser: false
        }
    ];

    $scope.locateInPDFView = function(risk) {
        // 获取iframe元素
        var iframe = document.getElementById('pdf-viewer');

        // 创建一个JSON对象
        var message = {
            query: risk.text,
            type: "locate"
        };

        // 向iframe发送消息
        iframe.contentWindow.postMessage(message, '*');
    };

    $scope.splitChunk = function(text, maxSize, delimiter='\n\n') {
      var parts = text.split(delimiter);
      var chunks = [];
      var currentChunk = '';
  
      for (var i = 0; i < parts.length; i++) {
          // 如果添加这个部分会使当前块的大小超过 maxSize，那么创建一个新的块
          if (currentChunk.length + parts[i].length > maxSize) {
              chunks.push(currentChunk);
              currentChunk = parts[i];
          } else {
              // 否则，将这个部分添加到当前块
              if (currentChunk.length > 0) {
                  // 如果当前块不是空的，那么添加一个分隔符
                  currentChunk += delimiter;
              }
              currentChunk += parts[i];
          }
      }
  
      // 将最后一个块添加到 chunks
      if (currentChunk.length > 0) {
          chunks.push(currentChunk);
      }
  
      return chunks;
    }

    $scope.splitContract = function(contract) {
      var maxSize = 1500;
      return $scope.splitChunk(contract, maxSize);
    }

    $scope.loadRisks = async function(chunks) {
      var allRisks = [];
      var embeddings = {};

      /*
      return [
        {type: '风险', text: '甲方保证所出示及提供的与车辆有关的一切证件、证明及信息合法、真实、有效', suggestion: '这一条款明确要求甲方确保所有提供的车辆信息、证件和证明都是合法'},
        {type: '风险', text: '甲方为法人的或通过法人机构委托销售、拍卖的，应按照附件一提供二手车技术状况表，作为合同的一部分', suggestion: '这一条款要求甲方提供一份详细的二手车技术状况表，并向乙方提供一个质保期。'},
        {type: '风险', text: '甲方为法人的或通过法人机构委托销售、拍卖的，应按照附件一提供二手车技术状况表，作为合同的一部分', suggestion: '这一条款要求甲方提供一份详细的二手车技术状况表，并向乙方提供一个质保期。'},
        {type: '风险', text: '甲方为法人的或通过法人机构委托销售、拍卖的，应按照附件一提供二手车技术状况表，作为合同的一部分', suggestion: '这一条款要求甲方提供一份详细的二手车技术状况表，并向乙方提供一个质保期。'},
        {type: '风险', text: '甲方为法人的或通过法人机构委托销售、拍卖的，应按照附件一提供二手车技术状况表，作为合同的一部分', suggestion: '这一条款要求甲方提供一份详细的二手车技术状况表，并向乙方提供一个质保期。'},
        {type: '风险', text: '甲方为法人的或通过法人机构委托销售、拍卖的，应按照附件一提供二手车技术状况表，作为合同的一部分', suggestion: '这一条款要求甲方提供一份详细的二手车技术状况表，并向乙方提供一个质保期。'},
      ];
      */
    
      for (const chunk of chunks) {
        try {
          // $STEP ONE: Analyze the risk of the chunk
          var res = await riskAnalysisCommand.execute(chunk);
          var content = res.data.choices[0].message.content;
          console.log(content);
    
          var obj = JSON.parse(content);
          var risks = obj.risk;
    
          for(var i = 0; i < risks.length; i++) {
              risks[i].type = "风险";
          }
          
          allRisks = allRisks.concat(risks);

          // $STEP TWO: Generate embedding for the chunk
          res = await embeddingCommand.execute(chunk)
          var embedding = res
          
          embeddings[embedding] = chunk

        } catch(err) {
          console.error(err);
        }
      }
      
      return [allRisks, embeddings];
    }

    $scope.addSuggestion = function(text) {
      // 检查conversations是否为空，并且最后一个元素的类型是否为"suggestion"
      if ($scope.conversations.length > 0 && $scope.conversations[$scope.conversations.length - 1].type === "suggestion") {
        // 如果是，就更新它
        $scope.conversations[$scope.conversations.length - 1].content = text;
      } else {
        // 如果不是，就添加新的元素
        $scope.conversations.push({
          content: text,
          isUser: true,
          type: "suggestion"  // 添加类型属性
        });
      }
    };
    
    $scope.chat = async function(instruct, chunk) {
      try {
        var prompt = [];
        for (var i = 0; i < $scope.conversations.length; i++) {
          if (!$scope.conversations[i].isUser) {
            prompt.push( { "role": "assistant", "content": $scope.conversations[i].content } );
          } else if ($scope.conversations[i].isUser && $scope.conversations[i].type === "suggestion" && i === $scope.conversations.length - 1) {
            // 最后一个如果是suggestion, 增加一个prompt
            const message = $scope.conversations[i].content + "\n\n" + instruct;
            prompt.push( { "role": "user", "content": message } );
          } else {
            prompt.push( { "role": "user", "content": $scope.conversations[i].content } );
          }
        }

        // 加上一个“正在回复”的indicator
        const reply = { isUser: false, content: "正在回复..." };
        $scope.conversations.push( reply );
        $scope.disableInput = true;

        const chatCommand = new ChatCommand(openAIChat)
        const res = await chatCommand.execute(prompt, chunk);
        var content = res.data.choices[0].message.content;
        console.log(content);

        $scope.$apply(function() {
          reply.content = content;
          $scope.disableInput = false;
        });
      } catch(err) {
        console.error(err);
        $scope.disableInput = false;
      }
    }

    $scope.sendQuestion = async function() {
      $scope.conversations.push( { isUser: true, content: $scope.question } );
      $scope.disableInput = true;

      // 获取embedding
      var chunk = '';
      try {
        var embedding = await embeddingCommand.execute($scope.question)
        chunk = $scope.getMostSimilarity(embedding);

      } catch(err) {
        console.error(err);
      }

      $scope.question = '';
      $scope.chat('', chunk);
    }

    $scope.dotProduct = function(vecA, vecB) {
      let product = 0;
      for (let i = 0; i < vecA.length; i++) {
          product += vecA[i] * vecB[i];
      }
      return product;
    }
    
    $scope.magnitude = function(vec) {
        let sum = 0;
        for (let i = 0; i < vec.length; i++) {
            sum += vec[i] * vec[i];
        }
        return Math.sqrt(sum);
    }
    
    $scope.cosineSimilarity = function(vecA, vecB) {
        return $scope.dotProduct(vecA, vecB) / ($scope.magnitude(vecA) * $scope.magnitude(vecB));
    }

    $scope.getMostSimilarity = function(embedding) {
      var max = -1;
      var maxEmbedding = "";
      var keys = Object.keys($scope.embeddings)
      for (var index in keys) {
        // Convert the key string to a number array
        var keyArray = keys[index].split(',').map(Number);
        
        var similarity = $scope.cosineSimilarity(embedding, keyArray);
        if (similarity > max) {
          max = similarity;
          maxEmbedding = keys[index];
        }
      }
      return $scope.embeddings[maxEmbedding];
    }

}]);



