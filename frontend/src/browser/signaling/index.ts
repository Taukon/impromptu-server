import { Socket } from "socket.io-client";
import { Access, AppSDP, ClientInfo, FileSDP } from "./type";

export const reqAuth = (socket: Socket, info: ClientInfo): void => {
  socket.emit("reqAuth", info);
};

export const reqAccess = (
  socket: Socket,
  desktopId: string,
  password: string,
  init: (socket: Socket, access: Access) => void,
) => {
  reqAuth(socket, { desktopId, password });

  socket.once("resAuth", async (info: Access | undefined) => {
    console.log(info);
    if (info) {
      const access: Access = {
        desktopId: info.desktopId,
        token: info.token,
      };
      init(socket, access);
    }
  });
};

// ---------------- App

// B -offer-> D
export const sendAppOfferSDP = (
  socket: Socket,
  access: Access,
  appSdp: AppSDP,
) => {
  socket.emit(`shareApp-offerSDP`, access, appSdp);
};

// B <-answer- D
export const listenAppAnswerSDP = (
  socket: Socket,
  listener: (desktopId: string, appSdp: AppSDP) => Promise<void>,
) => {
  socket.on("shareApp-answerSDP", async (desktopId: string, appSdp: AppSDP) => {
    await listener(desktopId, appSdp);
  });
};

// ----------------

// B <-offer- D
export const listenAppOfferSDP = (
  socket: Socket,
  listener: (desktopId: string, appSdp: AppSDP) => Promise<void>,
) => {
  socket.on("shareApp-offerSDP", async (desktopId: string, appSdp: AppSDP) => {
    await listener(desktopId, appSdp);
  });
};

// B -answer-> D
export const sendAppAnswerSDP = (
  socket: Socket,
  access: Access,
  appSdp: AppSDP,
) => {
  socket.emit(`shareApp-answerSDP`, access, appSdp);
};

// ---------------- File

// B -offer-> D
export const sendFileOfferSDP = (
  socket: Socket,
  access: Access,
  fileSdp: FileSDP,
) => {
  socket.emit(`shareFile-offerSDP`, access, fileSdp);
};

// B <-answer- D
export const listenFileAnswerSDP = (
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

// ----------------

// B <-offer- D
export const listenFileOfferSDP = (
  socket: Socket,
  listener: (desktopId: string, fileSdp: FileSDP) => Promise<void>,
) => {
  socket.on(
    "shareFile-offerSDP",
    async (desktopId: string, fileSdp: FileSDP) => {
      await listener(desktopId, fileSdp);
    },
  );
};

// B -answer-> D
export const sendFileAnswerSDP = (
  socket: Socket,
  access: Access,
  fileSdp: FileSDP,
) => {
  socket.emit(`shareFile-answerSDP`, access, fileSdp);
};
