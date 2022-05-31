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
  traitorId: string;
};
const controllerName: string = "c";
const viewerName: string = "v";
let clients: Player[] = [];
let rooms: Room[] = [];
// let cagnottes: Cagnotte[] = [];
let votesRoom = [];
function getClientByID(clientId: string) {
  //* get the id of the client in all the clients
  return clients.find((client) => client.id == clientId);
  //   return clientId;
}
function getTheRoom(dataRoom: string): Room {
  return rooms.find((e) => e.name == dataRoom);
}
function getRealPlayers(dataRoom: string): Player[] {
  return getTheRoom(dataRoom).players.filter(
    (player: Player) =>
      player.name != controllerName && player.name != viewerName
  );
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

  socket.on("test", (data: any) => {});

  socket.on("disconnect", (data: any) => {
    console.log("🔴 user disconnect");
    const clientOnClients: Player = getClientByID(socketClientId);
    //* if clients exists in clients
    if (clientOnClients) {
      //* find the room of the player
      const roomOfPlayer: Room = rooms.find(
        (room: Room) => room.name == clientOnClients.room
      );
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
      clients.push(newPlayer);
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
  socket.on("selectTraitor", (data: { room: string }) => {
    const room: Room = getTheRoom(data.room);
    const realPlayers: Player[] = getRealPlayers(data.room);
    const randomTraitor: Player =
      realPlayers[Math.floor(Math.random() * realPlayers.length)];
    console.log(randomTraitor);
    room.traitorId = randomTraitor.idClient;
    room.players.find((player) => player == randomTraitor).isTraitor = true;
    // io.to(data.room).emit("selecttraitorResponse", {
    //   traitorId: room.traitorId,
    // });
    updatePlayers(data.room);
  });
  socket.on("toggleGameStatus", (data: { room: string; inGame: boolean }) => {
    io.to(data.room).emit("statusGameResponse", {
      inGame: !data.inGame,
    });
    console.log(!data.inGame ? "🟩 now in game" : "🟥 no game");
  });
});

const PORT = process.env.port || 6602;
httpServer.listen(PORT, () => {
  console.log("🚀 server is listening");
});
