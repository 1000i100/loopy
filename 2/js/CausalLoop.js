// A list of CausalLoop object, support New, Delete, Edit, Save, Load, Import, Export, etc.
// Path: 2/js/Loopy.js

// write an angular service, which name is CLDService
angular.module('CLDService', [])
.factory('myService', ["$http", function($http) {
    var load = function() {
        return [
            new CausalLoop("test1", "房价和人口的关系", "7H2g9A1E/IrfPpsHRO5--fTzup_52_Q4L1z4iKvGVyeafymQGePZsgbBHeTVFjaFLsZfWLfL0fq73MgSLH1dKxjezafc6a6Z302RyqOcqv4i5pJtt1W1tIUIjrpwDwm5kYZMBCZuHX6Sep1T42nTEhfnW4Dd2WLOnmaBRe0hhwwPxjNHofQzZv_RscAjZuxHOGUVd5hJmLi9Z2tOlBbTBq4LrGs7y-EryfNlozuShMUI6G14sQFXJZYxQkePB6HDg_pVgc6OudO8qgSliTSZ0NSmH6KGJ2u6Agu8UH4Nwxe1XW6_TxDDmebUQhL76q5w7Q0PAZNBDMALq0k4XDuNv5ej0XX2KIRRZsCZt6cZozZk48UEFCAQk_bYen0rAR4awneeGU6luvJxJ78-3vIU8oDrYLxqfil-veOxJOgxIKAGJH4AHcY1fix5Fwa1jHS8kJYLemMzPLopv2xYu_6d1Kw.."),
            new CausalLoop("test2", "房价和人口的关系2", "CE4CMiAwK8vCcRx_CHAAA-AAHAAJNOERH4VQgAAAAAAAAAAAAHNvbWV0aGluZ2Bzb21ldGhpbmcgZWxzZWA-YGBgYGAuLi4.")
        ]
    }

    var loadURL = function(userid) {
        return $http.get('http://api-daily.yesbetec.com/CLDs?user_id=' + userid);
    };

    var getSuggestions = function(userid, sugInput, secret) {
        prompt = "列出来影响 " + sugInput + " 的主要因素，不多于5个，按重要程序排序，并给出因素的名字，用正向或者负向其中一个来表达影响的方向并用小括号包围，以及对该因素一步一步地详细的解释。输出用JSON格式，把所有因素都放在一个命名为importance的数组对象中，其中每一个主要因素是数组中的一个item，属性名分别用name，direction和explanation";
        return chat(prompt, secret);
    };

    var getInferences = function(userid, input, secret) {
        prompt = "我决定 " + input + "。列出来上述决定会导致的主要后果，不多于5个，按重要程序排序，并给出后果的名字，用正向或者负向其中一个来表达影响的方向并用小括号包围，以及对该影响一步一步地详细的解释。输出用JSON格式，把所有因素都放在一个命名为importance的数组对象中，其中每一个主要因素是数组中的一个item，属性名分别用name，direction和explanation";
        return chat(prompt, secret);
    };

    var getFeatures = function(userid, input, secret) {
        prompt = "列出来 " + input + " 的主要特征，不多于5个，按重要程序排序，并给出特征的名字，用正向或者负向其中一个来表达影响的方向并用小括号包围，以及对该特征一步一步地详细的解释。输出用JSON格式，把所有特征都放在一个命名为importance的数组对象中，其中每一个主要特征是数组中的一个item，属性名分别用name，direction和explanation";
        return chat(prompt, secret);
    };

    var chat = function(prompt, secret) {
        return $http({
            method: 'POST',
            url: 'https://zd513m4z1h.execute-api.ap-southeast-1.amazonaws.com/alpha/chat',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "prompt": [{"role": "user", "content": prompt}],
            }
        })
    }

    var create = function(userid) {
        return $http.post('http://api-daily.yesbetec.com/CLDs?user_id=' + userid);
    };

    var save = function(userid, SelectedItem) {
        // Issue a POST request to update the data
        return $http.post('http://api-daily.yesbetec.com/CLDs/' + SelectedItem.id + '?user_id=' + userid, SelectedItem);
    }

    var remove = function(userid, SelectedItem) {
        // Issue a POST request to update the data
        return $http.delete('http://api-daily.yesbetec.com/CLDs/' + SelectedItem.id + '?user_id=' + userid, SelectedItem);
    }   

    var loadSecret = function() {
        return $http.get('http://api-daily.yesbetec.com/secret');
    }

    return {
        load: loadURL,
        getSuggestions: getSuggestions,
        getInferences: getInferences,
        getFeatures: getFeatures,
        save: save,
        new: create,
        delete: remove,
        loadSecret: loadSecret
    }
}])

angular.module('myApp', ['CLDService'])
.controller('CLDController', ['myService', '$scope', function CLDController(myService, $scope) {
    var ctrl = this;
    
    $scope.SelectedItem = null;

    // get the userid from local storage
    $scope.userid = localStorage.getItem("userid");
    $scope.nickname = localStorage.getItem("nickname");

    if (!$scope.userid) {
        // 暂时没有访客模式，直接跳转到登录页面
        window.location.href = "login.html";
    }

    this.IsChanged = false;

    myService.load($scope.userid).then(function(response) {
        $scope.CausalLoops = JSON.parse(response.data);

        // return undefined if no item
        $scope.SelectedItem = $scope.CausalLoops[0];

        setTimeout(function checkIframe() {
            var iframe = document.getElementById('cldFrame');
            var w = iframe.contentWindow;
            if (w.loopy && w.loopy.loadFromData) {
                // if has at least one item, Select the first item
                if ($scope.CausalLoops.length > 0) {
                    $scope.handleClick($scope.CausalLoops[0]);
                } else {
                    // create a blank item
                    $scope.new();
                }
            } else {
              setTimeout(checkIframe, 100);
            }
          }, 100);

        // Remove function for $scope.CausalLoops
        $scope.CausalLoops.Remove = function(item) {
            var index = this.indexOf(item);
            if (index > -1) {
                this.splice(index, 1);
            }
        }
    });

    this.init = function() {
        // load secret from service and save it to local storage
        myService.loadSecret().then(function(response) {
            localStorage.setItem("secret", "Bearer " + response.data);
        });
    }

    $scope.chat = function() {
        $('#exampleModal').modal('show');
    }

    $scope.checkKey = function($event) {
        if ($event.which === 13) {
            $scope.Suggestions = [];
            $scope.information = "AI正在抓耳挠腮，请耐心等待，大约需要30秒...";

            // load secret from local storage
            var secret = localStorage.getItem("secret");

            myService.getSuggestions($scope.userid, $scope.sugInput, secret)
            .then(function(response) {
                if (response.data.choices && response.data.choices.length > 0) {
                    $scope.information = "影响" + $scope.sugInput + "的关键因素有：";

                    response.data.choices.forEach(function(item) {                        
                        var obj = angular.fromJson(item.message.content)

                        obj.importance.forEach(function(item) {
                            $scope.Suggestions.push(new Suggestion(item.name, item.direction, item.explanation));
                        })
                    })
                } else {
                    $scope.information = response.data.message;
                }
            }, function(error) {
                $scope.information = error;
            });
        }
    };

    // A function to require suggestion from remote API and parse the result
    $scope.checkInferenceKey = function($event) {
        if ($event.which === 13) {
            $scope.Inferences = [];
            $scope.inferenceInformation = "AI正在抓耳挠腮，请耐心等待，大约需要30秒...";

            // load secret from local storage
            var secret = localStorage.getItem("secret");

            myService.getInferences($scope.userid, $scope.inferenceInput, secret)
            .then(function(response) {
                if (response.data.choices && response.data.choices.length > 0) {
                    $scope.inferenceInformation = $scope.inferenceInput + "导致的结果如下：";

                    response.data.choices.forEach(function(item) {                        
                        var obj = angular.fromJson(item.message.content)

                        obj.importance.forEach(function(item) {
                            $scope.Inferences.push(new Suggestion(item.name, item.direction, item.explanation));
                        })
                    })
                } else {
                    $scope.inferenceInformation = response.data.message;
                }
            }, function(error) {
                $scope.inferenceInformation = error;
            });
        }
    };

    $scope.checkFeatureKey = function($event) {
        if ($event.which === 13) {
            $scope.Features = [];
            $scope.featureInformation = "AI正在抓耳挠腮，请耐心等待，大约需要30秒...";

            // load secret from local storage
            var secret = localStorage.getItem("secret");

            myService.getFeatures($scope.userid, $scope.featureInput, secret)
            .then(function(response) {
                if (response.data.choices && response.data.choices.length > 0) {
                    $scope.featureInformation = $scope.featureInput + "的特征如下：";

                    response.data.choices.forEach(function(item) {                        
                        var obj = angular.fromJson(item.message.content)

                        obj.importance.forEach(function(item) {
                            $scope.Features.push(new Suggestion(item.name, item.direction, item.explanation));
                        })
                    })
                } else {
                    $scope.featureInformation = response.data.message;
                }
            }, function(error) {
                $scope.featureInformation = error;
            });
        }
    };

    $scope.logout = function() {
        $scope.userid = "";

        // clear the local storage
        localStorage.removeItem("userid");

        // refresh the page to clear the data
        window.location.href = "login.html";
    }

    $scope.handleClick = function(item) {    
        var w = document.getElementById("cldFrame").contentWindow;
        w.loopy.loadFromData(item.body);
        $scope.SelectedItem = item;
        ctrl.IsChanged = false;
    }

    $scope.save = function() {
        // load data from loopy diagram
        var w = document.getElementById("cldFrame").contentWindow;
        var data = w.loopy.getDataAsURL();
        $scope.SelectedItem.body = data;

        myService.save($scope.userid, $scope.SelectedItem)
    }

    $scope.new = function() {
        // var blank = new CausalLoop("test2", "...", "CE4CMiAwK8vCcRx_CHAAA-AAHAAJNOERH4VQgAAAAAAAAAAAAHNvbWV0aGluZ2Bzb21ldGhpbmcgZWxzZWA-YGBgYGAuLi4.");
        myService.new($scope.userid).then(function(response) {
            var newCLD = JSON.parse(response.data);
            $scope.CausalLoops.push(newCLD);
            $scope.handleClick(newCLD);
        });
    }

    $scope.delete = function() {
        myService.delete($scope.userid, $scope.SelectedItem).then(function(response) {
            $scope.CausalLoops.Remove($scope.SelectedItem)

            // if has at least one item, Select the first item
            if ($scope.CausalLoops.length > 0) {
                $scope.handleClick($scope.CausalLoops[0]);
            } else {
                // create a blank item
                $scope.new();
            }
        });
    }
}]);

// Create a CaualLoop object, which has name, json for its body
function CausalLoop(id, name, body) {
    // Global unique ID 
    this.id = id;

    // Name of the causal loop object
    this.name = name;

    // JSON for the causal loop object
    this.body = body;
}

// Create a CaualLoop object, which has name, json for its body
function Suggestion(name, direction, description) {
    this.name = name;
    this.direction = direction;
    this.description = description;
}

