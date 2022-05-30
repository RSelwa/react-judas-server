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
  idClient: string;
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
  console.log(clientId, "client id");
  return clients.find((client) => client.id == clientId);
  //   return clientId;
}
function getAllClientsWithSameRoom(room) {
  return clients.filter((e) => e.room === room);
}
io.on("connection", (socket) => {
  console.log("🟢 new connection");
  console.log(socket.client.id);

  socket.on("test", (data: { room: string; idClient: string }) => {
    socket.join(data.room);
    console.log("🧪 test");
    console.log(getClientByID(socket.client.id));
    console.log(clients);
  });

  socket.on("disconnect", (data) => {
    console.log(getClientByID(socket.client.id));
    console.log("🔴 user disconnect");
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
      console.log(clients);
      io.to(data.room).emit("joinRoomResponse", data);
      io.to(data.room).emit("joinPlayerResponse", {
        player: newPlayer,
      });
    }
  );
});

const PORT = process.env.port || 6602;
httpServer.listen(PORT, () => {
  console.log("🚀 server is listening");
});
