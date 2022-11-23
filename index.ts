const PORT = process.env.port || 6602;
const options = {
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
    methods: ["GET", "POST"],
  },
};
const app = require("express")();
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, options);
const axios = require("axios");
app.get("/", (req, res) => {
  res.send("Hello World! I'm a react server");
});
type VoiceIA = { voice: string; text: string; answer: string };
type Player = {
  idServer?: string;
  idClient?: string;
  room: string;
  name: string;
  pts: number;
  isTraitor: boolean;
  ptsCagnotte: number;
  hasVoted: boolean;
  voteConfirmed: boolean;
  isController: boolean;
  isViewer: boolean;
};
type Cagnotte = {
  room: string;
  traitorValue: number;
  innocentValue: number;
};
type Room = {
  name: string;
  isInGame: boolean;
  players: Player[];
  cagnotte: Cagnotte;
  votes: Vote[];
  votesLaunched: boolean;
  questionsLaunched: boolean;
  voiceIALaunched: boolean;
  voiceIAVoicePlayed: boolean;
  justePrixLaunched: boolean;
  revealAnswerQuestion: boolean;
  revealVoiceIAAnswer: boolean;
  traitorId: string;
};
type Vote = {
  from: Player;
  to: Player;
  confirm: boolean;
};
type Question = {
  _id: string;
  question: string;
  response: string;
  numberOfSubs: number;
  __v: number;
};
let clients: Player[] = [];
let rooms: Room[] = [];
// const urlAxios: string = `https://server-questions-judas.r-selwa.space/api/questionItems/`;

function getClientByID(clientId: string): Player {
  //* get the id of the client in all the clients
  const client: Player = clients.find((client) => client.idServer == clientId);
  return client;
  //   return clientId;
}
function getPlayerByIdClient(idClient: string, room: string): Player {
  const players: Player[] = getTheRoom(room).players;
  const player = players.find((player: Player) => player.idClient == idClient);
  return player;
}
function getTheRoom(dataRoom: string): Room {
  return rooms.find((e) => e.name == dataRoom);
}
function getRealPlayers(dataRoom: string): Player[] {
  const room: Room = getTheRoom(dataRoom);
  if (room) {
    return room.players.filter(
      (player: Player) => !player.isController && !player.isViewer
    );
  }
}

function findOcc(arr: any[], key: string) {
  let arr2: any[] = [];

  arr.forEach((x) => {
    // Checking if there is any object in arr2
    // which contains the key value
    if (
      arr2.some((val) => {
        return val[key] == x[key];
      })
    ) {
      // If yes! then increase the occurrence by 1
      arr2.forEach((k) => {
        if (k[key] === x[key]) {
          k["occurrence"]++;
        }
      });
    } else {
      // If not! Then create a new object initialize
      // it with the present iteration key's value and
      // set the occurrence to 1
      let a = {};
      a[key] = x[key];
      a["occurrence"] = 1;
      arr2.push(a);
    }
  });

  return arr2;
}
function getMostVotedPlayer(dataRoom: string): Player {
  //# si c'est 1 partout faire en sorte que le traitre ne soit pas designé comme le mostVoted, ici c'est le dernier player qui a été voté soit le last dans room.votes
  const selectInnocent: boolean = true;
  const room = getTheRoom(dataRoom);
  const votes: Vote[] = room.votes;
  const votesTo: Player[] = votes.map((vote: Vote) => vote.to);
  const arr2: { idClient: string; occurrence: number }[] = findOcc(
    votesTo,
    "idClient"
  );
  const maxOccurences: number = Math.max(...arr2.map((o) => o.occurrence));
  const result: { idClient: string; occurrence: number }[] = arr2.filter(
    (arr: { idClient: string; occurrence: number }) => {
      return arr.occurrence == maxOccurences;
    }
  );
  const mostVotedPlayer: Player =
    result.length > 1
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

io.on("connection", (socket) => {
  const socketClientId = socket.client.id;
  console.log("🟢 new connection", socketClientId);
  const updateRoomClient = (roomId: string) => {
    io.in(roomId).emit("updateRoom", {
      room: getTheRoom(roomId),
    });
  };
  const removePlayer = () => {
    const clientOnClients: Player = getClientByID(socketClientId);
    //* if clients exists in clients
    if (clientOnClients) {
      //* find the room of the player
      const roomOfPlayer: Room = getTheRoom(clientOnClients.room);

      //* trouve le joueur dans room.player qui correspond à l'clientOnClients (qui est notre joueur deconnecté by id), puis le supprime de room.players
      roomOfPlayer.players.splice(
        roomOfPlayer.players.indexOf(
          roomOfPlayer.players.find(
            (player: Player) => player == clientOnClients
          )
        ),
        1
      );
      const playerWasTraitor: boolean =
        roomOfPlayer.traitorId == clientOnClients.idClient;
      if (playerWasTraitor) {
        roomOfPlayer.traitorId = "";
      }
      //* s'il n'y a plus de joueurs dans la room, supprime la room, faire gaffe aux viewer qui sont pas players?
      if (roomOfPlayer.players.length <= 0) {
        const roomInRooms: Room = rooms.find(
          (room: Room) => room == roomOfPlayer
        );
        rooms.splice(rooms.indexOf(roomInRooms), 1);
      }
      //*remove players from clients
      clients.splice(clients.indexOf(clientOnClients), 1);
      if (roomOfPlayer.players.length > 0) {
        updateRoomClient(clientOnClients.room);
        // updatePlayers(clientOnClients.room);
      }
    }
  };
  function updatePlayers(room: string): void {
    //* function that send all players except controller and viewer
    io.in(room).emit("updatePlayerResponse", {
      players: getRealPlayers(room),
    });
  }
  function updateCagnottes(room: string, cagnotte: Cagnotte): void {
    io.in(room).emit("updateCagnottesResponse", {
      cagnotte: cagnotte,
      // players: getAllClientsWithSameRoom(dataRoom),
    });
  }
  function updatesVotes(dataRoom: string): void {
    const room: Room = getTheRoom(dataRoom);

    io.in(dataRoom).emit("voteResponse", {
      votes: room.votes,
    });
  }
  function updatesInRoom(dataRoom: string): void {
    const room: Room = getTheRoom(dataRoom);
    socket.emit("statusGameResponse", {
      isInGame: room.isInGame,
    });
  }

  socket.on("test", (data: { room: string }) => {
    console.log("test");
    io.in(data.room).emit("testResponse", {});
    // socket.emit("testResponse", {});
  });

  socket.on("disconnect", (data: any) => {
    console.log(data);

    console.log("🔴 user disconnect");
    removePlayer();
  });

  socket.on("goBackToLobby", () => {
    console.log("🟠 user go back to lobby");
    removePlayer();
  });

  socket.on("joinRoom", (data: { room: string }) => {
    console.log("join room ", data.room);

    socket.join(data.room);
    socket.emit("joinRoomResponse", {
      room: data.room,
    });
    updateRoomClient(data.room);
  });
  socket.on(
    "joinName",
    (data: {
      room: string;
      name: string;
      idClient: string;
      controller: boolean;
      viewer: boolean;
    }) => {
      console.log(clients);
      if (clients.some((client) => client.idClient === data.idClient)) {
        return;
      }

      const newPlayer: Player = {
        idServer: socketClientId,
        idClient: data.idClient,
        room: data.room,
        name: data.name,
        pts: 0,
        isTraitor: false,
        ptsCagnotte: 0,
        hasVoted: false,
        voteConfirmed: false,
        isController: data.controller,
        isViewer: data.viewer,
      };
      clients.push(newPlayer);
      socket.emit("joinNameResponse", {
        name: data.name,
        room: data.room,
        player: newPlayer,
      });
      data.controller && socket.emit("joinControllerResponse", {});
      data.viewer && socket.emit("joinViewerResponse", {});
      !data.controller && !data.viewer && socket.emit("joinPlayerResponse", {});

      //# initiate the room if doesn't exist yet
      if (rooms.find((e) => e.name == data.room) == undefined) {
        rooms.push({
          name: data.room,
          isInGame: false,
          players: [],
          cagnotte: {
            room: data.room,
            traitorValue: 0,
            innocentValue: 0,
          },
          votes: [],
          votesLaunched: false,
          questionsLaunched: false,
          traitorId: "",
          revealAnswerQuestion: false,
          voiceIALaunched: false,
          justePrixLaunched: false,
          voiceIAVoicePlayed: false,
          revealVoiceIAAnswer: false,
        });
      }
      rooms.find((e) => e.name == data.room).players.push(newPlayer);
      updateRoomClient(data.room);
    }
  );
  socket.on("fetchRoom", (data: { room: string }) => {
    console.log(getTheRoom(data.room));
    console.log(socket.client.id);

    //! check if player is coming directely from link to game
    if (
      !getTheRoom(data.room) ||
      !getTheRoom(data.room)!.players.some(
        (player) => player.idServer === socket.client.id
      )
    ) {
      console.log("redirect to lobby or to main menu");
      socket.emit("redirectToMain", {});
    }

    updateRoomClient(data.room);
  });
  socket.on("revealRole", (data: { viewerRevealRole: boolean }) => {
    socket.emit("revealRoleResponse", {
      viewerRevealRole: !data.viewerRevealRole,
    });
  });
  socket.on(
    "modifyCagnottes",
    (data: { room: string; value: number; isCagnottesTraitor: boolean }) => {
      const room: Room = getTheRoom(data.room);
      data.isCagnottesTraitor
        ? (room.cagnotte.traitorValue += data.value)
        : (room.cagnotte.innocentValue += data.value);
      updateCagnottes(data.room, room.cagnotte);
      io.in(data.room).emit("globalCagnoteAnimation", {
        animationForInnocent: !data.isCagnottesTraitor,
      });
    }
  );
  socket.on(
    "resetCagnottes",
    (data: { room: string; isCagnottesTraitor: boolean }) => {
      const room: Room = getTheRoom(data.room);
      console.log(room.cagnotte);
      data.isCagnottesTraitor
        ? (room.cagnotte.traitorValue = 0)
        : (room.cagnotte.innocentValue = 0);
      updateCagnottes(data.room, room.cagnotte);
    }
  );
  socket.on(
    "modifyPlayerPts",
    (data: { room: string; playerId: string; newValue: number }) => {
      const playerIndex = clients.findIndex((e) => e.idServer == data.playerId);
      if (clients[playerIndex]) {
        if (clients[playerIndex].pts == 0 && data.newValue == -1) {
          clients[playerIndex].pts = clients[playerIndex].pts;
        } else {
          clients[playerIndex].pts = clients[playerIndex].pts + data.newValue;
        }
      }
      updatePlayers(data.room);
    }
  );
  //# start game
  socket.on("startGame", (data: { room: string }) => {
    const room: Room = getTheRoom(data.room);
    const realPlayers: Player[] = getRealPlayers(data.room);
    if (realPlayers.length > 0) {
      const randomTraitor: Player =
        realPlayers[Math.floor(Math.random() * realPlayers.length)];
      room.traitorId = randomTraitor.idClient;
      room.players.find((player) => player == randomTraitor).isTraitor = true;
    }
    room.isInGame = true;
    updateRoomClient(data.room);
  });
  //# stop game
  socket.on("stopGame", (data: { room: string }) => {
    const room: Room = getTheRoom(data.room);
    const playerTraitor: Player = room.players.find(
      (player: Player) => player.isTraitor == true
    );
    if (playerTraitor) {
      playerTraitor.isTraitor = false;
      room.traitorId = "";
      room.isInGame = false;
      updateRoomClient(data.room);
    }
  });
  socket.on("toggleGameStatus", (data: { room: string; isInGame: boolean }) => {
    io.in(data.room).emit("statusGameResponse", {
      isInGame: !data.isInGame,
    });
    console.log(!data.isInGame ? "🟩 now in game" : "🟥 no game");
  });
  socket.on("launchVote", (data: { room: string }) => {
    console.log("✉️ votes initiate");
    const room: Room = getTheRoom(data.room);
    room.votesLaunched = true;
    io.in(data.room).emit("launchVoteResponse", {
      votesLaunched: room.votesLaunched,
    });
    io.in(data.room).emit("sendPLayersForVOtes", {
      playersForVotes: getRealPlayers(data.room),
    });
  });
  socket.on("stopVote", (data: { room: string }) => {
    console.log("❌ votes stop");
    const room: Room = getTheRoom(data.room);
    room.votesLaunched = false;
    room.votes = [];
    updatesVotes(data.room);
    room.players.forEach((player: Player) => {
      player.hasVoted = false;
      player.voteConfirmed = false;
    });
    updatePlayers(data.room);
    io.in(data.room).emit("stopVoteResponse", {
      votesLaunched: room.votesLaunched,
    });
    io.in(data.room).emit("reinitiateVoteResposne", {
      hasVoted: false,
      voteConfirmed: false,
    });
    io.in(data.room).emit("everyOneHaseveryOneHasConfirmedVoteResponse", {
      everyOneHasConfirmedVote: false,
    });
  });
  socket.on(
    "toggleLaunchQuestions",
    (data: { room: string; questionsLaunched: boolean }) => {
      console.log(data.questionsLaunched);
      const room: Room = getTheRoom(data.room);
      room.questionsLaunched = !data.questionsLaunched;
      io.in(data.room).emit("toggleLaunchQuestionsResponse", {
        launchedQuestions: room.questionsLaunched,
      });
    }
  );
  socket.on(
    "toggleLauncheVoiceIa",
    (data: { room: string; voiceIALaunched: boolean }) => {
      console.log("toggle voice IA");
      const room: Room = getTheRoom(data.room);
      room.voiceIALaunched = !data.voiceIALaunched;
      io.in(data.room).emit("toggleLauncheVoiceIaResponse", {
        voiceIALaunched: room.voiceIALaunched,
      });
    }
  );
  socket.on(
    "toggleVoiceIAVoicePlayed",
    (data: { room: string; voiceIAVoicePlayed: boolean }) => {
      console.log("toggle play voice IA");
      const room: Room = getTheRoom(data.room);
      room.voiceIAVoicePlayed = !data.voiceIAVoicePlayed;
      io.in(data.room).emit("toggleVoiceIAVoicePlayedResponse", {
        voiceIAVoicePlayed: room.voiceIAVoicePlayed,
      });
    }
  );
  socket.on(
    "selectVoiceIA",
    (data: { room: string; selectedVoiceIA: VoiceIA }) => {
      console.log(data.selectedVoiceIA);
      io.in(data.room).emit("selectVoiceIAResponse", {
        selectedVoiceIA: data.selectedVoiceIA,
      });
      //?
      io.in(data.room).emit("selectVoiceIAResponseAnimation", {});
    }
  );
  socket.on("voiceIAPanelAnimation", (data: { room: string }) => {
    io.in(data.room).emit("voiceIAPanelAnimationZoomOutResponse", {});
  });
  socket.on(
    "revealVoiceIAAnswer",
    (data: { room: string; revealVoiceIAAnswer: boolean }) => {
      const room = getTheRoom(data.room);
      room.revealVoiceIAAnswer = data.revealVoiceIAAnswer;
      io.in(data.room).emit("revealVoiceIAAnswerResponse", {
        revealVoiceIAAnswer: room.revealVoiceIAAnswer,
      });
    }
  );
  socket.on(
    "answersVoiceIAAnswer",
    (data: { room: string; goodAnswer: boolean }) => {
      io.in(data.room).emit("answersVoiceIAAnswerResponse", {
        goodAnswer: data.goodAnswer,
      });
      io.in(data.room).emit("answersVoiceIAAnswerResponseAnimation", {
        goodAnswer: data.goodAnswer,
      });
    }
  );

  socket.on("unselectVoiceIA", (data: { room: string }) => {
    io.in(data.room).emit("unselectVoiceIAResponse", {
      selectedVoiceIA: { voice: "", text: "", anwser: "" },
    });
  });
  socket.on(
    "arrowQuestions",
    (data: {
      room: string;
      nextQuestion: boolean;
      questionsLength: number;
      numberQuestion: number;
    }) => {
      console.log(data.nextQuestion);
      console.log(data.numberQuestion);
      console.log(data.questionsLength);
      let newNumberQuestion: number;
      data.nextQuestion
        ? data.numberQuestion + 1 == data.questionsLength
          ? (newNumberQuestion = data.numberQuestion)
          : (newNumberQuestion = data.numberQuestion + 1)
        : data.numberQuestion == 0
        ? (newNumberQuestion = data.numberQuestion)
        : (newNumberQuestion = data.numberQuestion - 1);
      io.in(data.room).emit("arrowQuestionsResponse", {
        newNumberQuestion: newNumberQuestion,
      });
    }
  );
  socket.on(
    "vote",
    (data: { room: string; playerVotedFor: Player; clientId: string }) => {
      console.log("📩 vote received");
      const room: Room = getTheRoom(data.room);
      const realPlayers: Player[] = getRealPlayers(data.room);
      if (realPlayers) {
        const from: Player = realPlayers.find(
          (player: Player) => player.idClient == data.clientId
        );
        const to: Player = data.playerVotedFor;
        const voteAlreadyExist: Vote = room.votes.find(
          (vote: Vote) => vote.from == from
        );
        if (!voteAlreadyExist) {
          console.log("doesn exist");
          room.votes.push({ from: from, to: to, confirm: false });
        } else {
          const voteindex: number = room.votes.findIndex(
            (vote: Vote) => vote.from == from
          );
          room.votes[voteindex].to = to;
        }
        from.hasVoted = true;
        updatesVotes(data.room);
        socket.emit("hasVotedResponse", {
          hasVoted: from.hasVoted,
        });
      }
    }
  );
  socket.on("confirmVote", (data: { room: string; clientId: string }) => {
    const room = getTheRoom(data.room);
    const voteToConfirm: Vote = room.votes.find(
      (vote: Vote) => vote.from.idClient == data.clientId
    );
    if (voteToConfirm) {
      voteToConfirm.confirm = true;
      updatesVotes(data.room);
      socket.emit("hasVoteConfirmedResponse", {
        hasConfirmedVote: voteToConfirm.confirm,
      });
    }
  });
  socket.on("everyoneConfirmDemand", (data: { room: string }) => {
    const room: Room = getTheRoom(data.room);
    const players: Player[] = getRealPlayers(data.room);
    const votes: Vote[] = room.votes;
    // let everyOneHasVoted:boolean
    if (votes.length == players.length) {
      const everyOneHasConfirmedVote: boolean = votes.every(
        (vote: Vote) => vote.confirm === true
      );
      io.in(data.room).emit("everyOneHaseveryOneHasConfirmedVoteResponse", {
        everyOneHasConfirmedVote: everyOneHasConfirmedVote,
      });
    }
  });
  socket.on("demandVotesResult", (data: { room: string }) => {
    const room: Room = getTheRoom(data.room);
    const votes: Vote[] = room.votes;
    const votesTo: Player[] = votes.map((vote: Vote) => vote.to);
    const mostVotedPlayer: Player = getMostVotedPlayer(data.room);
    const numberSubWinner: number = mostVotedPlayer.isTraitor
      ? room.cagnotte.innocentValue
      : room.cagnotte.traitorValue;
    io.in(data.room).emit("demandVotesResultResponse", {
      mostVotedPlayer: mostVotedPlayer,
      displayVotesResult: true,
      numberSubWinner: numberSubWinner,
    });
  });
  socket.on("playAudio", (data: { room: string; audio: string }) => {
    // socket.on("playAudio", (data: { room: string; audio: HTMLAudioElement }) => {
    io.in(data.room).emit("playAudioResponse", {
      audio: data.audio,
    });
  });
  socket.on("stopAudio", (data: { room: string }) => {
    console.log("stop audio");
    io.in(data.room).emit("stopAudioResponse", {});
  });
  socket.on("volumeAudio", (data: { room: string; volume: number }) => {
    console.log(data.volume);
    socket.emit("volumeAudioResponse", {
      volume: data.volume,
    });
  });
  socket.on(
    "toggleRevealAnswer",
    (data: { room: string; revealAnswer: boolean }) => {
      io.in(data.room).emit("toggleRevealAnswerResponse", {
        revealAnswer: !data.revealAnswer,
      });
    }
  );
});

httpServer.listen(PORT, () => {
  console.log(`🚀 server is listening on port ${PORT}`);
});