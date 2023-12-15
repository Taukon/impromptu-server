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
