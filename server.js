var express = require('express');
var socket = require('socket.io');
var app = express();

app.use("/", express.static(__dirname));
app.get("/", function(req, res)
{
	res.sendFile("index.html");
});

var server = app.listen(process.env.PORT || 3000, function () {
    console.log("server just started listening on port ");
});

var io = socket(server);

var playerss = {};
io.on("connection", function (socket) {
    console.log("A client tried to connect with ID :: " + socket.id);
    socket.emit("GetYourID", { id : socket.id });
    playerss[socket.id] = socket;

    socket.on("ThankYou", function () {
        console.log("The client with ID " + socket.id + " connected ");
    });

    socket.on("IWasCreated", function (data) {
        playerss[data.id] = data;
        socket.broadcast.emit("AnotherPlayerCreated", data);
        
        for (key in playerss) {
            if (key == socket.id) continue;
            socket.emit("AnotherPlayerCreated", playerss[key]);
        }
    });
    
    socket.on("IMoved", function (data) {
        playerss[data.id] = data;
        socket.broadcast.emit("AnotherPlayerMoved", data);
        
    });

    socket.on("disconnect", function() {
        delete playerss[socket.id];
        socket.broadcast.emit("AnotherWentAway", { id : socket.id });
        socket.disconnect(socket.id);
        console.log("The client with ID " + socket.id + " left ");
    });

});

