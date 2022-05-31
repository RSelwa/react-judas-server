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
  traitor: boolean;
  ptsCagnotte: number;
};
type Cagnotte = {
  room: string;
  traitorValue: number;
  innocentValue: number;
};
const controllerName: string = "c";
const viewerName: string = "v";
let clients: Player[] = [];
let cagnottes: Cagnotte[] = [];
let votesRoom = [];
function getClientByID(clientId: string) {
  return clients.find((client) => client.id == clientId);
  //   return clientId;
}
function getAllClientsWithSameRoom(room: string, onlyPlayers: boolean = true) {
  let result;
  onlyPlayers
    ? (result = clients.filter(
        (e) =>
          e.room === room && e.name != controllerName && e.name != viewerName
      ))
    : (result = clients.filter((e) => e.room === room));
  return result;
}
function returnCagnotteOfRoom(room: string): Cagnotte {
  const indexOfCagnottes: number = cagnottes.findIndex(
    (cagnotte) => cagnotte.room == room
  );
  return cagnottes[indexOfCagnottes];
}
io.on("connection", (socket) => {
  console.log("🟢 new connection", socket.client.id);

  function updatePlayers(dataRoom: string) {
    io.to(dataRoom).emit("updatePlayerResponse", {
      players: getAllClientsWithSameRoom(dataRoom),
    });
  }
  function updateCagnottes(dataRoom: string, cagnotte: Cagnotte) {
    io.to(dataRoom).emit("updateCagnottesResponse", {
      cagnotte: cagnotte,
      // players: getAllClientsWithSameRoom(dataRoom),
    });
  }

  socket.on("test", (data: any) => {});

  socket.on("disconnect", (data: any) => {
    console.log("🔴 user disconnect");
    const clientOnClients: Player = getClientByID(socket.client.id);
    //*remove players from clients
    if (clientOnClients) {
      clients.splice(clients.indexOf(clientOnClients), 1);
      updatePlayers(clientOnClients.room);
    }
    //*remove cagnottes where no players in room
    cagnottes.forEach((cagnotte: Cagnotte) => {
      if (
        !clients.some((client) => {
          return client.room == cagnotte.room;
        })
      ) {
        cagnottes.splice(cagnottes.indexOf(cagnotte), 1);
      }
    });
  });
  socket.on(
    "joinRoom",
    (data: { room: string; name: string; idClient: string }) => {
      socket.join(data.room);
      const newPlayer: Player = {
        id: socket.client.id,
        idClient: data.idClient,
        room: data.room,
        name: data.name,
        pts: 0,
        traitor: false,
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
      updatePlayers(data.room);
      if (cagnottes.find((e) => e.room == data.room) == undefined) {
        cagnottes.push({ room: data.room, innocentValue: 0, traitorValue: 0 });
      }
      updateCagnottes(data.room, returnCagnotteOfRoom(data.room));
    }
  );
  socket.on(
    "modifyCagnottes",
    (data: { room: string; value: number; isCagnottesTraitor: boolean }) => {
      try {
        data.isCagnottesTraitor
          ? (returnCagnotteOfRoom(data.room).traitorValue += data.value)
          : (returnCagnotteOfRoom(data.room).innocentValue += data.value);
      } catch (error) {}

      updateCagnottes(data.room, returnCagnotteOfRoom(data.room));
    }
  );
  socket.on(
    "resetCagnottes",
    (data: { room: string; isCagnottesTraitor: boolean }) => {
      try {
        data.isCagnottesTraitor
          ? (returnCagnotteOfRoom(data.room).traitorValue = 0)
          : (returnCagnotteOfRoom(data.room).innocentValue = 0);
      } catch (error) {}
      updateCagnottes(data.room, returnCagnotteOfRoom(data.room));
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
});

const PORT = process.env.port || 6602;
httpServer.listen(PORT, () => {
  console.log("🚀 server is listening");
});
