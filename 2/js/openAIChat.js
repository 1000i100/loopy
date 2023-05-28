class OpenAIChat {
  constructor($http) {
		this.$http = $http
	}

  async embedding(text, successCallback, errorCallback) {
    try {

			const asyncResponse = await new Promise((resolve, reject) => {
				this.$http({
					url: 'https://zd513m4z1h.execute-api.ap-southeast-1.amazonaws.com/alpha/embedding',
					timeout: 60000,
					method: 'POST',
					data: { text: text },
					header: {
						'content-type': 'application/json',
					}
				}).then(function(res) {
					resolve(res)
				}, function(err) {
					reject(err)
				})
			})

      successCallback(asyncResponse);
    } catch (error) {
      errorCallback(error);
    }
  }

	async retrieve(question, document, successCallback, errorCallback) {
    try {

			const asyncResponse = await new Promise((resolve, reject) => {
				this.$http({
					url: 'https://zd513m4z1h.execute-api.ap-southeast-1.amazonaws.com/alpha/retriever',
					timeout: 60000,
					method: 'POST',
					data: { query: question, document: document },
					header: {
						'content-type': 'application/json',
					}
				}).then(function(res) {
					resolve(res)
				}, function(err) {
					reject(err)
				})
			})

      successCallback(asyncResponse);
    } catch (error) {
      errorCallback(error);
    }
  }

	async search(question, successCallback, errorCallback) {
    try {

			const asyncResponse = await new Promise((resolve, reject) => {
				this.$http({
					url: 'https://zd513m4z1h.execute-api.ap-southeast-1.amazonaws.com/alpha/bing-search',
					timeout: 60000,
					method: 'POST',
					data: { query: question },
					header: {
						'content-type': 'application/json',
					}
				}).then(function(res) {
					resolve(res)
				}, function(err) {
					reject(err)
				})
			})

      successCallback(asyncResponse);
    } catch (error) {
      errorCallback(error);
    }
  }

  async chat(prompt, successCallback, errorCallback) {
    try {
      const asyncResponse = await this.chatAsync(prompt);
      const data = asyncResponse['data']
      const messageId = data.message_id
    
      const completionResponse = await this.chatCompletion(messageId);
      successCallback(completionResponse);
    } catch (error) {
      errorCallback(error);
    }
  }

  async chatAsync(prompt) {
    return new Promise((resolve, reject) => {
      this.$http({
        url: 'https://zd513m4z1h.execute-api.ap-southeast-1.amazonaws.com/alpha/chat_async',
        timeout: 60000,
        method: 'POST',
        data: { prompt: prompt },
        header: {
          'content-type': 'application/json',
        }
			}).then(function(res) {
				resolve(res)
			}, function(err) {
				reject(err)
			})
		})
  }

  async chatCompletion(messageId, elapsedTime = 0) {
    return new Promise(async (resolve, reject) => {
      try {
        const timeOut = 180000; // 更新为180000毫秒，即3分钟
        const response = await this._callChatCompletionAPI(messageId);
  
        if (response.data.statusCode === 404 && elapsedTime < timeOut) {
          setTimeout(async () => {
            try {
              const newElapsedTime = elapsedTime + 5000;
              const newResponse = await this.chatCompletion(messageId, newElapsedTime);
              resolve(newResponse);
            } catch (error) {
              reject(error);
            }
          }, 5000);
        } else if (response.data.statusCode === 404 && elapsedTime >= timeOut) {
          reject('已达到3分钟超时');
        } else {
          resolve(response);
        }
      } catch (error) {
        reject(error);
      }
    });
  }
  

  async _callChatCompletionAPI(messageId) {
    return new Promise((resolve, reject) => {
      this.$http({
        url: `https://zd513m4z1h.execute-api.ap-southeast-1.amazonaws.com/alpha/chat_completion`,
        timeout: 60000,
        method: 'POST',
        data: {
          messageId: messageId
        },
        header: {
          'content-type': 'application/json',
        }
			}).then(function(res) {
          resolve(res);
			}, function(err) {
				reject(err);
			});
    });
  }
}
