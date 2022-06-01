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
// let votesRoom = [];
function getClientByID(clientId) {
    //* get the id of the client in all the clients
    var client = clients.find(function (client) { return client.id == clientId; });
    return client;
    //   return clientId;
}
function getTheRoom(dataRoom) {
    return rooms.find(function (e) { return e.name == dataRoom; });
}
function getRealPlayers(dataRoom) {
    var room = getTheRoom(dataRoom);
    if (room) {
        return room.players.filter(function (player) {
            return player.name != controllerName && player.name != viewerName;
        });
    }
}
function getMostVotedPlayer(dataRoom) {
    //# si c'est 1 partout faire en sorte que le traitre ne soit pas designé comme le mostVoted, ici c'est le dernier player
    var room = getTheRoom(dataRoom);
    var players = getRealPlayers(dataRoom);
    var votes = room.votes;
    var votesTo = votes.map(function (vote) { return vote.to; });
    var counts = {}; //We are going to count occurrence of item here
    var compare = 0; //We are going to compare using stored value
    var mostFrequent; //We are going to store most frequent item
    for (var i = 0, len = votesTo.length; i < len; i++) {
        var player = votesTo[i]; //
        if (counts[player] === undefined) {
            //if count[word] doesn't exist
            counts[player] = 1; //set count[word] value to 1
        }
        else {
            //if exists
            counts[player] = counts[player] + 1; //increment existing value
        }
        if (counts[player] > compare) {
            //counts[word] > 0(first time)
            compare = counts[player]; //set compare to counts[word]
            mostFrequent = votesTo[i]; //set mostFrequent value
        }
    }
    return mostFrequent;
}
io.on("connection", function (socket) {
    var socketClientId = socket.client.id;
    console.log("🟢 new connection", socketClientId);
    function updateRoom(room) {
        updatePlayers(room);
        updateCagnottes(room, getTheRoom(room).cagnotte);
    }
    function updatePlayers(room) {
        //* function that send all players except controller and viewer
        io.to(room).emit("updatePlayerResponse", {
            players: getTheRoom(room).players.filter(function (player) {
                return player.name != controllerName && player.name != viewerName;
            })
        });
    }
    function updateCagnottes(room, cagnotte) {
        io.to(room).emit("updateCagnottesResponse", {
            cagnotte: cagnotte
        });
    }
    function updatesVotes(dataRoom) {
        var room = getTheRoom(dataRoom);
        io.to(dataRoom).emit("voteResponse", {
            votes: room.votes
        });
    }
    socket.on("test", function (data) {
        console.log(getMostVotedPlayer(data.room));
    });
    socket.on("disconnect", function (data) {
        console.log("🔴 user disconnect");
        var clientOnClients = getClientByID(socketClientId);
        //* if clients exists in clients
        if (clientOnClients) {
            //* find the room of the player
            var roomOfPlayer_1 = getTheRoom(clientOnClients.room);
            //* trouve le joueur dans room.player qui correspond à l'clientOnClients (qui est notre joueur deconnecté by id), puis le supprime de room.players
            roomOfPlayer_1.players.splice(roomOfPlayer_1.players.indexOf(roomOfPlayer_1.players.find(function (player) { return player == clientOnClients; })), 1);
            var playerWasTraitor = roomOfPlayer_1.traitorId == clientOnClients.idClient;
            if (playerWasTraitor) {
                roomOfPlayer_1.traitorId = "";
            }
            //* s'il n'y a plus de joueurs dans la room, supprime la room, faire gaffe aux viewer qui sont pas players?
            if (roomOfPlayer_1.players.length <= 0) {
                var roomInRooms = rooms.find(function (room) { return room == roomOfPlayer_1; });
                rooms.splice(rooms.indexOf(roomInRooms), 1);
            }
            //*remove players from clients
            clients.splice(clients.indexOf(clientOnClients), 1);
            if (roomOfPlayer_1.players.length > 0) {
                updatePlayers(clientOnClients.room);
            }
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
            ptsCagnotte: 0,
            hasVoted: false,
            voteConfirmed: false
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
                votes: [],
                votesLaunched: false,
                traitorId: ""
            });
        }
        rooms.find(function (e) { return e.name == data.room; }).players.push(newPlayer);
        updateRoom(data.room);
        // updatePlayers(data.room);
        // updateCagnottes(data.room, getTheRoom(data.room).cagnotte);
    });
    socket.on("modifyCagnottes", function (data) {
        var room = getTheRoom(data.room);
        console.log(room.cagnotte);
        data.isCagnottesTraitor
            ? (room.cagnotte.traitorValue += data.value)
            : (room.cagnotte.innocentValue += data.value);
        updateCagnottes(data.room, room.cagnotte);
    });
    socket.on("resetCagnottes", function (data) {
        var room = getTheRoom(data.room);
        console.log(room.cagnotte);
        data.isCagnottesTraitor
            ? (room.cagnotte.traitorValue = 0)
            : (room.cagnotte.innocentValue = 0);
        updateCagnottes(data.room, room.cagnotte);
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
    //# start game
    socket.on("selectTraitor", function (data) {
        var room = getTheRoom(data.room);
        var realPlayers = getRealPlayers(data.room);
        if (realPlayers.length > 0) {
            var randomTraitor_1 = realPlayers[Math.floor(Math.random() * realPlayers.length)];
            room.traitorId = randomTraitor_1.idClient;
            room.players.find(function (player) { return player == randomTraitor_1; }).isTraitor = true;
            updatePlayers(data.room);
        }
    });
    //# stop game
    socket.on("resetTraitor", function (data) {
        var room = getTheRoom(data.room);
        var playerTraitor = room.players.find(function (player) { return player.isTraitor == true; });
        if (playerTraitor) {
            playerTraitor.isTraitor = false;
            room.traitorId = "";
            updatePlayers(data.room);
        }
    });
    socket.on("toggleGameStatus", function (data) {
        io.to(data.room).emit("statusGameResponse", {
            inGame: !data.inGame
        });
        console.log(!data.inGame ? "🟩 now in game" : "🟥 no game");
    });
    socket.on("launchVote", function (data) {
        console.log("✉️ votes initiate");
        var room = getTheRoom(data.room);
        room.votesLaunched = true;
        io.to(data.room).emit("launchVoteResponse", {
            votesLaunched: room.votesLaunched
        });
        io.to(data.room).emit("sendPLayersForVOtes", {
            playersForVotes: getRealPlayers(data.room)
        });
    });
    socket.on("stopVote", function (data) {
        console.log("❌ votes stop");
        var room = getTheRoom(data.room);
        room.votesLaunched = false;
        room.votes = [];
        updatesVotes(data.room);
        room.players.forEach(function (player) {
            player.hasVoted = false;
            player.voteConfirmed = false;
        });
        updatePlayers(data.room);
        io.to(data.room).emit("stopVoteResponse", {
            votesLaunched: room.votesLaunched
        });
        io.to(data.room).emit("reinitiateVoteResposne", {
            hasVoted: false,
            voteConfirmed: false
        });
        io.to(data.room).emit("everyOneHaseveryOneHasConfirmedVoteResponse", {
            everyOneHasConfirmedVote: false
        });
    });
    socket.on("vote", function (data) {
        console.log("📩 vote received");
        var room = getTheRoom(data.room);
        var realPlayers = getRealPlayers(data.room);
        if (realPlayers) {
            var from_1 = realPlayers.find(function (player) { return player.idClient == data.clientId; });
            var to = data.playerVotedFor;
            var voteAlreadyExist = room.votes.find(function (vote) { return vote.from == from_1; });
            if (!voteAlreadyExist) {
                console.log("doesn exist");
                room.votes.push({ from: from_1, to: to, confirm: false });
            }
            else {
                var voteindex = room.votes.findIndex(function (vote) { return vote.from == from_1; });
                room.votes[voteindex].to = to;
            }
            from_1.hasVoted = true;
            updatesVotes(data.room);
            socket.emit("hasVotedResponse", {
                hasVoted: from_1.hasVoted
            });
        }
    });
    socket.on("confirmVote", function (data) {
        var room = getTheRoom(data.room);
        var voteToConfirm = room.votes.find(function (vote) { return vote.from.idClient == data.clientId; });
        if (voteToConfirm) {
            voteToConfirm.confirm = true;
            updatesVotes(data.room);
            socket.emit("hasVoteConfirmedResponse", {
                hasConfirmedVote: voteToConfirm.confirm
            });
        }
    });
    socket.on("everyoneConfirmDemand", function (data) {
        var room = getTheRoom(data.room);
        var players = getRealPlayers(data.room);
        var votes = room.votes;
        // let everyOneHasVoted:boolean
        if (votes.length == players.length) {
            var everyOneHasConfirmedVote = votes.every(function (vote) { return vote.confirm === true; });
            io.to(data.room).emit("everyOneHaseveryOneHasConfirmedVoteResponse", {
                everyOneHasConfirmedVote: everyOneHasConfirmedVote
            });
        }
    });
    socket.on("demandVotesResult", function (data) {
        var room = getTheRoom(data.room);
        var votes = room.votes;
        var votesTo = votes.map(function (vote) { return vote.to; });
        var mostVotedPlayer = getMostVotedPlayer(data.room);
        io.to(data.room).emit("demandVotesResultResponse", {
            mostVotedPlayer: mostVotedPlayer,
            displayVotesResult: true
        });
    });
});
var PORT = process.env.port || 6602;
httpServer.listen(PORT, function () {
    console.log("🚀 server is listening");
});
