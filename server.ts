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
let clients: Player[] = [];
let cagnottes = [];
let votesRoom = [];
function getClientByID(clientId: string) {
  return clients.find((client) => client.id == clientId);
  //   return clientId;
}
function getAllClientsWithSameRoom(room, onlyPlayers: boolean = true) {
  let result;
  onlyPlayers
    ? (result = clients.filter(
        (e) => e.room === room && e.name != ("controller" || "viewer")
      ))
    : (result = clients.filter((e) => e.room === room));
  return result;
}
io.on("connection", (socket) => {
  console.log("🟢 new connection", socket.client.id);

  function updatePlayers(dataRoom: string) {
    io.to(dataRoom).emit("updatePlayerResponse", {
      players: getAllClientsWithSameRoom(dataRoom),
    });
  }

  socket.on("test", (data: any) => {
    socket.join(data.room);
    console.log("🧪 test");

    console.log(clients);
    io.to(data.room).emit("testResponse", {});
  });

  socket.on("disconnect", (data) => {
    console.log("🔴 user disconnect");
    const clientOnClients: Player = getClientByID(socket.client.id);
    if (clientOnClients) {
      clients.splice(clients.indexOf(clientOnClients), 1);
      updatePlayers(clientOnClients.room);
    }
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
      clients.push(newPlayer);
      io.to(data.room).emit("joinRoomResponse", {
        room: data.room,
      });
      socket.emit("testResponse");
      switch (data.name) {
        case "controller":
          break;
        case "viewer":
          break;

        default:
          break;
      }
      updatePlayers(data.room);
      // io.to(data.room).emit("updatePlayerResponse", {
      //   players: getAllClientsWithSameRoom(data.room),
      // });
    }
  );
});

const PORT = process.env.port || 6602;
httpServer.listen(PORT, () => {
  console.log("🚀 server is listening");
});
