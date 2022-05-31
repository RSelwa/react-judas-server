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
var controllerName = "c";
var viewerName = "v";
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
        ? (result = clients.filter(function (e) {
            return e.room === room && e.name != controllerName && e.name != viewerName;
        }))
        : (result = clients.filter(function (e) { return e.room === room; }));
    return result;
}
function returnCagnotteOfRoom(room) {
    var indexOfCagnottes = cagnottes.findIndex(function (cagnotte) { return cagnotte.room == room; });
    return cagnottes[indexOfCagnottes];
}
io.on("connection", function (socket) {
    console.log("🟢 new connection", socket.client.id);
    function updatePlayers(dataRoom) {
        io.to(dataRoom).emit("updatePlayerResponse", {
            players: getAllClientsWithSameRoom(dataRoom)
        });
    }
    function updateCagnottes(dataRoom, cagnotte) {
        io.to(dataRoom).emit("updateCagnottesResponse", {
            cagnotte: cagnotte
        });
    }
    socket.on("test", function (data) { });
    socket.on("disconnect", function (data) {
        console.log("🔴 user disconnect");
        var clientOnClients = getClientByID(socket.client.id);
        //*remove players from clients
        if (clientOnClients) {
            clients.splice(clients.indexOf(clientOnClients), 1);
            updatePlayers(clientOnClients.room);
        }
        //*remove cagnottes where no players in room
        cagnottes.forEach(function (cagnotte) {
            if (!clients.some(function (client) {
                return client.room == cagnotte.room;
            })) {
                cagnottes.splice(cagnottes.indexOf(cagnotte), 1);
            }
        });
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
        socket.emit("joinRoomResponse", {
            room: data.room,
            name: data.name
        });
        switch (data.name) {
            case controllerName:
                socket.emit("joinControllerResponse", {
                    room: data.room
                });
                break;
            case viewerName:
                socket.emit("joinViewerResponse", {
                    room: data.room
                });
                break;
            default:
                socket.emit("joinPlayerResponse", {});
                break;
        }
        clients.push(newPlayer);
        updatePlayers(data.room);
        if (cagnottes.find(function (e) { return e.room == data.room; }) == undefined) {
            cagnottes.push({ room: data.room, innocentValue: 0, traitorValue: 0 });
        }
        updateCagnottes(data.room, returnCagnotteOfRoom(data.room));
    });
    socket.on("modifyCagnottes", function (data) {
        try {
            //todo disable negative subs
            data.isCagnottesTraitor
                ? (returnCagnotteOfRoom(data.room).traitorValue += data.value)
                : (returnCagnotteOfRoom(data.room).innocentValue += data.value);
        }
        catch (error) { }
        updateCagnottes(data.room, returnCagnotteOfRoom(data.room));
    });
    socket.on("resetCagnottes", function (data) {
        try {
            data.isCagnottesTraitor
                ? (returnCagnotteOfRoom(data.room).traitorValue = 0)
                : (returnCagnotteOfRoom(data.room).innocentValue = 0);
        }
        catch (error) { }
        updateCagnottes(data.room, returnCagnotteOfRoom(data.room));
    });
    socket.on("modifyPlayerPts", function (data) {
        var playerIndex = clients.findIndex(function (e) { return e.id == data.playerId; });
        if (clients[playerIndex]) {
            if (clients[playerIndex].pts == 0 && data.newValue == -1) {
                clients[playerIndex].pts = clients[playerIndex].pts;
            }
            else {
                clients[playerIndex].pts = clients[playerIndex].pts + data.newValue;
            }
        }
        updatePlayers(data.room);
    });
});
var PORT = process.env.port || 6602;
httpServer.listen(PORT, function () {
    console.log("🚀 server is listening");
});
