"use strict";
exports.__esModule = true;
exports.getMostVotedPlayer = exports.findOcc = exports.getRealPlayers = exports.getTheRoom = exports.getPlayerByIdClient = exports.getClientByID = void 0;
//#region socket
var PORT = process.env.port || 6602;
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
    res.send("Hello World! I'm a react server" + PORT);
});
//#endregion
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
        return room.players.filter(function (player) { return !player.isController && !player.isViewer; });
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
var clients = [];
var rooms = [];
io.on("connection", function (socket) {
    // const socketClientId = socket.client.id;
    console.log("🟢 new connection", "");
    // console.log("🟢 new connection", socketClientId);
    //#region Functions
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
            // const clientOnClients: Player = getClientByID(socketClientId);
            var clientOnClients_1 = getClientByID("");
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
    //#endregion
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
    socket.on("createPlayer", function (data) {
        try {
            if (clients.some(function (client) { return client.idClient === data.idClient; })) {
                return;
            }
            var newPlayer = {
                // idServer: socketClientId,
                idClient: data.idClient,
                room: data.room,
                name: data.name,
                pts: 0,
                isTraitor: false,
                ptsCagnotte: 0,
                hasVoted: false,
                voteConfirmed: false,
                //! name == "c" for easy debug
                // isController:  data.controller,
                isController: data.name === "c" || data.controller,
                //! name == "v" for easy debug
                isViewer: data.name === "v" || data.viewer
            };
            clients.push(newPlayer);
            socket.emit("joinNameResponse", {
                name: data.name,
                room: data.room,
                player: newPlayer
            });
            data.controller && socket.emit("joinControllerResponse", {});
            data.viewer && socket.emit("joinViewerResponse", {});
            !data.controller &&
                !data.viewer &&
                socket.emit("joinPlayerResponse", {});
            //# initiate the room if doesn't exist yet
            if (!rooms.find(function (e) { return e.id == data.room; })) {
                rooms.push({
                    id: data.room,
                    isGameLaunched: false,
                    players: [],
                    cagnottes: [
                        { name: "innocent", value: 0 },
                        { name: "traitor", value: 0 },
                    ],
                    votes: [],
                    votesLaunched: false,
                    questionsLaunched: false,
                    isRevealRole: false,
                    // traitorId: "",
                    revealAnswerQuestion: false,
                    voiceIALaunched: false,
                    justePrixLaunched: false,
                    voiceIAVoicePlayed: false,
                    revealVoiceIAAnswer: false
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
    socket.on("revealRole", function (data) {
        try {
            io["in"](data.room).emit("revealRoleResponse", {
                viewerRevealRole: !data.viewerRevealRole
            });
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
    socket.on("startGame", function (data) {
        try {
            var room = getTheRoom(data.room);
            var realPlayers = getRealPlayers(data.room);
            if (realPlayers.length > 0) {
                var randomTraitor_1 = realPlayers[Math.floor(Math.random() * realPlayers.length)];
                // room.traitorId = randomTraitor.idClient;
                room.players.find(function (player) { return player == randomTraitor_1; }).isTraitor = true;
            }
            room.isGameLaunched = true;
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
            var playerTraitor = room.players.find(function (player) { return player.isTraitor == true; });
            if (playerTraitor) {
                playerTraitor.isTraitor = false;
                // room.traitorId = "";
                room.isGameLaunched = false;
                updateRoomClient(data.room);
            }
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("toggleGameStatus", function (data) {
        try {
            io["in"](data.room).emit("statusGameResponse", {
                isInGame: !data.isInGame
            });
            console.log(!data.isInGame ? "🟩 now in game" : "🟥 no game");
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("launchVote", function (data) {
        try {
            console.log("✉️ votes initiate");
            var room = getTheRoom(data.room);
            room.votesLaunched = true;
            io["in"](data.room).emit("launchVoteResponse", {
                votesLaunched: room.votesLaunched
            });
            io["in"](data.room).emit("sendPLayersForVOtes", {
                playersForVotes: getRealPlayers(data.room)
            });
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("stopVote", function (data) {
        try {
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
            io["in"](data.room).emit("stopVoteResponse", {
                votesLaunched: room.votesLaunched
            });
            io["in"](data.room).emit("reinitiateVoteResposne", {
                hasVoted: false,
                voteConfirmed: false
            });
            io["in"](data.room).emit("everyOneHaseveryOneHasConfirmedVoteResponse", {
                everyOneHasConfirmedVote: false
            });
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("toggleLaunchQuestions", function (data) {
        try {
            console.log(data.questionsLaunched);
            var room = getTheRoom(data.room);
            room.questionsLaunched = !data.questionsLaunched;
            io["in"](data.room).emit("toggleLaunchQuestionsResponse", {
                launchedQuestions: room.questionsLaunched
            });
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("toggleLauncheVoiceIa", function (data) {
        try {
            console.log("toggle voice IA");
            var room = getTheRoom(data.room);
            room.voiceIALaunched = !data.voiceIALaunched;
            io["in"](data.room).emit("toggleLauncheVoiceIaResponse", {
                voiceIALaunched: room.voiceIALaunched
            });
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("toggleVoiceIAVoicePlayed", function (data) {
        try {
            console.log("toggle play voice IA");
            var room = getTheRoom(data.room);
            room.voiceIAVoicePlayed = !data.voiceIAVoicePlayed;
            io["in"](data.room).emit("toggleVoiceIAVoicePlayedResponse", {
                voiceIAVoicePlayed: room.voiceIAVoicePlayed
            });
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("selectVoiceIA", function (data) {
        try {
            console.log(data.selectedVoiceIA);
            io["in"](data.room).emit("selectVoiceIAResponse", {
                selectedVoiceIA: data.selectedVoiceIA
            });
            //?
            io["in"](data.room).emit("selectVoiceIAResponseAnimation", {});
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("voiceIAPanelAnimation", function (data) {
        try {
            io["in"](data.room).emit("voiceIAPanelAnimationZoomOutResponse", {});
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("revealVoiceIAAnswer", function (data) {
        try {
            var room = getTheRoom(data.room);
            room.revealVoiceIAAnswer = data.revealVoiceIAAnswer;
            io["in"](data.room).emit("revealVoiceIAAnswerResponse", {
                revealVoiceIAAnswer: room.revealVoiceIAAnswer
            });
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("answersVoiceIAAnswer", function (data) {
        try {
            io["in"](data.room).emit("answersVoiceIAAnswerResponse", {
                goodAnswer: data.goodAnswer
            });
            io["in"](data.room).emit("answersVoiceIAAnswerResponseAnimation", {
                goodAnswer: data.goodAnswer
            });
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("unselectVoiceIA", function (data) {
        try {
            io["in"](data.room).emit("unselectVoiceIAResponse", {
                selectedVoiceIA: { voice: "", text: "", anwser: "" }
            });
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("arrowQuestions", function (data) {
        try {
            console.log(data.nextQuestion);
            console.log(data.numberQuestion);
            console.log(data.questionsLength);
            var newNumberQuestion = void 0;
            data.nextQuestion
                ? data.numberQuestion + 1 == data.questionsLength
                    ? (newNumberQuestion = data.numberQuestion)
                    : (newNumberQuestion = data.numberQuestion + 1)
                : data.numberQuestion == 0
                    ? (newNumberQuestion = data.numberQuestion)
                    : (newNumberQuestion = data.numberQuestion - 1);
            io["in"](data.room).emit("arrowQuestionsResponse", {
                newNumberQuestion: newNumberQuestion
            });
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("vote", function (data) {
        try {
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
    socket.on("playAudio", function (data) {
        try {
            // socket.on("playAudio", (data: { room: string; audio: HTMLAudioElement }) => {
            io["in"](data.room).emit("playAudioResponse", {
                audio: data.audio
            });
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("stopAudio", function (data) {
        try {
            console.log("stop audio");
            io["in"](data.room).emit("stopAudioResponse", {});
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("volumeAudio", function (data) {
        try {
            console.log(data.volume);
            socket.emit("volumeAudioResponse", {
                volume: data.volume
            });
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
    socket.on("toggleRevealAnswer", function (data) {
        try {
            io["in"](data.room).emit("toggleRevealAnswerResponse", {
                revealAnswer: !data.revealAnswer
            });
        }
        catch (error) {
            console.error(error);
            sendError(error, data.room);
        }
    });
});
// httpServer.listen(
//   process.env.ALWAYSDATA_HTTPD_PORT,
//   process.env.ALWAYSDATA_HTTPD_IP,
//   () => {
//     console.log(
//       `🚀 server is listening on port ${process.env.ALWAYSDATA_HTTPD_PORT}`
//     );
//   }
// );
httpServer.listen(PORT, function () {
    console.log("\uD83D\uDE80 server is listenings on port ".concat(PORT));
});
