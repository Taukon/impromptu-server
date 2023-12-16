import { Socket } from "socket.io-client";
import crypto from "crypto-js";
import { Access, AppSDP, ClientInfo, FileSDP } from "./type";

export const reqAuth = (socket: Socket, info: ClientInfo): void => {
  const authInfo: ClientInfo = {
    desktopId: info.desktopId,
    password: crypto.SHA256(info.password).toString(),
  };
  socket.emit("reqAuth", authInfo);
};

// ---------------- App

// B -offer-> D
export const sendAppOfferSDPToDesktop = (
  socket: Socket,
  access: Access,
  appSdp: AppSDP,
) => {
  socket.emit(`shareApp-offerSDP`, access, appSdp);
};

// B <-answer- D
export const listenAppAnswerSDPToDesktop = (
  socket: Socket,
  listener: (desktopId: string, appSdp: AppSDP) => Promise<void>,
) => {
  socket.on("shareApp-answerSDP", async (desktopId: string, appSdp: AppSDP) => {
    await listener(desktopId, appSdp);
  });
};

// ---------------- File

// B -offer-> D
export const sendFileOfferSDPToDesktop = (
  socket: Socket,
  access: Access,
  fileSdp: FileSDP,
) => {
  socket.emit(`shareFile-offerSDP`, access, fileSdp);
};

// B <-answer- D
export const listenFileAnswerSDPToDesktop = (
  socket: Socket,
  listener: (desktopId: string, fileSdp: FileSDP) => Promise<void>,
) => {
  socket.on(
    "shareFile-answerSDP",
    async (desktopId: string, fileSdp: FileSDP) => {
      await listener(desktopId, fileSdp);
    },
  );
};
