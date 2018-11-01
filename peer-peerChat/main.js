// 与服务器建立websocket连接
var name,
    connectionUser,
    leaveName,
    connection = new WebSocket("ws://192.168.131.216:8080/"),
    publicUsers = null;
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
    doOffer = document.querySelector("#doOffer"),
    doOffersuccess = document.querySelector("#doOffersuccess"),
    doOfferfail = document.querySelector("#doOfferfail"),
    loginout = document.querySelector(".loginout"),
    YouronLine = document.querySelector(".YouronLine"),
    onFiles = document.querySelector("#onFiles"),
    Filesuccess = document.querySelector("#Filesuccess"),
    Filefail = document.querySelector("#Filefail"),
    fileNew = document.querySelector("#fileNew"),
    doText = document.querySelector("#doText");


$("#doOffer").modal("hide");
sendProgress.style.display = "none";
receiveProgress.style.display = "none";
sharePage.style.display = "none";
// 用户开启与服务端的连接
connection.onopen = function () {
    console.log("用户与服务端连接成功");
    // console.log(JSON.stringify({ type: 'getOnlineUsers' }))
    connection.send(JSON.stringify({
        type: 'getonlineusers',
    }));
    //上面获取列表的还没执行完成下面的就执行完了
}
// 服务端反馈回信息
connection.onmessage = function (message) {
    // console.log("get message success", message);
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
            // console.log("publicUsers", publicUsers);
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
// 本地存储
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
function onLogin(success) {
    if (success == false) {
        alert("用户名已经登录")
    } else {
        // alert("登陆成功")
        loginPage.style.display = "none";
        sharePage.style.display = "block";
        // 登陆成功之后显示用户列表
        // onLines(users)
    }
};
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
// 获取不同用户
var yourConnections = [], yourConnection, connectedUser;
var jsonArray = [];
var _oldUsers = [];
var _userConections = [];
//获取和上次不同的用户
function getNewJionUser(arr1, arr2) {
    return arr1.concat(arr2).filter(function (v, i, arr) {
        return arr.indexOf(v) === arr.lastIndexOf(v);
    });
}
// 创建连接对象
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
// 在线用户数
function onLines(users) {
    // 数组push之前要清空
    yourConnections = [];
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
    console.log("......", newUserName);
    console.log("用户数目变化了", _userConections)
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
                test(_userConections, this.innerHTML);

            }
        })
    }
}
var nowName;
// 开始offer，answer准备
function test(arr, inner) {
    for (var a = 0; a < arr.length; a++) {
        if (arr[a].name == inner) {
            nowName = arr[a].name;
            sendButton.setAttribute("data", nowName);
            document.querySelector(".files").setAttribute('data', nowName);
           
            readyConnect.innerHTML = arr[a].name;
            if (arr[a].status == '') {
                startConnection(arr[a].name, arr[a].value);
                arr[a].value.oniceconnectionstatechange = function (event) {
                    if (event.target.iceConnectionState == 'completed') {
                        arr[a].status = 'success';
                        // openDataChannel(arr[a].name, arr[a].datach);
                    } else {
                        // startConnection(arr[a].name, arr[a].value);
                    }
                }
                receivedRecord.innerHTML = '';
                return;
            } else {
                alert("连接成功");
                // startConnection(arr[a].name, arr[a].value);
                // 点击切换到当前的连接对象
                receivedRecord.innerHTML = '';

            }

        }

    };
    //_userConections这是最新数组   arr只是临时的变量  最后赋值给_userConections而已
    _userConections = arr;
}
// 发送offer和answer
// name HE PEERCONNETION
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
    yourValue.onnegotiationneeded = function (event) {
        console.log(event + ' onnegotiationneeded');
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
function onOffer(offer, name) {
    // 请求连接
    connectionUser = name;
    var data = _userConections.filter(function (item) {
        return item.name == connectionUser;
    })
    console.log("接受方数组",_userConections);
    var pc = data[0].value;
    var pcName = data[0].name;
    pc.setRemoteDescription(new RTCSessionDescription(offer));
    pc.createAnswer(function (answer) {
        // console.log('answer', answer);
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
// 用户发过来自己处理
function readydatachannel(theirname, yourConnectiondata) {
    readyConnect.innerHTML = theirname;
    doText.innerHTML = theirname + '将发送给您文件';
    yourConnectiondata.ondatachannel = function (event) {
        // 接收通道
        var dataChannel = event.channel;
        console.log("theirrrrrrrrrrrrr", dataChannel);
        dataChannel.binaryType = "arraybuffer";
        dataChannel.onopen = function () {
            console.log("用户=>自己 的通道   自己发送给用户 ");
            console.log("user-my", dataChannel);
            dataChannel.send(name + '连接成功接收返回')
        }
        dataChannel.onmessage = function (event) {
            // console.log("ondatachannel message:", event.data);

            var received, sendFilesSizepar;
            sendFilesSizepar = parseInt(sendFilesSize)
            // 判断接收类型
            console.log("event", event);
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
                    //    文件
                    fileInfo = JSON.parse(event.data);
                    sendFilesSize = fileInfo.size;
                    sendFileName = fileInfo.name;
                } else {
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

    // doText.innerHTML=yourname + '将发送给您文件';
    var dataChannel = datachannel;
    console.log('yourrrrrrr', yourname, dataChannel, dataChannel.readyState);
    dataChannel.binaryType = "arraybuffer";

    dataChannel.onerror = function (err) {
        console.log("datachennel error", err)
    };
    dataChannel.onopen = function () {
        // console.log("自己=>用户 的通道  用户发送给自己")
        console.log("datamy-user", dataChannel);
        console.log(dataChannel.readyState);
        dataChannel.send(name + '连接成功');

    };
    dataChannel.onmessage = function (event) {
        // console.log("event", event);
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
                //    文件
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
        // sendButton.display = true;
    }


};
// 发送数据

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
            //我刚才说过了在这里
            newDataChannel.send(messageData);
        }
    }
    message.value = '';
})
// 收到回复之后处理文件
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
// 成功之后自己这边处理发送文件
function sendFilesSuccess() {
    sendData();
    // receivedRecord.innerHTML += name + ":" + files[0].name + "<br/>";
    // receivedRecord.scrollTop = receivedRecord.scrollHeight;
}
// 发送文件处理
var sendFilesSize, sendFileName, receiveBuffer = [], receivedSize = 0;
function sendData() {
    //这个位置会执行几次？1
    // console.log("datachannel file", dataChannel);
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
            // fileNew.innerHTML = "<input type='file' class='files' style='display: inline-block' name='file'>";
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
function sendDataChannel(data) {
    if (dataChannel.readyState == 'open') {
        dataChannel.send(data);
        // sendButton.disabled = false;
        // } else {
        // sendButton.disabled = true;
        // alert("先建立连接");
    }
}
// 

// 判断是否为json字符串
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
// 移除某个元素
function removeArryVal(s, arr) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] == s) {
            arr.splice(i, 1);
        }
    }

    return arr;
}
function updateUsers(data) {

    // console.log("-----", data);
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
// 关闭对等连接
function onLeave() {
    readyConnect.innerHTML = '';
}
