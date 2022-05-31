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
var rooms = [];
// let cagnottes: Cagnotte[] = [];
var votesRoom = [];
function getClientByID(clientId) {
    //* get the id of the client in all the clients
    return clients.find(function (client) { return client.id == clientId; });
    //   return clientId;
}
function getTheRoom(dataRoom) {
    return rooms.find(function (e) { return e.name == dataRoom; });
}
io.on("connection", function (socket) {
    var socketClientId = socket.client.id;
    console.log("🟢 new connection", socketClientId);
    function updatePlayers(dataRoom) {
        //* function that send all players except controller and viewer
        io.to(dataRoom).emit("updatePlayerResponse", {
            players: getTheRoom(dataRoom).players.filter(function (player) {
                return player.name != controllerName && player.name != viewerName;
            })
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
        var clientOnClients = getClientByID(socketClientId);
        if (clientOnClients) {
            //*remove players from clients
            clients.splice(clients.indexOf(clientOnClients), 1);
            updatePlayers(clientOnClients.room);
            //* find the room of the player
            var roomOfPlayer_1 = rooms.find(function (room) { return room.name == clientOnClients.room; });
            //* trouve le joueur dans room.player qui correspond à l'clientOnClients (qui est notre joueur deconnecté by id), puis le supprime de room.players
            roomOfPlayer_1.players.splice(roomOfPlayer_1.players.indexOf(roomOfPlayer_1.players.find(function (player) { return player == clientOnClients; })), 1);
            //* s'il n'y a plus de joueurs dans la room, supprime la room, faire gaffe aux viewer qui sont pas players?
            if (roomOfPlayer_1.players.length <= 0) {
                var roomInRooms = rooms.find(function (room) { return room == roomOfPlayer_1; });
                rooms.splice(rooms.indexOf(roomInRooms), 1);
            }
            console.log(roomOfPlayer_1.players, "room leaved");
            // roomOfPlayer.players.find((player: Player) => player == clientOnClients);
        }
    });
    socket.on("joinRoom", function (data) {
        socket.join(data.room);
        var newPlayer = {
            id: socketClientId,
            idClient: data.idClient,
            room: data.room,
            name: data.name,
            pts: 0,
            isTraitor: false,
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
        //# initiate the room if doesn't exist yet
        if (rooms.find(function (e) { return e.name == data.room; }) == undefined) {
            rooms.push({
                name: data.room,
                inGame: false,
                players: [],
                cagnotte: {
                    room: data.room,
                    traitorValue: 0,
                    innocentValue: 0
                },
                traitorId: ""
            });
        }
        rooms.find(function (e) { return e.name == data.room; }).players.push(newPlayer);
        console.log(rooms.find(function (e) { return e.name == data.room; }).players, "room joigned");
        updatePlayers(data.room);
        // if (cagnottes.find((e) => e.room == data.room) == undefined) {
        //   cagnottes.push({ room: data.room, innocentValue: 0, traitorValue: 0 });
        // }
        // updateCagnottes(data.room, returnCagnotteOfRoom(data.room));
    });
    socket.on("modifyCagnottes", function (data) {
        // try {
        //   //todo disable negative subs
        //   data.isCagnottesTraitor
        //     ? (returnCagnotteOfRoom(data.room).traitorValue += data.value)
        //     : (returnCagnotteOfRoom(data.room).innocentValue += data.value);
        // } catch (error) {}
        // updateCagnottes(data.room, returnCagnotteOfRoom(data.room));
    });
    socket.on("resetCagnottes", function (data) {
        // try {
        //   data.isCagnottesTraitor
        //     ? (returnCagnotteOfRoom(data.room).traitorValue = 0)
        //     : (returnCagnotteOfRoom(data.room).innocentValue = 0);
        // } catch (error) {}
        // updateCagnottes(data.room, returnCagnotteOfRoom(data.room));
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
    socket.on("launchGame", function (data) {
        console.log(clients);
        io.to(data.room).emit("statusGameResponse", {});
    });
    socket.on("selectTraitor", function (data) {
        io.to(data.room).emit("selecttraitorResponse", {
            inGame: true
        });
    });
    socket.on("stopGame", function (data) {
        console.log("stop game");
        io.to(data.room).emit("statusGameResponse", {
            inGame: false
        });
    });
});
var PORT = process.env.port || 6602;
httpServer.listen(PORT, function () {
    console.log("🚀 server is listening");
});
