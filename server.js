var PORT = process.env.port || 6602;
var options = {
    cors: {
        origin: [
            "http://judas.r-selwa.space",
            "https://judas.r-selwa.space",
            "http://react-judas.r-selwa.space",
            "https://react-judas.r-selwa.space",
            "http://localhost:8080",
            "http://192.168.1.23:8080",
            "http://localhost:3000",
            "http://192.168.1.23:3000",
        ],
        methods: ["GET", "POST"]
    }
};
var app = require("express")();
var httpServer = require("http").createServer(app);
var io = require("socket.io")(httpServer, options);
var axios = require("axios");
app.get("/", function (req, res) {
    res.send("Hello World! I'm a react server");
});
var controllerName = "c";
var viewerName = "v";
var clients = [];
var rooms = [];
var urlAxios = "https://server-questions-judas.r-selwa.space/api/questionItems/";
function getClientByID(clientId) {
    //* get the id of the client in all the clients
    var client = clients.find(function (client) { return client.id == clientId; });
    return client;
    //   return clientId;
}
function getPlayerByIdClient(idClient, room) {
    var players = getTheRoom(room).players;
    var player = players.find(function (player) { return player.idClient == idClient; });
    return player;
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
io.on("connection", function (socket) {
    var socketClientId = socket.client.id;
    console.log("🟢 new connection", socketClientId);
    axios.get(urlAxios).then(function (res) {
        var allNotes = res.data;
        // console.log(allNotes);
        //   questionsResponse = res.data;
        // const questionsResponse = res.data;
        // setQuestions(questionsResponse);
        socket.emit("getQuestionsResponse", {
            questions: allNotes
        });
    });
    function updateRoom(room) {
        updatePlayers(room);
        updateCagnottes(room, getTheRoom(room).cagnotte);
        updatesInRoom(room);
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
    function updatesInRoom(dataRoom) {
        var room = getTheRoom(dataRoom);
        socket.emit("statusGameResponse", {
            inGame: room.inGame
        });
    }
    socket.on("test", function (data) {
        console.log("test");
        io.to(data.room).emit("testResponse", {});
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
                questionsLaunched: false,
                traitorId: ""
            });
        }
        rooms.find(function (e) { return e.name == data.room; }).players.push(newPlayer);
        updateRoom(data.room);
        // updatePlayers(data.room);
        // updateCagnottes(data.room, getTheRoom(data.room).cagnotte);
    });
    socket.on("revealRole", function (data) {
        socket.emit("revealRoleResponse", {
            viewerRevealRole: !data.viewerRevealRole
        });
    });
    socket.on("modifyCagnottes", function (data) {
        var room = getTheRoom(data.room);
        data.isCagnottesTraitor
            ? (room.cagnotte.traitorValue += data.value)
            : (room.cagnotte.innocentValue += data.value);
        updateCagnottes(data.room, room.cagnotte);
        io.to(data.room).emit("globalCagnoteAnimation", {
            animationForInnocent: !data.isCagnottesTraitor
        });
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
    socket.on("toggleLaunchQuestions", function (data) {
        console.log(data.questionsLaunched);
        var room = getTheRoom(data.room);
        room.questionsLaunched = !data.questionsLaunched;
        io.to(data.room).emit("toggleLaunchQuestionsResponse", {
            launchedQuestions: room.questionsLaunched
        });
    });
    socket.on("arrowQuestions", function (data) {
        console.log(data.nextQuestion);
        console.log(data.numberQuestion);
        console.log(data.questionsLength);
        var newNumberQuestion;
        data.nextQuestion
            ? data.numberQuestion + 1 == data.questionsLength
                ? (newNumberQuestion = data.numberQuestion)
                : (newNumberQuestion = data.numberQuestion + 1)
            : data.numberQuestion == 0
                ? (newNumberQuestion = data.numberQuestion)
                : (newNumberQuestion = data.numberQuestion - 1);
        io.to(data.room).emit("arrowQuestionsResponse", {
            newNumberQuestion: newNumberQuestion
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
        var numberSubWinner = mostVotedPlayer.isTraitor
            ? room.cagnotte.innocentValue
            : room.cagnotte.traitorValue;
        io.to(data.room).emit("demandVotesResultResponse", {
            mostVotedPlayer: mostVotedPlayer,
            displayVotesResult: true,
            numberSubWinner: numberSubWinner
        });
    });
    socket.on("playAudio", function (data) {
        io.to(data.room).emit("playAudioResponse", {
            audio: data.audio
        });
    });
    socket.on("stopAudio", function (data) {
        console.log("stop audio");
        io.to(data.room).emit("stopAudioResponse", {});
    });
    socket.on("volumeAudio", function (data) {
        console.log(data.volume);
        socket.emit("volumeAudioResponse", {
            volume: data.volume
        });
    });
});
httpServer.listen(PORT, function () {
    console.log("\uD83D\uDE80 server is listening on port ".concat(PORT));
});
