"use strict";
exports.__esModule = true;
exports.getMostVotedPlayer = exports.findOcc = exports.getRealPlayers = exports.getTheRoom = exports.getPlayerByIdClient = exports.getClientByID = void 0;
//#region socket
var PORT = process.env.port || 6602;
var LOCAL_ADDRESS = process.env.port || "0.0.0.0";
var options = {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
};
var app = require("express")();
var httpServer = require("http").createServer(app);
var io = require("socket.io")(httpServer, options);
// const httpServer = createServer();
// const io = new Server(httpServer, options);
app.get("/", function (req, res) {
    res.send("Hello World! I'm a react server test psh" + PORT);
});
//#endregion
//#region functions
function getClientByID(clientId) {
    //* get the id of the client in all the clients
    var client = clients.find(function (client) { return client.idServer == clientId; });
    return client;
    //   return clientId;
}
exports.getClientByID = getClientByID;
function getPlayerByIdClient(idClient, room) {
    var players = getTheRoom(room).players;
    var player = players.find(function (player) { return player.idClient == idClient; });
    return player;
}
exports.getPlayerByIdClient = getPlayerByIdClient;
function getTheRoom(dataRoom) {
    return rooms.find(function (e) { return e.id == dataRoom; });
}
exports.getTheRoom = getTheRoom;
function getRealPlayers(dataRoom) {
    var room = getTheRoom(dataRoom);
    if (room) {
        return room.players.filter(function (player) { return player.role === "player"; });
    }
}
exports.getRealPlayers = getRealPlayers;
function findOcc(arr, key) {
    var arr2 = [];
    arr.forEach(function (x) {
        // Checking if there is any object in arr2
        // which contains the key value
        if (arr2.some(function (val) {
            return val[key] == x[key];
        })) {
            // If yes! then increase the occurrence by 1
            arr2.forEach(function (k) {
                if (k[key] === x[key]) {
                    k["occurrence"]++;
                }
            });
        }
        else {
            // If not! Then create a new object initialize
            // it with the present iteration key's value and
            // set the occurrence to 1
            var a = {};
            a[key] = x[key];
            a["occurrence"] = 1;
            arr2.push(a);
        }
    });
    return arr2;
}
exports.findOcc = findOcc;
function getMostVotedPlayer(dataRoom) {
    //# si c'est 1 partout faire en sorte que le traitre ne soit pas designé comme le mostVoted, ici c'est le dernier player qui a été voté soit le last dans room.votes
    var selectInnocent = true;
    var room = getTheRoom(dataRoom);
    var votes = room.votes;
    var votesTo = votes.map(function (vote) { return vote.to; });
    var arr2 = findOcc(votesTo, "idClient");
    var maxOccurences = Math.max.apply(Math, arr2.map(function (o) { return o.occurrence; }));
    var result = arr2.filter(function (arr) {
        return arr.occurrence == maxOccurences;
    });
    var mostVotedPlayer = result.length > 1
        ? getPlayerByIdClient(result[0].idClient, dataRoom).isTraitor
            ? selectInnocent
                ? getPlayerByIdClient(result[1].idClient, dataRoom)
                : getPlayerByIdClient(result[0].idClient, dataRoom)
            : selectInnocent
                ? getPlayerByIdClient(result[0].idClient, dataRoom)
                : getPlayerByIdClient(result[1].idClient, dataRoom) //! checker s'il y a un traitre dans l'egzlité parce que maybe que c'est eux innocent, et si oui faire un find, sinon prendre le premier, s'il y a trois egalités, il faut loop pour trouver le traitre
        : getPlayerByIdClient(result[0].idClient, dataRoom);
    return mostVotedPlayer;
}
exports.getMostVotedPlayer = getMostVotedPlayer;
//#endregion
var clients = [];
var rooms = [];
io.on("connection", function (socket) {
    var socketClientId = socket.client.id;
    // console.log("🟢 new connection", "");
    console.log("🟢 new connection", socketClientId);
    //#region Functions in
    var sendError = function (errorMessage, roomId) {
        io["in"](roomId).emit("error", {
            message: errorMessage
        });
    };
    var updateRoomClient = function (roomId) {
        io["in"](roomId).emit("updateRoom", {
            room: getTheRoom(roomId)
        });
    };
    var removePlayer = function () {
        try {
            var clientOnClients_1 = getClientByID(socketClientId);
            // const clientOnClients: PlayerType = getClientByID("");
            //* if clients exists in clients
            if (clientOnClients_1) {
                //* find the room of the player
                var roomOfPlayer_1 = getTheRoom(clientOnClients_1.room);
                //* trouve le joueur dans room.player qui correspond à l'clientOnClients (qui est notre joueur deconnecté by id), puis le supprime de room.players
                roomOfPlayer_1.players.splice(roomOfPlayer_1.players.indexOf(roomOfPlayer_1.players.find(function (player) { return player == clientOnClients_1; })), 1);
                //* s'il n'y a plus de joueurs dans la room, supprime la room, faire gaffe aux viewer qui sont pas players?
                if (roomOfPlayer_1.players.length <= 0) {
                    var roomInRooms = rooms.find(function (room) { return room == roomOfPlayer_1; });
                    rooms.splice(rooms.indexOf(roomInRooms), 1);
                }
                //*remove players from clients
                clients.splice(clients.indexOf(clientOnClients_1), 1);
                if (roomOfPlayer_1.players.length > 0) {
                    updateRoomClient(clientOnClients_1.room);
                    // updatePlayers(clientOnClients.room);
                }
                updateRoomClient(roomOfPlayer_1.id);
            }
        }
        catch (error) {
            console.error(error);
        }
    };
    function updatePlayers(room) {
        //* function that send all players except controller and viewer
        io["in"](room).emit("updatePlayerResponse", {
            players: getRealPlayers(room)
        });
    }
    function updateCagnottes(room, cagnotte) {
        io["in"](room).emit("updateCagnottesResponse", {
            cagnotte: cagnotte
        });
    }
    function updatesVotes(dataRoom) {
        var room = getTheRoom(dataRoom);
        io["in"](dataRoom).emit("voteResponse", {
            votes: room.votes
        });
    }
    function updatesInRoom(dataRoom) {
        var room = getTheRoom(dataRoom);
        socket.emit("statusGameResponse", {
            isInGame: room.isGameLaunched
        });
    }
    var selectTraitor = function (room) {
        var realPlayers = getRealPlayers(room.id);
        if (realPlayers.length) {
            var randomTraitor_1 = realPlayers[Math.floor(Math.random() * realPlayers.length)];
            // room.traitorId = randomTraitor.idClient;
            room.players.find(function (player) { return player == randomTraitor_1; }).isTraitor = true;
        }
        updateRoomClient(room.id);
    };
    var resetTraitor = function (room) {
        var playerTraitor = room.players.find(function (player) { return player.isTraitor == true; });
        if (playerTraitor) {
            playerTraitor.isTraitor = false;
            // room.traitorId = "";
            room.isGameStarted = false;
            updateRoomClient(room.id);
        }
    };
    var resetModes = function (room) {
        room.justePrixMode.indexJustePrix = 0;
        room.justePrixMode.isShowResponse = false;
        room.questionsMode.indexQuestion = 0;
        room.questionsMode.isShowResponse = false;
        updateRoomClient(room.id);
    };
    //#endregion
    //#region Lobby and game handler
    socket.on("test", function (data) {
        try {
            console.log("test");
            sendError(data.mes, data.room);
            io["in"](data.room).emit("testResponse", {});
            // socket.emit("testResponse", {});
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("disconnect", function (data) {
        console.log("🔴 user disconnect");
        removePlayer();
    });
    socket.on("goBackToLobby", function () {
        console.log("🟠 user go back to lobby");
        removePlayer();
    });
    //when join Lobby
    socket.on("joinRoom", function (data) {
        try {
            console.log("join room ", data.room);
            socket.join(data.room);
            socket.emit("joinRoomResponse", {
                room: data.room
            });
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    //create player
    socket.on("createPlayer", function (data) {
        var _a;
        try {
            if (clients.some(function (client) { return client.idClient === data.idClient; })) {
                return;
            }
            var newPlayer = {
                idServer: socketClientId,
                idClient: data.idClient,
                room: data.room,
                name: data.name,
                avatarName: data.avatar,
                pts: 0,
                isTraitor: false,
                ptsCagnotte: 0,
                hasVoted: false,
                voteConfirmed: false,
                role: ((data.name === "c" || (data.controller && "admin")) && "admin") ||
                    ((data.name === "v" || (data.streamer && "streamer")) &&
                        "streamer") ||
                    (((_a = getTheRoom(data.room)) === null || _a === void 0 ? void 0 : _a.players.filter(function (p) { return p.role === "player"; }).length) >= 4 &&
                        "viewer") ||
                    "player"
            };
            clients.push(newPlayer);
            //# initiate the room if doesn't exist yet
            if (!rooms.find(function (e) { return e.id == data.room; })) {
                console.log("initiate room");
                rooms.push({
                    id: data.room,
                    isGameLaunched: false,
                    isGameStarted: false,
                    players: [],
                    cagnottes: [
                        { name: "innocent", value: 0 },
                        { name: "traitor", value: 0 },
                    ],
                    mode: "",
                    votes: [],
                    isRevealRole: false,
                    revealAnswerQuestion: false,
                    revealVoiceIAAnswer: false,
                    questionsMode: {
                        indexQuestion: 0,
                        isShowResponse: false,
                        questionsList: data.questionsList
                    },
                    justePrixMode: {
                        indexJustePrix: 0,
                        isShowResponse: false,
                        justePrixList: data.justePrixList
                    }
                });
            }
            rooms.find(function (e) { return e.id == data.room; }).players.push(newPlayer);
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("fetchRoom", function (data) {
        try {
            //! check if player is coming directely from link to game
            if (!getTheRoom(data.room) ||
                !getTheRoom(data.room).players.some(function (player) { return player === player; }
                // (player) => player.idServer === socket.client.id
                )) {
                console.log("redirect to lobby or to main menu");
                socket.emit("redirectToMain", {});
            }
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("resetCagnottes", function (data) {
        try {
            var room = getTheRoom(data.room);
            room.cagnottes = [
                { name: "innocent", value: 0 },
                { name: "traitor", value: 0 },
            ];
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("launchGame", function (data) {
        try {
            var room = getTheRoom(data.room);
            room.isGameLaunched = true;
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("startGame", function (data) {
        try {
            var room = getTheRoom(data.room);
            selectTraitor(room);
            room.isGameStarted = true;
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("stopGame", function (data) {
        try {
            var room = getTheRoom(data.room);
            room.isGameStarted = false;
            resetTraitor(room);
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    //#endregion
    //#region Room
    socket.on("modifyPlayerPts", function (data) {
        try {
            var room = getTheRoom(data.room);
            room.players.find(function (player) { return player.idClient === data.player.idClient; }).pts = data.newValue;
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("modifyCagnottes", function (data) {
        try {
            var room = getTheRoom(data.room);
            room.cagnottes.find(function (c) { return c.name === data.cagnotteName; }).value =
                data.newValue;
            updateRoomClient(data.room);
            //!
            // io.in(data.room).emit("globalCagnoteAnimation", {
            //   animationForInnocent: !data.isCagnottesTraitor,
            // });
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("revealRole", function (data) {
        try {
            var room = getTheRoom(data.room);
            room.isRevealRole = data.revealRole;
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("changeMode", function (data) {
        try {
            var room = getTheRoom(data.room);
            resetModes(room);
            room.mode = data.mode;
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    //#endregion
    //#region Questions
    socket.on("questionsAnswerHandler", function (data) {
        try {
            var room = getTheRoom(data.room);
            if (data.isGoodAnswer) {
                room.cagnottes.find(function (c) { return c.name === "innocent"; }).value +=
                    data.numberPts;
            }
            else {
                room.cagnottes.find(function (c) { return c.name === "traitor"; }).value +=
                    data.numberPts;
                room.questionsMode.isShowResponse = true;
            }
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("changeQuestions", function (data) {
        try {
            var room = getTheRoom(data.room);
            room.questionsMode.isShowResponse = false;
            room.questionsMode.indexQuestion = data.indexQuestions;
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    //#endregion
    //#region Juste prix
    socket.on("justePrixAnswerHandler", function (data) {
        try {
            var room = getTheRoom(data.room);
            if (data.isGoodAnswer) {
                room.cagnottes.find(function (c) { return c.name === "innocent"; }).value +=
                    data.numberPts;
            }
            else {
                room.cagnottes.find(function (c) { return c.name === "traitor"; }).value +=
                    data.numberPts;
                room.justePrixMode.isShowResponse = true;
            }
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("changeJustePrix", function (data) {
        try {
            console.log(data.indexJustePrix);
            var room = getTheRoom(data.room);
            room.justePrixMode.isShowResponse = false;
            room.justePrixMode.indexJustePrix = data.indexJustePrix;
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    //#endregion
    //#region Vote
    socket.on("vote", function (data) {
        try {
            console.log("📩 vote received");
            var room = getTheRoom(data.room);
            var voteAlreadyExist = room.votes.some(function (vote) {
                return vote.from.idClient === data.playerWhoVoted.idClient;
            });
            if (voteAlreadyExist) {
                var voteindex = room.votes.findIndex(function (vote) {
                    return vote.from.idClient === data.playerWhoVoted.idClient;
                });
                room.votes[voteindex].to = data.playerVotedFor;
            }
            else {
                console.log("doesn exist");
                room.votes.push({
                    from: data.playerWhoVoted,
                    to: data.playerVotedFor,
                    confirm: false
                });
            }
            updateRoomClient(data.room);
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("confirmVote", function (data) {
        try {
            var room = getTheRoom(data.room);
            var voteToConfirm = room.votes.find(function (vote) { return vote.from.idClient == data.clientId; });
            if (voteToConfirm) {
                voteToConfirm.confirm = true;
                updatesVotes(data.room);
                socket.emit("hasVoteConfirmedResponse", {
                    hasConfirmedVote: voteToConfirm.confirm
                });
            }
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("everyoneConfirmDemand", function (data) {
        try {
            var room = getTheRoom(data.room);
            var players = getRealPlayers(data.room);
            var votes = room.votes;
            // let everyOneHasVoted:boolean
            if (votes.length == players.length) {
                var everyOneHasConfirmedVote = votes.every(function (vote) { return vote.confirm === true; });
                io["in"](data.room).emit("everyOneHaseveryOneHasConfirmedVoteResponse", {
                    everyOneHasConfirmedVote: everyOneHasConfirmedVote
                });
            }
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("demandVotesResult", function (data) {
        try {
            var room = getTheRoom(data.room);
            var votes = room.votes;
            var votesTo = votes.map(function (vote) { return vote.to; });
            var mostVotedPlayer = getMostVotedPlayer(data.room);
            var numberSubWinner = mostVotedPlayer.isTraitor
                ? room.cagnottes.find(function (cagnotte) { return cagnotte.name === "innocent"; }).value
                : room.cagnottes.find(function (cagnotte) { return cagnotte.name === "traitor"; }).value;
            io["in"](data.room).emit("demandVotesResultResponse", {
                mostVotedPlayer: mostVotedPlayer,
                displayVotesResult: true,
                numberSubWinner: numberSubWinner
            });
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    //#endregion
    // socket.on("default", (data: { room: string }) => {
    //   try {
    //     const room: RoomType = getTheRoom(data.room);
    //     updateRoomClient(data.room);
    //   } catch (error) {
    //     console.error(error);
    //     sendError(error, data.room);
    //   }
    // });
});
httpServer.listen(PORT, LOCAL_ADDRESS, function () {
    console.log("\uD83D\uDE80 server is listenings on port ".concat(PORT));
});
