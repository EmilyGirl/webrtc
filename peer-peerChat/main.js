// 与服务器建立websocket连接
var name,
    connectionUser,
    connection = new WebSocket("ws://192.168.131.216:8080/");
// 操作js
var loginPage = document.querySelector("#login-page"),
    usernameInput = document.querySelector("#username"),
    loginButton = document.querySelector("#login"),
    theirUserInput = document.querySelector("#their-username"),
    connectButton = document.querySelector("#connect"),
    sharePage = document.querySelector("#share-page"),
    sendButton = document.querySelector("#send"),
    readyText = document.querySelector("#ready"),
    statusText = document.querySelector("#status"),
    download = document.querySelector("#download"),
    sendProgress = document.querySelector("#sendProgress"),
    receiveProgress = document.querySelector("#receiveProgress"),
    message = document.querySelector("#message"),
    receivedRecord = document.querySelector("#received"),
    onlineUser = document.querySelector("#onlineUser"),
    onHang = document.querySelector("#onHang");

sharePage.style.display = "none";
readyText.style.display = "none";
// 用户开启与服务端的连接
connection.onopen = function () {
    console.log("用户与服务端连接成功");
}
// 服务端反馈回信息
connection.onmessage = function (message) {
    console.log("get message success", message);
    // 字符串转换为对象
    var data = JSON.parse(message.data);
    // 通过type属性值确定信息
    switch (data.type) {
        case "login":
            onLogin(data.success)
            break;
        case "offer":
            onOffer(data.offer, data.name)
            break;
        case "answer":
            onAnswer(data.answer, data.name)
            break;
        case "candidate":
            onCandidate(data.candidate)
            break;
        case "leave":
            onLeave()
            break;
        case "onlines":
            onLines(data.user)
            break;
        default:
            break;
    };
};
connection.onerror = function (err) {
    console.log("get error", err);
};
// 显示在线用户
function onLines(users) {
    console.log(users);

    for (var i = 0; i < users.length; i++) {
        var online = document.createElement("div");
        online.style.marginBottom = "20px";
        online.innerHTML = users[i];
        onlineUser.append(online);
        online.addEventListener("click", function () {
            theirUserInput.value = this.innerHTML;
        })
    }
}
function send(message) {
    if (connectionUser) {
        message.name = connectionUser;
    }
    // 向服务端发送信息
    connection.send(JSON.stringify(message));
}

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
        alert("登录失败")
    } else {
        alert("登陆成功")
        loginPage.style.display = "none";
        sharePage.style.display = "block";
        // 双方建立连接 准备通话通道、
        startupConnection();
    }
};
// 获取用户媒体
function hasUserMedia() {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia
    return !!navigator.getUserMedia;
}
// 创建连接对象
function hasRTCPeerConnection() {
    window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    return !!window.RTCPeerConnection;
}
var yourConnection, connectedUser, dataChannel;
// 建立对等连接
function startupConnection() {
    if (hasRTCPeerConnection()) {
        startPeerConnection();
    } else {
    }
};
function startPeerConnection(stream) {
    var configuration = null
    // {
    //     "iceServers":[{"url":"stun:192.168.131.216:9876"}]
    // };
    yourConnection = new RTCPeerConnection(configuration, { optional: [] });
    // ICE
    yourConnection.onicecandidate = function (event) {
        if (event.candidate) {
            send({
                type: 'candidate',
                candidate: event.candidate,
            })
        }
    };
    yourConnection.ondatachannel = function (event) {
        // 接收通道
        dataChannel = event.channel;
        console.log("ondata", dataChannel)
        dataChannel.onopen = function () {
            console.log("等待接收")
        }
        dataChannel.onmessage = function (event) {
            console.log("ondatachannel message:", event.data);
        };
    };
    openDataChannel();

};

connectButton.addEventListener("click", function () {
    var theirUsername = theirUserInput.value;
    if (theirUsername.length > 0) {
        startConnection(theirUsername);
    }
});
function startConnection(user) {
    connectionUser = user;
    yourConnection.createOffer(function (offer) {
        send({
            type: 'offer',
            offer: offer
        });
        yourConnection.setLocalDescription(offer);
    }, function (err) {
        alert("offer failed");
    })
};
function onOffer(offer, name) {
    connectionUser = name;
    yourConnection.setRemoteDescription(new RTCSessionDescription(offer))
    yourConnection.createAnswer(function (answer) {
        console.log('answer', answer);
        yourConnection.setLocalDescription(answer);
        send({
            type: 'answer',
            answer: answer,
        });
    }, function (err) {
        console.log(err);
    })

};
function onAnswer(answer) {
    yourConnection.setRemoteDescription(new RTCSessionDescription(answer));
};
function onCandidate(candidate) {
    yourConnection.addIceCandidate(new RTCIceCandidate(candidate));
};
// 关闭对等连接 关闭数据通道
function onLeave() {
    connectionUser = null;
    yourConnection.close();
    yourConnection.onicecandidate = null;
    yourConnection.onaddStream = null;
    startPeerConnection();
    console.log(datachannel);
}
onHang.addEventListener("click", function () {
    send({
        type: 'leave',
    });
})
// 双方发送数据
sendButton.addEventListener("click", function () {
    var files = document.querySelector("#files").files;
    var messageData = message.value;
    if (files.length > 0) {
        sendData();
        receivedRecord.innerHTML += name + ":" + files[0].name + "<br/>";
        receivedRecord.scrollTop = receivedRecord.scrollHeight;
    } else if (messageData.length > 0) {
        receivedRecord.innerHTML += name + ":" + messageData + "<br/>";
        receivedRecord.scrollTop = receivedRecord.scrollHeight;
        sendDataChannel(messageData);
    }

})
// 发送文件处理
var sendFilesSize, sendFileName, receiveBuffer = [], receivedSize = 0;
function sendData() {
    const file = document.querySelector("#files").files[0];
    sendFilesSize = file.size;
    sendFileName = file.name;
    console.log("sendsize", file);
    const obj = {
        "size": sendFilesSize,
        "name": sendFileName,
    }
    sendDataChannel(JSON.stringify(obj));
    // 发送数据分块处理
    const chunkSize = 16384;
    fileReader = new FileReader();
    console.log(fileReader);
    let offset = 0;
    fileReader.addEventListener('error', error => console.error('Error reading file:', error));
    fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
    fileReader.addEventListener('load', e => {
        sendDataChannel(e.target.result);
        offset += e.target.result.byteLength;
        const sendPercentage = Math.floor((offset / sendFilesSize) * 100)
        sendProgress.innerHTML = "sending..." + sendPercentage + "%";
        setTimeout(() => {
            sendProgress.style.display = "none"
        }, 20000);
        if (offset < file.size) {
            readSlice(offset);
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
    } else {
        alert("先建立连接");
    }
}
function openDataChannel() {
    var dataChannelOptions = {
        reliable: true,
        ordered: true,
    };
    dataChannel = yourConnection.createDataChannel("myLabel", dataChannelOptions);
    dataChannel.onerror = function (err) {
        console.log("datachennel error", err)
    };
    dataChannel.onopen = function () {
        readyText.style.display = "inline-block";
    };
    dataChannel.onmessage = function (event) {
        var received, sendFilesSizepar;
        sendFilesSizepar = parseInt(sendFilesSize)
        // 判断接收类型
        if (event.data instanceof ArrayBuffer) {
            receiveBuffer.push(event.data);
            receivedSize += event.data.byteLength;
            const receivePercentage = Math.floor((receivedSize / sendFilesSize) * 100)
            receiveProgress.innerHTML = "receiving..." + receivePercentage + "%";
            setTimeout(() => {
                receiveProgress.style.display = "none"
            }, 20000);
            //   接收完之后(判断接收方大小是否和发送方大小一致)
            if (receivedSize === sendFilesSizepar) {
                received = new Blob(receiveBuffer);
                receiveBuffer = [];
                receivedSize = 0;
                var download = document.createElement('a');
                download.href = window.URL.createObjectURL(received);
                download.download = sendFileName;
                download.click();
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
            receivedRecord.innerHTML += connectionUser + ":" + sendFileName + "<br/>";
            receivedRecord.scrollTop = receivedRecord.scrollHeight;
        }


    };
    dataChannel.onclose=function(){
        sendButton.display=true;
    }


};
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

