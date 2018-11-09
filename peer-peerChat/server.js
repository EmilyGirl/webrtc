const http = require('http'); 　//实例化“http”
const fs = require('fs');
// http服务
http.createServer(function (request, response) {
    //解析请求，包括文件名
    var pathname = request.url;
    //输出请求的文件名
    console.log("Request for " + pathname + "  received.");

    //从文件系统中都去请求的文件内容
    fs.readFile(pathname.substr(1), function (err, data) {
        if (err) {
            console.log(err);
            //HTTP 状态码 404 ： NOT FOUND
            //Content Type:text/plain
            response.writeHead(404, { 'Content-Type': 'text/html' });
        }
        else {
            //HTTP 状态码 200 ： OK
            //Content Type:text/plain
            response.writeHead(200, { 'Content-Type': 'text/html' });

            //写会相应内容
            response.write(data.toString());
        }
        //发送响应数据
        response.end();
    });
}).listen(8081);

console.log("http://192.168.131.216:8081")

// ws服务
var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({ port: 8080 }),
    users = {},
    onlineUser = [];//显示用户人数
// ws服务
wss.on('connection', function (connection) {
    // 建立连接调用服务器connection事件
    console.log('client connected');
    connection.on('message', function (message) {

        // 用户反馈信息
        var data;
        try {
            data = JSON.parse(message);
            console.log(data);
            // 字符串转为对象
        } catch (error) {
            data = {};
        }
        console.log("data", data)
        switch (data.type) {
            case "login":
                console.log("user logged", data.name);
                //    不包含这个用户
                if (onlineUser.indexOf(data.name) == -1) {
                    users[data.name] = connection;
                    connection.name = data.name;
                    sendTo(connection, {
                        type: 'login',
                        success: true,
                        user: data.name

                    });
                } else {

                    sendTo(connection, {
                        type: 'login',
                        success: false
                    });
                    return;
                }
                //登陆成功人
                if (connection.name != null) {
                    onlineUser.push(connection.name);
                }
                //    广播展示
                const obj = ({
                    type: 'online',
                    user: onlineUser
                })
                wss.clients.forEach(function each(client) {
                    client.send(JSON.stringify(obj));
                });

                break;
            case "getonlineusers":
                console.log("获取在线用户");
                sendTo(connection, {
                    type: 'getonlineusers',
                    users: onlineUser,
                });
                break;
            case "newData":
                onlineUser = data.newpublicUsers;
                console.log("更新用户列表:-----", onlineUser);
                const newObj = ({
                    type: 'online',
                    user: onlineUser
                })
                // 重新广播
                wss.clients.forEach(function each(client) {
                    client.send(JSON.stringify(newObj));
                });
                break;
            case "offer":
                console.log("send offer to");
                var conn = users[data.name];
                if (conn != null) {
                    connection.otherName = data.name;
                    sendTo(conn, {
                        type: "offer",
                        offer: data.offer,
                        name: connection.name
                    });
                }
                break;
            case "answer":
                console.log("send answer to");
                var conn = users[data.name];
                if (conn != null) {
                    connection.otherName = data.name;
                    sendTo(conn, {
                        type: "answer",
                        answer: data.answer,
                        name: connection.name
                    });
                }
                break;
            case "candidate":
                console.log("send candidate to");
                var conn = users[data.name];
                if (conn != null) {
                    sendTo(conn, {
                        type: "candidate",
                        candidate: data.candidate,
                        name: connection.name,
                    });
                }
                break;
            case "sendFile":
                console.log("请求是否接收文件");
                var conn = users[data.nowName];
                if (conn != null) {
                    sendTo(conn, {
                        type: "sendFile",
                        name: connection.name
                    });
                }
                break;
            case "sendFilesSuccess":
                console.log("同意接收");
                var conn = users[data.theirname];
                // conn.otherName = null;
                if (conn != null) {
                    sendTo(conn, {
                        type: "sendFilesSuccess",
                        name: connection.name,
                    });
                }
                break;
            case "leave":
                console.log("断开对等连接");
                var conn = users[data.name];
                // conn.otherName = null;
                if (conn != null) {
                    sendTo(conn, {
                        type: "leave",
                    });
                }
                break;
            default:
                sendTo(connection, {
                    type: 'error',
                    message: data.type
                });
                break;
        }
        console.log('用户发送的消息', message);


    });
});
function sendTo(connection, message) {
    // 服务端向用户发送信息 对象转字符串
    connection.send(JSON.stringify(message))
}
console.log("running ws");

