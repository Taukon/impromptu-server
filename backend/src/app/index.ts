import fs from "fs";
import https from "https";
import { networkInterfaces } from "os";
import express from "express";
import { Server } from "socket.io";
import { UserManage } from "../userManage";
import { signalingBrowser } from "../signaling/browser";
import { signalingDesktop } from "../signaling/desktop";

const getIpAddress = (): string | undefined => {
  const nets = networkInterfaces();
  // const net = nets["eth0"]?.find((v) => v.family == "IPv4");
  const net = nets["enp0s8"]?.find((v) => v.family == "IPv4");
  return net != null ? net.address : undefined;
};

const clientPort = 3000; // --- https Port for client
const desktopPort = 3100; // --- https Port for desktop

const ip_addr = getIpAddress() ?? "127.0.0.1"; // --- IP Address

// --- HTTPS Server ---
const app: express.Express = express();

app.use(express.static("../public"));

// --- SSL cert for HTTPS access ---
const options = {
  key: fs.readFileSync("../ssl/key.pem", "utf-8"),
  cert: fs.readFileSync("../ssl/cert.pem", "utf-8"),
};

// --- WebSocket Server For Client ---
const httpsServerForClient = https.createServer(options, app);
httpsServerForClient.listen(clientPort, () => {
  console.log(`https://${ip_addr}:${clientPort}/impromptu.html`);
});
const clientServer = new Server(httpsServerForClient);

// --- WebSocket Server For Desktop ---
const httpsServerForDesktop = https.createServer(options, app);
httpsServerForDesktop.listen(desktopPort, () => {
  console.log(
    "https://" + ip_addr + ":" + desktopPort + "  <-- desktop server",
  );
});
const desktopServer = new Server(httpsServerForDesktop);

const start = async () => {
  const userTable = new UserManage();

  clientServer.on("connection", (sock) => {
    signalingBrowser(desktopServer, sock, userTable);
  });

  desktopServer.on("connection", (sock) => {
    console.log(`desktopId: ${sock.id}`);
    signalingDesktop(clientServer, sock, userTable);
  });
};

start();
