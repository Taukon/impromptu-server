import { Socket } from "socket.io-client";
import crypto from "crypto-js";
import { AuthProxyInfo, ReqProxyInfo } from "./type";

export const listenProxyAuth = (
  socket: Socket,
  proxyId: string,
  password: string,
) => {
  socket.on("reqProxyAuth", (info: AuthProxyInfo) => {
    const hashedPassword = crypto.SHA256(password).toString();
    if (proxyId === info.proxyId && hashedPassword === info.password) {
      socket.emit("resProxyAuth", { desktopId: info.desktopId, status: true });
    } else {
      socket.emit("resProxyAuth", { desktopId: info.desktopId, status: false });
    }
  });
};

export const listenReqProxy = (
  socket: Socket,
  listener: (desktopId: string, password: string) => Promise<void>,
) => {
  socket.on("reqProxy", async (info: ReqProxyInfo) => {
    await listener(info.desktopId, info.password);
  });
};
