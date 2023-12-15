import { Socket } from "socket.io-client";
import crypto from "crypto-js";
import { AppSDP, AuthInfo, FileSDP } from "./type";

export const listenAuth = (
  socket: Socket,
  desktopId: string,
  password: string,
) => {
  socket.on("reqAuth", (info: AuthInfo) => {
    const hashedPassword = crypto.SHA256(password).toString();
    if (desktopId === info.desktopId && hashedPassword === info.password) {
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
