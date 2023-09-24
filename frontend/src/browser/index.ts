import { Socket } from "socket.io-client";
import { ShareApp } from "./shareApp";
import { Access, AppSDP, FileSDP } from "./signaling/type";
import {
  listenAppAnswerSDP,
  listenFileAnswerSDP,
  listenFileOfferSDP,
  reqAuth,
} from "./signaling";
import { ShareFile } from "./shareFile";

export type BrowserWebRTC = {
  access: Access;
  shareApp: ShareApp;
  shareFile: ShareFile;
};

export const initShareApp = (desktopId: string): ShareApp => {
  return new ShareApp(desktopId);
};

export const initShareFile = (desktopId: string): ShareFile => {
  return new ShareFile(desktopId);
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

export const listenAnswerSDP = (
  socket: Socket,
  browserWebRTC: BrowserWebRTC[],
): void => {
  const appListener = async (desktopId: string, appSdp: AppSDP) => {
    browserWebRTC.forEach(async (v) => {
      if (v.shareApp.desktopId === desktopId)
        await v.shareApp.setShareApp(appSdp.type, appSdp.sdp);
    });
  };
  const fileListener = async (desktopId: string, fileSdp: FileSDP) => {
    browserWebRTC.forEach(async (v) => {
      if (v.shareFile.desktopId === desktopId)
        await v.shareFile.setShareFile(fileSdp);
    });
  };
  listenAppAnswerSDP(socket, appListener);
  listenFileAnswerSDP(socket, fileListener);
};

export const listenOfferSDP = (
  socket: Socket,
  browserWebRTC: BrowserWebRTC[],
): void => {
  const fileListener = async (desktopId: string, fileSdp: FileSDP) => {
    browserWebRTC.forEach((v) => {
      if (v.shareFile.desktopId === desktopId)
        v.shareFile.listenOfferTransfer(socket, v.access, fileSdp);
    });
  };
  listenFileOfferSDP(socket, fileListener);
};
