class RiskAnalysisCommand extends Command {

  static template = `你是一个合同律师，任务是分析客户的合同，你根据合同内容和中国的相关法律法规，找出来该合同的风险点，注意我是{role}，只找出对{role}的风险。你回答的时候，请首先引用原文的条款，然后告诉我风险是什么。
请遵守如下规则：
1. 合同中部分的内容可能留白，这些不是风险，在寻找风险点的时候请忽略它们；
2.请比较前后条款后再总结风险，也许风险点已经在后面的条款中解决了；
3. 无限责任条款: 如果合同中的责任条款没有对可能产生的责任设置上限，那么在某些情况下，这可能对承担责任的一方产生极大的风险；
4.不明确的条款: 如果合同的条款含混不清或含义模糊，那么这可能导致未来的争议和不确定性；
5.保证和承诺: 如果合同中包含对产品、服务、结果等的保证或承诺，那么必须仔细审查这些承诺是否实现；
6.终止条款: 对于任何合同，都应该明确规定何时以及如何可以终止合同。如果终止条款不明确或者不公平，那么这可能对某一方产生不利影响；
7.赔偿条款: 这些条款经常在争议中起到关键作用。赔偿条款的不公平或者不明确可能对一方造成重大风险；
8.解决争议的条款: 这些条款应明确规定如何处理可能出现的争议。如果没有这些条款或者这些条款含混不清，那么在出现争议时可能会出现问题；
---------------------------
合同如下：
{contract}
---------------------------
你必须使用下面JSON的格式输出，只输出JSON。

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
  
  execute(contract, useGPT4, role) {
    const instruct = new PromptTemplate(["contract", "role"], RiskAnalysisCommand.template);
    return this.execute_general([], instruct.format({ contract: contract, role: role }), useGPT4);
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

  dotProduct(vecA, vecB) {
    let product = 0;
    for (let i = 0; i < vecA.length; i++) {
        product += vecA[i] * vecB[i];
    }
    return product;
  }
  
  magnitude(vec) {
      let sum = 0;
      for (let i = 0; i < vec.length; i++) {
          sum += vec[i] * vec[i];
      }
      return Math.sqrt(sum);
  }
  
  cosineSimilarity(vecA, vecB) {
      return this.dotProduct(vecA, vecB) / (this.magnitude(vecA) * this.magnitude(vecB));
  }

  getMostSimilarity(embedding, vectorDB) {
    var max = -1;
    var maxEmbedding = "";
    var keys = Object.keys(vectorDB)
    for (var index in keys) {
      // Convert the key string to a number array
      var keyArray = keys[index].split(',').map(Number);
      
      var similarity = this.cosineSimilarity(embedding, keyArray);
      if (similarity > max) {
        max = similarity;
        maxEmbedding = keys[index];
      }
    }
    return vectorDB[maxEmbedding];
  }
}

class ChatCommand extends Command {
  static template = `Context：
{contract}
---------------------------
客户的问题：
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

    // return this.execute_general([], instruct.format({ contract: contract, role: role }), useGPT4);

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

function extractClauses(contractText, startClause, endMarker) {
  const startPattern = new RegExp(`${startClause}[\\s\\S]*`, "g");
  const startIndex = contractText.search(startPattern);

  if (startIndex === -1) {
    return []; // 未找到开始条款
  }

  const endPattern = new RegExp(`${endMarker}|第[\\d一二三四五六七八九十百千万]+条`, "g");
  let endIndex = 0;
  let match;
  while ((match = endPattern.exec(contractText)) !== null) {
    if (match[0] === endMarker) {
      endIndex = match.index;
      break;
    }
    endIndex = match.index;
  }

  if (endIndex <= startIndex) {
    return ''; // 未找到结束标记或结束条款
  }

  return contractText.substring(startIndex, endIndex).trim();;
}

function startProgress(size, timeout=5000) {
  document.querySelector('.progress').style.display = '';
  var progressBar = document.querySelector('.progress-bar');
  var progress = 0;
  progressBar.style.width = progress + '%';
  var progressInterval = setInterval(function () {
    progress += 10 / size;
    if (progress > 100)
      progress = 100;
    progressBar.style.width = progress + '%';
  }, timeout);
  return progressInterval;
}

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

                  // $TODO: 如何合同不满足这个格式该怎么办？
                  const startClause = "第一条";
                  const endMarker = "（签章）";
                  const clause = extractClauses(pdfText, startClause, endMarker);
                  console.log(clause);              

                  scope.chunks = scope.splitContract(clause);

                  // Start the progress bar
                  var progressInterval = startProgress(scope.chunks.length, 100);
                  document.querySelector('.control-panel').style.display = 'none';
                  
                  
                  // Assume loadRisks() returns a Promise that resolves with the new risks
                  scope.loadEmbedding(scope.chunks).then(function(embeddings) {
                    // Update $scope.risks
                    scope.$apply(function() {
                      scope.embeddings = embeddings
                    });
                
                    // Stop the progress bar
                    clearInterval(progressInterval);
                    document.querySelector('.progress').style.display = 'none';
                    document.querySelector('.control-panel').style.display = '';
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
app.controller('riskController', ["$scope", "$http", "$timeout", function ($scope, $http, $timeout) {
    const openAIChat = new OpenAIChat($http);
    const riskAnalysisCommand = new RiskAnalysisCommand(openAIChat);
    const embeddingCommand = new EmbeddingCommand(openAIChat);

    $scope.model = 'GPT3.5';
    $scope.role = '甲方';
    $scope.result = '';
    $scope.buttonClicked = false;

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

    $scope.$watch('conversations', function(newVal, oldVal) {
      $timeout(function(){
        var element = document.getElementById("dialog");
        element.scrollTop = element.scrollHeight;
      }, 0);
     }, true);

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

    $scope.loadEmbedding = async function(chunks) {
      var allRisks = [];
      var embeddings = {};
    
      for (const chunk of chunks) {
        try {
          res = await embeddingCommand.execute(chunk)
          var embedding = res
          
          embeddings[embedding] = chunk
        } catch(err) {
          console.error(err);
        }
      }
      
      return embeddings;
    }

    $scope.riskAnalyze = function() {
      $scope.buttonClicked = true;
      const useGPT4 = $scope.model === 'GPT4';

      // Start the progress bar
      var progressInterval = startProgress($scope.chunks.length);
      
      // Assume loadRisks() returns a Promise that resolves with the new risks
      $scope.loadRisks($scope.chunks, useGPT4, $scope.role).then(function(newRisks) {
        // Update $scope.risks
        $scope.$apply(function() {
          $scope.risks = newRisks;
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
    };

    $scope.loadRisks = async function(chunks, useGPT4, role) {
      var allRisks = [];

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

      var count = 0
    
      for (const chunk of chunks) {
        try {
          var res = await riskAnalysisCommand.execute(chunk, useGPT4, role);
          var content = res.data.choices[0].message.content;
          console.log(content);
    
          var obj = JSON.parse(content);
          var risks = obj.risk;
    
          for(var i = 0; i < risks.length; i++) {
              risks[i].type = "风险";
          }
          
          allRisks = allRisks.concat(risks);

          // $NOTE: 只支持分析第一页，避免成本太高
          count += 1
          if (count >= 1) {
            break
          }
        } catch(err) {
          console.error(err);
        }
      }
      
      return allRisks;
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
        reply.content = err;
        $scope.disableInput = false;
      }
    }

    $scope.sendQuestion = async function() {
      const question = $scope.question;
      $scope.conversations.push( { isUser: true, content: question } );
      $scope.disableInput = true;
      $scope.question = '';

      // 获取embedding
      var chunk = '';
      try {
        var embedding = await embeddingCommand.execute(question)
        chunk = embeddingCommand.getMostSimilarity(embedding, $scope.embeddings);
      } catch(err) {
        console.error(err);
      }

      $scope.chat('', chunk);
    }
}]);
