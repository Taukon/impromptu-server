import { Socket } from "socket.io-client";
import { AppSDP, AuthInfo, AuthProxyInfo, FileSDP, ReqProxyInfo } from "./type";

export const listenProxyAuth = (
  socket: Socket,
  proxyId: string,
  password: string,
) => {
  socket.on("reqProxyAuth", (info: AuthProxyInfo) => {
    if (proxyId === info.proxyId && password === info.password) {
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

export const listenAuth = (
  socket: Socket,
  desktopId: string,
  password: string,
) => {
  socket.on("reqAuth", (info: AuthInfo) => {
    if (desktopId === info.desktopId && password === info.password) {
      socket.emit("resAuth", { browserId: info.browserId, status: true });
    } else {
      socket.emit("resAuth", { browserId: info.browserId, status: false });
    }
  });
};

// ---------------- App

// B -offer-> D
export const listenAppOfferSDPToBrowser = (
  socket: Socket,
  listener: (browserId: string, appSdp: AppSDP) => Promise<void>,
) => {
  socket.on("shareApp-offerSDP", async (browserId: string, appSdp: AppSDP) => {
    await listener(browserId, appSdp);
  });
};

// B <-answer- D
export const sendAppAnswerSDPToBrowser = (
  socket: Socket,
  browserId: string,
  appSdp: AppSDP,
) => {
  socket.emit(`shareApp-answerSDP`, browserId, appSdp);
};

// ---------------- File

// B -offer-> D
export const listenFileOfferSDPToBrowser = (
  socket: Socket,
  listener: (browserId: string, fileSdp: FileSDP) => Promise<void>,
) => {
  socket.on(
    "shareFile-offerSDP",
    async (browserId: string, fileSdp: FileSDP) => {
      await listener(browserId, fileSdp);
    },
  );
};

// B <-answer- D
export const sendFileAnswerSDPToBrowser = (
  socket: Socket,
  browserId: string,
  fileSdp: FileSDP,
) => {
  socket.emit(`shareFile-answerSDP`, browserId, fileSdp);
};
