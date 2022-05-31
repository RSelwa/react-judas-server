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
function getAllClientsWithSameRoom(room, onlyPlayers) {
    if (onlyPlayers === void 0) { onlyPlayers = true; }
    var result;
    onlyPlayers
        ? (result = clients.filter(function (e) { return e.room === room && e.name != "controller" && e.name != "viewer"; }))
        : (result = clients.filter(function (e) { return e.room === room; }));
    return result;
}
io.on("connection", function (socket) {
    console.log("🟢 new connection", socket.client.id);
    function updatePlayers(dataRoom) {
        io.to(dataRoom).emit("updatePlayerResponse", {
            players: getAllClientsWithSameRoom(dataRoom)
        });
    }
    socket.on("test", function (data) {
        socket.join(data.room);
        console.log("🧪 test");
        io.to(data.room).emit("testResponse", {});
    });
    socket.on("disconnect", function (data) {
        console.log("🔴 user disconnect");
        var clientOnClients = getClientByID(socket.client.id);
        if (clientOnClients) {
            clients.splice(clients.indexOf(clientOnClients), 1);
            updatePlayers(clientOnClients.room);
        }
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
        socket.emit("joinRoomResponse", {
            room: data.room
        });
        switch (data.name) {
            case "controller":
                socket.emit("joinControllerResponse", {});
                break;
            case "viewer":
                socket.emit("joinViewerResponse", {});
                break;
            default:
                socket.emit("joinPlayerResponse", {});
                break;
        }
        console.log(getAllClientsWithSameRoom(data.room));
        updatePlayers(data.room);
    });
});
var PORT = process.env.port || 6602;
httpServer.listen(PORT, function () {
    console.log("🚀 server is listening");
});
