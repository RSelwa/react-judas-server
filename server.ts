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

function getAllClientsWithSameRoom(room) {
  return clients.filter((e) => e.room === room);
}
io.on("connection", (socket) => {
  console.log("🟢 new connection");

  socket.on("test", (data: { room: string; idClient: string }) => {
    socket.join(data.room);
    console.log("🧪 test");
    console.log(data);
    io.to(data.room).emit("testResponse", {
      test: "stringtest",
      socketId: socket,
      idClient: data.idClient,
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 user disconnect");
  });
  socket.on(
    "joinRoom",
    (data: { room: string; name: string; idClient: string }) => {
      socket.join(data.room);
      const newPlayer: Player = {
        idClient: data.idClient,
        room: data.room,
        name: data.name,
        pts: 0,
        traitor: false,
        ptsCagnotte: 0,
      };
      clients.push(newPlayer);
      console.log(getAllClientsWithSameRoom(data.room));
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
