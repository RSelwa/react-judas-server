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

io.on("connection", (socket) => {
  console.log("new connection");
  // ...
});

const PORT = process.env.port || 6602;
httpServer.listen(PORT, () => {
  console.log("🚀server is listening");
});
