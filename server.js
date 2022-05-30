"use strict";
exports.__esModule = true;
var http_1 = require("http");
var socket_io_1 = require("socket.io");
var httpServer = (0, http_1.createServer)();
var io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: [
            "http://judas.r-selwa.space",
            "https://judas.r-selwa.space",
            "http://localhost:8080",
            "http://192.168.1.23:8080",
            "http://localhost:3000",
            "http://192.168.1.23:3000",
        ],
        methods: ["GET", "POST"]
    }
});
var clients = [];
var cagnottes = [];
var votesRoom = [];
function getClientByID(clientId) {
    return clients.find(function (client) { return client.id == clientId; });
    //   return clientId;
}
function getAllClientsWithSameRoom(room) {
    return clients.filter(function (e) { return e.room === room; });
}
io.on("connection", function (socket) {
    console.log("🟢 new connection", socket.client.id);
    socket.on("test", function (data) {
        socket.join(data.room);
        console.log("🧪 test");
    });
    socket.on("disconnect", function (data) {
        console.log("🔴 user disconnect");
        clients.splice(clients.indexOf(getClientByID(socket.client.id)), 1);
    });
    socket.on("joinRoom", function (data) {
        socket.join(data.room);
        var newPlayer = {
            id: socket.client.id,
            idClient: data.idClient,
            room: data.room,
            name: data.name,
            pts: 0,
            traitor: false,
            ptsCagnotte: 0
        };
        clients.push(newPlayer);
        io.to(data.room).emit("joinRoomResponse", data);
        io.to(data.room).emit("joinPlayerResponse", {
            players: getAllClientsWithSameRoom(data.room)
        });
    });
});
var PORT = process.env.port || 6602;
httpServer.listen(PORT, function () {
    console.log("🚀 server is listening");
});
