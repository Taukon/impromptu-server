import fs from "fs";
import https from "https";
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

// --- HTTPS Server ---
const app: express.Express = express();

app.use(express.static("../public"));

// --- SSL cert for HTTPS access ---
const options = {
  key: fs.readFileSync("../ssl/key.pem", "utf-8"),
  cert: fs.readFileSync("../ssl/cert.pem", "utf-8"),
};

// --- WebSocket Server ---
const httpsServer = https.createServer(options, app);

const socketServer = new Server(httpsServer);

httpsServer.listen(clientPort, () => {
  console.log(`https://${ip_addr}:${clientPort}`);
});

const start = async () => {
  const userTable = new UserManage();

  socketServer.on("connection", (socket) => {
    socket.once("role", (role: string) => {
      console.log(`${role}: ${socket.id}`);
      if (role === "browser") {
        signalingBrowser(socketServer, socket, userTable);
      } else if (role === "desktop") {
        signalingDesktop(socketServer, socketServer, socket, userTable);
      } else if (role === "proxy") {
        signalingProxy(socket, userTable);
      }
    });
  });
};

start();
