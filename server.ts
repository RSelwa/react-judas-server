import { createServer } from "http";
import { Server } from "socket.io";
import express = require("express");
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://judas.r-selwa.space",
      "https://judas.r-selwa.space",
      "http://localhost:8080",
      "http://192.168.1.23:8080",
      "http://localhost:3000",
      "http://192.168.1.23:3000",
    ],
    methods: ["GET", "POST"],
  },
});
type Player = {
  id?: string;
  idClient?: string;
  room: string;
  name: string;
  pts: number;
  isTraitor: boolean;
  ptsCagnotte: number;
  hasVoted: boolean;
  voteConfirmed: boolean;
};
type Cagnotte = {
  room: string;
  traitorValue: number;
  innocentValue: number;
};
type Room = {
  name: string;
  inGame: boolean;
  players: Player[];
  cagnotte: Cagnotte;
  votes: Vote[];
  votesLaunched: boolean;
  traitorId: string;
};
type Vote = {
  from: Player;
  to: Player;
  confirm: boolean;
};
const controllerName: string = "c";
const viewerName: string = "v";
let clients: Player[] = [];
let rooms: Room[] = [];
// let cagnottes: Cagnotte[] = [];
// let votesRoom = [];
function getClientByID(clientId: string): Player {
  //* get the id of the client in all the clients
  const client: Player = clients.find((client) => client.id == clientId);
  return client;
  //   return clientId;
}
function getTheRoom(dataRoom: string): Room {
  return rooms.find((e) => e.name == dataRoom);
}
function getRealPlayers(dataRoom: string): Player[] {
  const room: Room = getTheRoom(dataRoom);
  if (room) {
    return room.players.filter(
      (player: Player) =>
        player.name != controllerName && player.name != viewerName
    );
  }
}
io.on("connection", (socket) => {
  const socketClientId = socket.client.id;
  console.log("🟢 new connection", socketClientId);
  function updateRoom(room: string) {
    updatePlayers(room);
    updateCagnottes(room, getTheRoom(room).cagnotte);
  }
  function updatePlayers(room: string): void {
    //* function that send all players except controller and viewer
    io.to(room).emit("updatePlayerResponse", {
      players: getTheRoom(room).players.filter(
        (player: Player) =>
          player.name != controllerName && player.name != viewerName
      ),
    });
  }
  function updateCagnottes(room: string, cagnotte: Cagnotte): void {
    io.to(room).emit("updateCagnottesResponse", {
      cagnotte: cagnotte,
      // players: getAllClientsWithSameRoom(dataRoom),
    });
  }
  function updatesVotes(dataRoom: string): void {
    const room: Room = getTheRoom(dataRoom);

    io.to(dataRoom).emit("voteResponse", {
      votes: room.votes,
    });
  }

  socket.on("test", (data: { room: string }) => {
    const room = getTheRoom(data.room);
    console.log(room.votes);
    // console.log(room);
    // io.to(data.room).emit("testResponse", {});
  });

  socket.on("disconnect", (data: any) => {
    console.log("🔴 user disconnect");
    const clientOnClients: Player = getClientByID(socketClientId);
    console.log("data", data);
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
        updatePlayers(clientOnClients.room);
      }
    }
  });
  socket.on(
    "joinRoom",
    (data: { room: string; name: string; idClient: string }) => {
      socket.join(data.room);
      const newPlayer: Player = {
        id: socketClientId,
        idClient: data.idClient,
        room: data.room,
        name: data.name,
        pts: 0,
        isTraitor: false,
        ptsCagnotte: 0,
        hasVoted: false,
        voteConfirmed: false,
      };
      socket.emit("joinRoomResponse", {
        room: data.room,
        name: data.name,
      });
      switch (data.name) {
        case controllerName:
          socket.emit("joinControllerResponse", {
            room: data.room,
          });
          break;
        case viewerName:
          socket.emit("joinViewerResponse", {
            room: data.room,
          });
          break;

        default:
          socket.emit("joinPlayerResponse", {});
          break;
      }
      // clients.push(newPlayer);
      //# initiate the room if doesn't exist yet
      if (rooms.find((e) => e.name == data.room) == undefined) {
        rooms.push({
          name: data.room,
          inGame: false,
          players: [],
          cagnotte: {
            room: data.room,
            traitorValue: 0,
            innocentValue: 0,
          },
          votes: [],
          votesLaunched: false,
          traitorId: "",
        });
      }
      rooms.find((e) => e.name == data.room).players.push(newPlayer);
      updateRoom(data.room);
      // updatePlayers(data.room);
      // updateCagnottes(data.room, getTheRoom(data.room).cagnotte);
    }
  );
  socket.on(
    "modifyCagnottes",
    (data: { room: string; value: number; isCagnottesTraitor: boolean }) => {
      const room: Room = getTheRoom(data.room);
      console.log(room.cagnotte);
      data.isCagnottesTraitor
        ? (room.cagnotte.traitorValue += data.value)
        : (room.cagnotte.innocentValue += data.value);
      updateCagnottes(data.room, room.cagnotte);
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
      const playerIndex = clients.findIndex((e) => e.id == data.playerId);
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
  socket.on("selectTraitor", (data: { room: string }) => {
    const room: Room = getTheRoom(data.room);
    const realPlayers: Player[] = getRealPlayers(data.room);
    if (realPlayers.length > 0) {
      const randomTraitor: Player =
        realPlayers[Math.floor(Math.random() * realPlayers.length)];
      room.traitorId = randomTraitor.idClient;
      room.players.find((player) => player == randomTraitor).isTraitor = true;
      updatePlayers(data.room);
    }
  });
  //# stop game
  socket.on("resetTraitor", (data: { room: string }) => {
    const room: Room = getTheRoom(data.room);
    const playerTraitor: Player = room.players.find(
      (player: Player) => player.isTraitor == true
    );
    if (playerTraitor) {
      playerTraitor.isTraitor = false;
      room.traitorId = "";
      updatePlayers(data.room);
    }
  });
  socket.on("toggleGameStatus", (data: { room: string; inGame: boolean }) => {
    io.to(data.room).emit("statusGameResponse", {
      inGame: !data.inGame,
    });
    console.log(!data.inGame ? "🟩 now in game" : "🟥 no game");
  });
  socket.on("launchVote", (data: { room: string }) => {
    console.log("✉️ votes initiate");
    const room: Room = getTheRoom(data.room);
    room.votesLaunched = true;
    io.to(data.room).emit("launchVoteResponse", {
      votesLaunched: room.votesLaunched,
    });
    io.to(data.room).emit("sendPLayersForVOtes", {
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
    io.to(data.room).emit("stopVoteResponse", {
      votesLaunched: room.votesLaunched,
    });
    io.to(data.room).emit("reinitiateVoteResposne", {
      hasVoted: false,
      voteConfirmed: false,
    });
  });
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
});

const PORT = process.env.port || 6602;
httpServer.listen(PORT, () => {
  console.log("🚀 server is listening");
});
