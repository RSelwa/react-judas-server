import { Cagnotte, Player, Room, VoiceIA, Vote } from "./Type";
import { createServer } from "http";
import { Server } from "socket.io";

//#region socket
const PORT = process.env.port || 6602;

const options = {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
};
const app = require("express")();
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, options);
// const httpServer = createServer();
// const io = new Server(httpServer, options);

app.get("/", (req, res) => {
  res.send("Hello World! I'm a react server" + PORT);
});
//#endregion

export function getClientByID(clientId: string): Player {
  //* get the id of the client in all the clients
  const client: Player = clients.find((client) => client.idServer == clientId);
  return client;
  //   return clientId;
}
export function getPlayerByIdClient(idClient: string, room: string): Player {
  const players: Player[] = getTheRoom(room).players;
  const player = players.find((player: Player) => player.idClient == idClient);
  return player;
}
export function getTheRoom(dataRoom: string): Room {
  return rooms.find((e) => e.id == dataRoom);
}
export function getRealPlayers(dataRoom: string): Player[] {
  const room: Room = getTheRoom(dataRoom);
  if (room) {
    return room.players.filter(
      (player: Player) => !player.isController && !player.isViewer
    );
  }
}

export function findOcc(arr: any[], key: string) {
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
export function getMostVotedPlayer(dataRoom: string): Player {
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

let clients: Player[] = [];
let rooms: Room[] = [];

io.on("connection", (socket) => {
  // const socketClientId = socket.client.id;
  console.log("🟢 new connection", "");
  // console.log("🟢 new connection", socketClientId);

  //#region Functions
  const sendError = (errorMessage: string, roomId: string) => {
    io.in(roomId).emit("error", {
      message: errorMessage,
    });
  };

  const updateRoomClient = (roomId: string) => {
    io.in(roomId).emit("updateRoom", {
      room: getTheRoom(roomId),
    });
  };

  const removePlayer = () => {
    try {
      // const clientOnClients: Player = getClientByID(socketClientId);
      const clientOnClients: Player = getClientByID("");
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
        updateRoomClient(roomOfPlayer.id);
      }
    } catch (error) {
      console.error(error);
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
      isInGame: room.isGameLaunched,
    });
  }
  //#endregion

  socket.on("test", (data: { room: string; mes: string }) => {
    try {
      console.log("test");
      sendError(data.mes, data.room);
      io.in(data.room).emit("testResponse", {});
      // socket.emit("testResponse", {});
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });

  socket.on("disconnect", (data: any) => {
    console.log("🔴 user disconnect");
    removePlayer();
  });

  socket.on("goBackToLobby", () => {
    console.log("🟠 user go back to lobby");
    removePlayer();
  });

  socket.on("joinRoom", (data: { room: string }) => {
    try {
      console.log("join room ", data.room);

      socket.join(data.room);
      socket.emit("joinRoomResponse", {
        room: data.room,
      });
      updateRoomClient(data.room);
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });

  socket.on(
    "createPlayer",
    (data: {
      room: string;
      name: string;
      idClient: string;
      controller: boolean;
      viewer: boolean;
    }) => {
      try {
        if (clients.some((client) => client.idClient === data.idClient)) {
          return;
        }

        const newPlayer: Player = {
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
          isViewer: data.name === "v" || data.viewer,
          // isViewer: data.viewer,
        };
        clients.push(newPlayer);
        socket.emit("joinNameResponse", {
          name: data.name,
          room: data.room,
          player: newPlayer,
        });
        data.controller && socket.emit("joinControllerResponse", {});
        data.viewer && socket.emit("joinViewerResponse", {});
        !data.controller &&
          !data.viewer &&
          socket.emit("joinPlayerResponse", {});

        //# initiate the room if doesn't exist yet
        if (!rooms.find((e) => e.id == data.room)) {
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
            revealVoiceIAAnswer: false,
          });
        }
        rooms.find((e) => e.id == data.room).players.push(newPlayer);
        updateRoomClient(data.room);
      } catch (error) {
        console.error(error);
        sendError(error, data.room);
      }
    }
  );
  socket.on("fetchRoom", (data: { room: string }) => {
    try {
      //! check if player is coming directely from link to game
      if (
        !getTheRoom(data.room) ||
        !getTheRoom(data.room)!.players.some(
          (player) => player === player
          // (player) => player.idServer === socket.client.id
        )
      ) {
        console.log("redirect to lobby or to main menu");
        socket.emit("redirectToMain", {});
      }

      updateRoomClient(data.room);
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });

  socket.on(
    "revealRole",
    (data: { room: string; viewerRevealRole: boolean }) => {
      try {
        io.in(data.room).emit("revealRoleResponse", {
          viewerRevealRole: !data.viewerRevealRole,
        });
      } catch (error) {
        console.error(error);
        sendError(error, data.room);
      }
    }
  );

  socket.on(
    "modifyCagnottes",
    (data: {
      room: string;
      newValue: number;
      cagnotteName: "innocent" | "traitor";
    }) => {
      try {
        const room: Room = getTheRoom(data.room);
        room.cagnottes.find((c) => c.name === data.cagnotteName).value =
          data.newValue;
        updateRoomClient(data.room);

        //!
        // io.in(data.room).emit("globalCagnoteAnimation", {
        //   animationForInnocent: !data.isCagnottesTraitor,
        // });
      } catch (error) {
        console.error(error);
        sendError(error, data.room);
      }
    }
  );

  socket.on("resetCagnottes", (data: { room: string }) => {
    try {
      const room: Room = getTheRoom(data.room);
      room.cagnottes = [
        { name: "innocent", value: 0 },
        { name: "traitor", value: 0 },
      ];
      updateRoomClient(data.room);
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });

  socket.on(
    "modifyPlayerPts",
    (data: { room: string; player: Player; newValue: number }) => {
      try {
        const room: Room = getTheRoom(data.room);

        room.players.find(
          (player) => player.idClient === data.player.idClient
        ).pts = data.newValue;
        updateRoomClient(data.room);
      } catch (error) {
        console.error(error);
        sendError(error, data.room);
      }
    }
  );

  socket.on("startGame", (data: { room: string }) => {
    try {
      const room: Room = getTheRoom(data.room);
      const realPlayers: Player[] = getRealPlayers(data.room);
      if (realPlayers.length > 0) {
        const randomTraitor: Player =
          realPlayers[Math.floor(Math.random() * realPlayers.length)];
        // room.traitorId = randomTraitor.idClient;
        room.players.find((player) => player == randomTraitor).isTraitor = true;
      }
      room.isGameLaunched = true;
      updateRoomClient(data.room);
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });

  socket.on("stopGame", (data: { room: string }) => {
    try {
      const room: Room = getTheRoom(data.room);
      const playerTraitor: Player = room.players.find(
        (player: Player) => player.isTraitor == true
      );
      if (playerTraitor) {
        playerTraitor.isTraitor = false;
        // room.traitorId = "";
        room.isGameLaunched = false;
        updateRoomClient(data.room);
      }
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });

  socket.on("toggleGameStatus", (data: { room: string; isInGame: boolean }) => {
    try {
      io.in(data.room).emit("statusGameResponse", {
        isInGame: !data.isInGame,
      });
      console.log(!data.isInGame ? "🟩 now in game" : "🟥 no game");
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });

  socket.on("launchVote", (data: { room: string }) => {
    try {
      console.log("✉️ votes initiate");
      const room: Room = getTheRoom(data.room);
      room.votesLaunched = true;
      io.in(data.room).emit("launchVoteResponse", {
        votesLaunched: room.votesLaunched,
      });
      io.in(data.room).emit("sendPLayersForVOtes", {
        playersForVotes: getRealPlayers(data.room),
      });
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });

  socket.on("stopVote", (data: { room: string }) => {
    try {
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
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });

  socket.on(
    "toggleLaunchQuestions",
    (data: { room: string; questionsLaunched: boolean }) => {
      try {
        console.log(data.questionsLaunched);
        const room: Room = getTheRoom(data.room);
        room.questionsLaunched = !data.questionsLaunched;
        io.in(data.room).emit("toggleLaunchQuestionsResponse", {
          launchedQuestions: room.questionsLaunched,
        });
      } catch (error) {
        console.error(error);
        sendError(error, data.room);
      }
    }
  );

  socket.on(
    "toggleLauncheVoiceIa",
    (data: { room: string; voiceIALaunched: boolean }) => {
      try {
        console.log("toggle voice IA");
        const room: Room = getTheRoom(data.room);
        room.voiceIALaunched = !data.voiceIALaunched;
        io.in(data.room).emit("toggleLauncheVoiceIaResponse", {
          voiceIALaunched: room.voiceIALaunched,
        });
      } catch (error) {
        console.error(error);
        sendError(error, data.room);
      }
    }
  );

  socket.on(
    "toggleVoiceIAVoicePlayed",
    (data: { room: string; voiceIAVoicePlayed: boolean }) => {
      try {
        console.log("toggle play voice IA");
        const room: Room = getTheRoom(data.room);
        room.voiceIAVoicePlayed = !data.voiceIAVoicePlayed;
        io.in(data.room).emit("toggleVoiceIAVoicePlayedResponse", {
          voiceIAVoicePlayed: room.voiceIAVoicePlayed,
        });
      } catch (error) {
        console.error(error);
        sendError(error, data.room);
      }
    }
  );

  socket.on(
    "selectVoiceIA",
    (data: { room: string; selectedVoiceIA: VoiceIA }) => {
      try {
        console.log(data.selectedVoiceIA);
        io.in(data.room).emit("selectVoiceIAResponse", {
          selectedVoiceIA: data.selectedVoiceIA,
        });
        //?
        io.in(data.room).emit("selectVoiceIAResponseAnimation", {});
      } catch (error) {
        console.error(error);
        sendError(error, data.room);
      }
    }
  );

  socket.on("voiceIAPanelAnimation", (data: { room: string }) => {
    try {
      io.in(data.room).emit("voiceIAPanelAnimationZoomOutResponse", {});
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });

  socket.on(
    "revealVoiceIAAnswer",
    (data: { room: string; revealVoiceIAAnswer: boolean }) => {
      try {
        const room = getTheRoom(data.room);
        room.revealVoiceIAAnswer = data.revealVoiceIAAnswer;
        io.in(data.room).emit("revealVoiceIAAnswerResponse", {
          revealVoiceIAAnswer: room.revealVoiceIAAnswer,
        });
      } catch (error) {
        console.error(error);
        sendError(error, data.room);
      }
    }
  );

  socket.on(
    "answersVoiceIAAnswer",
    (data: { room: string; goodAnswer: boolean }) => {
      try {
        io.in(data.room).emit("answersVoiceIAAnswerResponse", {
          goodAnswer: data.goodAnswer,
        });
        io.in(data.room).emit("answersVoiceIAAnswerResponseAnimation", {
          goodAnswer: data.goodAnswer,
        });
      } catch (error) {
        console.error(error);
        sendError(error, data.room);
      }
    }
  );

  socket.on("unselectVoiceIA", (data: { room: string }) => {
    try {
      io.in(data.room).emit("unselectVoiceIAResponse", {
        selectedVoiceIA: { voice: "", text: "", anwser: "" },
      });
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });

  socket.on(
    "arrowQuestions",
    (data: {
      room: string;
      nextQuestion: boolean;
      questionsLength: number;
      numberQuestion: number;
    }) => {
      try {
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
      } catch (error) {
        console.error(error);
        sendError(error, data.room);
      }
    }
  );

  socket.on(
    "vote",
    (data: { room: string; playerVotedFor: Player; clientId: string }) => {
      try {
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
      } catch (error) {
        console.error(error);
        sendError(error, data.room);
      }
    }
  );

  socket.on("confirmVote", (data: { room: string; clientId: string }) => {
    try {
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
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });

  socket.on("everyoneConfirmDemand", (data: { room: string }) => {
    try {
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
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });
  socket.on("demandVotesResult", (data: { room: string }) => {
    try {
      const room: Room = getTheRoom(data.room);
      const votes: Vote[] = room.votes;
      const votesTo: Player[] = votes.map((vote: Vote) => vote.to);
      const mostVotedPlayer: Player = getMostVotedPlayer(data.room);
      const numberSubWinner: number = mostVotedPlayer.isTraitor
        ? room.cagnottes.find((cagnotte) => cagnotte.name === "innocent").value
        : room.cagnottes.find((cagnotte) => cagnotte.name === "traitor").value;
      io.in(data.room).emit("demandVotesResultResponse", {
        mostVotedPlayer: mostVotedPlayer,
        displayVotesResult: true,
        numberSubWinner: numberSubWinner,
      });
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });

  socket.on("playAudio", (data: { room: string; audio: string }) => {
    try {
      // socket.on("playAudio", (data: { room: string; audio: HTMLAudioElement }) => {
      io.in(data.room).emit("playAudioResponse", {
        audio: data.audio,
      });
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });
  socket.on("stopAudio", (data: { room: string }) => {
    try {
      console.log("stop audio");
      io.in(data.room).emit("stopAudioResponse", {});
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });
  socket.on("volumeAudio", (data: { room: string; volume: number }) => {
    try {
      console.log(data.volume);
      socket.emit("volumeAudioResponse", {
        volume: data.volume,
      });
    } catch (error) {
      console.error(error);
      sendError(error, data.room);
    }
  });

  socket.on(
    "toggleRevealAnswer",
    (data: { room: string; revealAnswer: boolean }) => {
      try {
        io.in(data.room).emit("toggleRevealAnswerResponse", {
          revealAnswer: !data.revealAnswer,
        });
      } catch (error) {
        console.error(error);
        sendError(error, data.room);
      }
    }
  );
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
httpServer.listen(PORT, () => {
  console.log(`🚀 server is listening on port ${PORT}`);
});
