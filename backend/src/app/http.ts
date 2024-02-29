import http from "http";
import { networkInterfaces } from "os";
import express from "express";
import { Server } from "socket.io";
import { UserManage } from "../userManage";
import { signalingBrowser } from "../signaling/browser";
import { signalingDesktop } from "../signaling/desktop";
import { signalingProxy } from "../signaling/proxy";

const getIpAddress = (): string | undefined => {
  const nets = networkInterfaces();
  const net1 = nets["eth0"]?.find((v) => v.family == "IPv4");
  if (net1) {
    return net1.address;
  }
  const net2 = nets["enp0s3"]?.find((v) => v.family == "IPv4");
  if (net2) {
    return net2.address;
  }
  const net3 = nets["enp0s8"]?.find((v) => v.family == "IPv4");
  return net3 != null ? net3.address : undefined;
};

const clientPort = 3000; // --- https Port

const ip_addr = getIpAddress() ?? "127.0.0.1"; // --- IP Address

// --- HTTP Server ---
const app: express.Express = express();

app.use(express.static("../public"));

// --- WebSocket Server ---
const httpServer = http.createServer(app);

const socketServer = new Server(httpServer);

httpServer.listen(clientPort, () => {
  console.log(`http://${ip_addr}:${clientPort}`);
});

const start = async () => {
  const userTable = new UserManage();

  socketServer.on("connection", (socket) => {
    socket.once("role", (role: string) => {
      if (role === "browser") {
        signalingBrowser(socketServer, socket, userTable);
      } else if (role === "desktop") {
        signalingDesktop(socketServer, socketServer, socket, userTable);
      } else if (role === "proxy") {
        signalingProxy(socket, userTable);
      }
      userTable.showUsers(`connect ${role}: ${socket.id}`);
      socket.on("disconnect", () => {
        userTable.showUsers(`disconnect ${role}: ${socket.id}`);
      });
    });
  });
};

start();
