/*
   定义
*/
var name,//创建的用户
    connectionUser,//建立连接的用户
    connection = new WebSocket("ws://192.168.131.216:8080/"),//客户端建立websocket连接
    publicUsers = null;//实时更新在线用户

// 操作js
var loginPage = document.querySelector("#login-page"),
    usernameInput = document.querySelector("#username"),
    loginButton = document.querySelector("#login"),
    theirUserInput = document.querySelector("#their-username"),
    connectButton = document.querySelector(".connect"),
    sharePage = document.querySelector("#share-page"),
    sendButton = document.querySelector(".send"),
    readyConnect = document.querySelector("#readyConnect"),
    statusText = document.querySelector("#status"),
    download = document.querySelector("#download"),
    sendProgress = document.querySelector("#sendProgress"),
    receiveProgress = document.querySelector("#receiveProgress"),
    message = document.querySelector("#message"),
    receivedRecord = document.querySelector(".received"),
    onlineUser = document.querySelector("#onlineUser"),
    // onHang = document.querySelector(".onHang"),
    loginout = document.querySelector(".loginout"),
    YouronLine = document.querySelector(".YouronLine"),
    onFiles = document.querySelector("#onFiles"),
    Filesuccess = document.querySelector("#Filesuccess"),
    Filefail = document.querySelector("#Filefail"),
    fileNew = document.querySelector("#fileNew"),
    doText = document.querySelector("#doText");

sendProgress.style.display = "none";
receiveProgress.style.display = "none";
sharePage.style.display = "none";

/*
***************************************** 用户与服务端的连接
*/

// 用户开启与服务端的连接
connection.onopen = function () {
    console.log("用户与服务端连接成功");
    // 在页面加载之前先获取在线用户
    connection.send(JSON.stringify({
        type: 'getonlineusers',
    }));
    //上面获取列表的还没执行完成下面的就执行完了
}
// 服务端反馈回信息
connection.onmessage = function (message) {
    // 字符串转换为对象
    var data = JSON.parse(message.data);
    // 通过type属性值确定信息
    switch (data.type) {
        case "login":
            onLogin(data.success, data.user)
            break;
        case "offer":
            onOffer(data.offer, data.name)
            break;
        case "answer":
            onAnswer(data.answer, data.name)
            break;
        case "candidate":
            onCandidate(data.candidate, data.name)
            break;
        case "leave":
            onLeave(data.name)
            break;
        case 'getonlineusers':
            publicUsers = data.users;
            updateUsers(publicUsers);
            break;
        // 这里接收
        case "online":
            onLines(data.user);
            break;
        case "sendFile":
            sendFile(data.name);
            break;
        case "sendFilesSuccess":
            sendFilesSuccess(data.name);
            break;
        default:
            break;
    };
};
connection.onerror = function (err) {
    console.log("get error", err);
};
function send(message) {
    if (connectionUser) {
        message.name = connectionUser;
    }
    // 向服务端发送信息
    connection.send(JSON.stringify(message));
}



/*
// 本地存储 登录用户
*/
window.localStorage.setItem("name", name);
usernameInput.value = localStorage.getItem("name") ? localStorage.getItem("name") : usernameInput.value;
loginButton.addEventListener("click", function (event) {
    name = usernameInput.value;
    if (name.length > 0) {
        send({
            type: 'login',
            name: name
        })
    }
});



/**
 ********************************************** 开始连接
 */

var yourConnection,//连接对象
    nowName,//点击的用户名
    _oldUsers = [],//老用户
    _userConections = [];//新数组
// 获取用户媒体
function hasUserMedia() {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia
    return !!navigator.getUserMedia;
}
// 连接对象
function hasRTCPeerConnection() {
    window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    return !!window.RTCPeerConnection;
}
/* 
************************************** 创建连接对象
*/
function createYourConnection() {
    if (hasRTCPeerConnection()) {
        var configuration = {
            "iceServers": [{ "url": "stun:127.0.0.1:9876" }]
        };
        yourConnection = new RTCPeerConnection(configuration, { optional: [] });
        var dataChannelOptions = {
            reliable: true,
            ordered: true,
        };
        originalChannel = yourConnection.createDataChannel("myLabel", dataChannelOptions);
    } else {
    }
    return [yourConnection, originalChannel];
}
/* 
**************************************  在线用户数
*/
function onLines(users) {
    var newUserName = getNewJionUser(_oldUsers, users)[0];
    if (users.length > _oldUsers.length) {
        //有新用户加入进来
        var info = createYourConnection();
        var json = {};
        var con = info[0];
        var dach = info[1];
        json.value = con;
        json.name = newUserName;
        json.status = '';
        json.datach = dach;
        _userConections.push(json);
        openDataChannel(json.name, json.datach);
    } else {
        //有用户退出 从_userConections里面删除掉退出的用户以及他所对应的连接对象
        for (var i = 0; i < _userConections.length; i++) {
            if (_userConections[i].name == newUserName) {
                _userConections.splice(i, 1);
                continue;
            }
        }
    }
    _oldUsers = users;
    onlineUser.innerHTML = '';
    YouronLine.innerHTML = name;
    for (var i = 0; i < users.length; i++) {
        var online = document.createElement("div");
        online.style.marginBottom = "20px";
        online.innerHTML = users[i];
        // 列表中是自己
        if (online.innerHTML == name) {
            online.style.color = 'red';
        }
        onlineUser.appendChild(online);
        online.addEventListener("click", function () {
            if (this.innerHTML == name) {
                alert("这是你自己哦");
            } else {
                console.log("_userConections", _userConections);
                /**
                 * 开始offer  answer
                 */
                startClick(_userConections, this.innerHTML);

            }
        })
    }
}
/**
 ************************************* 开始offer，answer准备
 */

function startClick(arr, inner) {
    for (var a = 0; a < arr.length; a++) {
        if (arr[a].name == inner) {
            nowName = arr[a].name;
            // send按钮发送标记
            sendButton.setAttribute("data", nowName);
            document.querySelector(".files").setAttribute('data', nowName);

            readyConnect.innerHTML = arr[a].name;
            if (arr[a].status == '') {
                //确定好建立连接的用户开始建立连接
                startConnection(arr[a].name, arr[a].value);
                arr[a].value.oniceconnectionstatechange = function (event) {
                    if (event.target.iceConnectionState == 'completed') {
                        arr[a].status = 'success';
                    } else {
                    }
                }
                receivedRecord.innerHTML = '';
                return;
            } else {
                console.log("连接成功");
                receivedRecord.innerHTML = '';

            }

        }

    };
    //_userConections这是最新数组   arr只是临时的变量  最后赋值给_userConections而已
    _userConections = arr;
}
/**
 *************************************** 发送offer和answer
 */
function startConnection(user, yourValue) {
    connectionUser = user;
    yourValue.onicecandidate = function (event) {
        if (event.candidate) {
            send({
                type: 'candidate',
                candidate: event.candidate,
            })
        }
    };
    yourValue.createOffer(function (offer) {
        send({
            type: 'offer',
            offer: offer
        });
        yourValue.setLocalDescription(offer);

    }, function (err) {
        alert("offer failed");
    })

};

/**
 **************************************** send发送数据
 */

sendButton.addEventListener("click", function () {
    var files;
    files = document.querySelector(".files").files;
    var newData = _userConections.filter(function (item) {
        return item.name == nowName;
    })
    var newDataChannel = newData[0].datach;
    var messageData = message.value;
    if (files.length > 0) {
        // 发送文件之前请求是否同意接收
        send({
            type: 'sendFile',
            nowName: nowName,

        });
    } else if (messageData.length > 0) {
        receivedRecord.innerHTML += name + ":" + messageData + "<br/>";
        receivedRecord.scrollTop = receivedRecord.scrollHeight;

        if (newDataChannel.readyState == 'open') {
            newDataChannel.send(messageData);
        }
    }
    message.value = '';
})
/**
 **************************************** 通过服务器端返回的type值调用的函数
 */
function onLogin(success) {
    if (success == false) {
        alert("用户名已经登录")
    } else {
        loginPage.style.display = "none";
        sharePage.style.display = "block";
    }
};
function onOffer(offer, name) {
    // 请求连接
    connectionUser = name;
    // 查找该用户的数组
    var data = _userConections.filter(function (item) {
        return item.name == connectionUser;
    })
    var pc = data[0].value;
    var pcName = data[0].name;
    pc.setRemoteDescription(new RTCSessionDescription(offer));
    pc.createAnswer(function (answer) {
        pc.setLocalDescription(answer);
        send({
            type: 'answer',
            answer: answer,
        });
    }, function (err) {
        console.log(err);
    })
    // 打开用户向自己的通道
    readydatachannel(pcName, pc);
};
function onAnswer(answer, name) {
    connectionUser = name;
    var data = _userConections.filter(function (item) {
        return item.name == connectionUser;
    })
    var pc = data[0].value;
    pc.setRemoteDescription(new RTCSessionDescription(answer));
};
function onCandidate(candidate, name) {
    connectionUser = name;
    var data = _userConections.filter(function (item) {
        return item.name == connectionUser;
    })
    var pc = data[0].value;
    pc.addIceCandidate(new RTCIceCandidate(candidate));
};
function sendFile(theirname) {
    $("#onFiles").modal('show');
    doText.innerHTML = theirname + '将发送给您文件';
    Filesuccess.addEventListener("click", function () {
        send({
            type: 'sendFilesSuccess',
            theirname: theirname,
        })
        $("#onFiles").modal('hide');
        // 清空之前的theirname值（暂时这样改，后期优化）
        theirname = '';
    })
    Filefail.addEventListener("click", function () {
        alert("请稍后发送");
    })
};
function sendFilesSuccess() {
    sendData();
}
function onLeave() {
    readyConnect.innerHTML = '';
}

/**
 *********************************************  回调成功之后发送文件处理
 */

var sendFilesSize,//文件大小
    sendFileName,//文件名字
    receiveBuffer = [],//文件内容blob
    receivedSize = 0;//传送文件进度
function sendData() {
    var newData = _userConections.filter(function (item) {
        return item.name == nowName;
    })
    var newDataChannel = newData[0].datach;

    const file = document.querySelector(".files").files[0];
    sendFilesSize = file.size;
    sendFileName = file.name;
    console.log("size", file.size);
    console.log("sendsize", file);
    const obj = {
        "size": sendFilesSize,
        "name": sendFileName,
    }
    if (newDataChannel.readyState == 'open') {
        //我刚才说过了在这里
        newDataChannel.send(JSON.stringify(obj));
    }
    // 发送数据分块处理
    const chunkSize = 16384;
    var fileReader = new FileReader();
    console.log(fileReader);
    let offset = 0;
    fileReader.addEventListener('error', error => console.error('Error reading file:', error));
    fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
    fileReader.addEventListener('load', e => {
        if (newDataChannel.readyState == 'open') {
            //我刚才说过了在这里
            newDataChannel.send(e.target.result);
        }
        offset += e.target.result.byteLength;
        sendProgress.style.display = "inline-block"
        sendProgress.value = offset;
        sendProgress.max = sendFilesSize;
        if (offset < file.size) {
            readSlice(offset);
            sendProgress.style.display = "none"
        }
        if (sendFilesSize == offset) {
            setTimeout(() => {
                sendProgress.style.display = "none"
                fileNew.innerHTML = "<input type='file' class='files' style='display: inline-block' name='file'>";
            }, 5000);
        }
    });
    const readSlice = o => {
        // console.log('readSlice ', o);
        const slice = file.slice(offset, o + chunkSize);
        fileReader.readAsArrayBuffer(slice);
    };
    readSlice(0);
}

/**
 ************************************************ 数据通道
 */
// 用户发过来自己处理
function readydatachannel(theirname, yourConnectiondata) {
    readyConnect.innerHTML = theirname;
    doText.innerHTML = theirname + '将发送给您文件';
    yourConnectiondata.ondatachannel = function (event) {
        // 接收通道
        var dataChannel = event.channel;
        dataChannel.binaryType = "arraybuffer";
        dataChannel.onopen = function () {
            console.log("用户=>自己 的通道   自己发送给用户 ");
            console.log("user-my", dataChannel);
            dataChannel.send(name + '连接成功接收返回')
        }
        dataChannel.onmessage = function (event) {

            var received,//接收的blob对象
                sendFilesSizepar;//发送方通过datachannel发送发过来的文件参数
            sendFilesSizepar = parseInt(sendFilesSize)
            // 判断接收类型
            if (event.data instanceof ArrayBuffer) {
                receiveBuffer.push(event.data);
                receivedSize += event.data.byteLength;
                receiveProgress.style.display = "inline-block"
                receiveProgress.value = receivedSize;
                receiveProgress.max = sendFilesSize;
                if (receivedSize == sendFilesSize) {
                    setTimeout(() => {
                        receiveProgress.style.display = "none"
                    }, 5000);
                }

                //   接收完之后(判断接收方大小是否和发送方大小一致)
                if (receivedSize === sendFilesSizepar) {
                    received = new Blob(receiveBuffer);
                    receiveBuffer = [];
                    receivedSize = 0;
                    var downloads = document.createElement('a');
                    sharePage.appendChild(downloads);
                    downloads.style.display = 'none';
                    downloads.href = window.URL.createObjectURL(received);
                    downloads.download = sendFileName;
                    downloads.click();
                }
            } else {
                // 判断接收到的数据是文本/文件名
                if (isJSON(event.data)) {
                    // 文件
                    fileInfo = JSON.parse(event.data);
                    sendFilesSize = fileInfo.size;
                    sendFileName = fileInfo.name;
                } else {
                    // 文本
                    sendFileName = event.data;

                }
                receivedRecord.innerHTML += theirname + ":" + sendFileName + "<br/>";
                receivedRecord.scrollTop = receivedRecord.scrollHeight;
            }


        };
        dataChannel.onclose = function () {
        }
    };
}
// 发送给用户
function openDataChannel(yourname, datachannel) {
    var dataChannel = datachannel;
    dataChannel.binaryType = "arraybuffer";
    dataChannel.onerror = function (err) {
        console.log("datachennel error", err)
    };
    dataChannel.onopen = function () {
        // console.log("自己=>用户 的通道  用户发送给自己")
        dataChannel.send(name + '连接成功');

    };
    dataChannel.onmessage = function (event) {
        var received, sendFilesSizepar;
        sendFilesSizepar = parseInt(sendFilesSize)
        // 判断接收类型
        if (event.data instanceof ArrayBuffer) {
            receiveBuffer.push(event.data);
            receivedSize += event.data.byteLength;
            receiveProgress.style.display = "inline-block"
            receiveProgress.value = receivedSize;
            receiveProgress.max = sendFilesSize;
            if (receivedSize == sendFilesSize) {
                setTimeout(() => {
                    receiveProgress.style.display = "none"
                }, 5000);
            }
            //   接收完之后(判断接收方大小是否和发送方大小一致)
            if (receivedSize === sendFilesSizepar) {
                received = new Blob(receiveBuffer);
                receiveBuffer = [];
                receivedSize = 0;
                var downloads = document.createElement('a');
                sharePage.appendChild(downloads);
                downloads.style.display = 'none';
                downloads.href = window.URL.createObjectURL(received);
                downloads.download = sendFileName;
                downloads.click();
            }
        } else {
            // 判断接收到的数据是文本/文件名
            if (isJSON(event.data)) {
                // 文件
                fileInfo = JSON.parse(event.data);
                sendFilesSize = fileInfo.size;
                sendFileName = fileInfo.name;
            } else {
                // 文本
                sendFileName = event.data;

            }
            receivedRecord.innerHTML += yourname + ":" + sendFileName + "<br/>";
            receivedRecord.scrollTopTop = receivedRecord.scrollHeight;
        }


    };
    dataChannel.onclose = function () {
    }


};
/**
 * 更新实时用户
 */
function updateUsers(data) {
    if (data == null) return;
    if (data.length > 0) {
        data = removeArryVal(name, data);
        send({
            type: 'newData',
            newpublicUsers: data
        })
    }
}
loginout.addEventListener("click", function () {
    updateUsers(publicUsers);
    location.reload();
    send({
        type: 'leave',
    });
})





/**
 * **********************************************************封装函数
 */
/**
 * // 判断是否为json字符串
 */
function isJSON(str) {
    if (typeof str == 'string') {
        try {
            var obj = JSON.parse(str);
            if (typeof obj == 'object' && obj) {
                //console.log("我是json字符串")
                return true;
            } else {
                return false;
            }

        } catch (e) {
            console.log('error：' + str + '!!!' + e);
            return false;
        }
    }
    console.log('It is not a string!')
}
/**
 * // 移除某个元素
 */
function removeArryVal(s, arr) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] == s) {
            arr.splice(i, 1);
        }
    }

    return arr;
}
/**
 * //获取和上次不同的用户
 */
function getNewJionUser(arr1, arr2) {
    return arr1.concat(arr2).filter(function (v, i, arr) {
        return arr.indexOf(v) === arr.lastIndexOf(v);
    });
};