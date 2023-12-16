import { Socket } from "socket.io-client";
import { ShareApp } from "./shareApp";
import { Access, AppSDP, FileSDP } from "./signaling/type";
import { listenAppAnswerSDP, listenFileAnswerSDP, reqAuth } from "./signaling";
import { ShareFile } from "./shareFile";

export type BrowserWebRTC = {
  access: Access;
  shareApp: ShareApp;
  shareFile: ShareFile;
};

export const initShareApp = (
  desktopId: string,
  rtcConfiguration: RTCConfiguration,
): ShareApp => {
  return new ShareApp(desktopId, rtcConfiguration);
};

export const initShareFile = (
  desktopId: string,
  rtcConfiguration: RTCConfiguration,
): ShareFile => {
  return new ShareFile(desktopId, rtcConfiguration);
};

export const reqAccess = (
  socket: Socket,
  desktopId: string,
  password: string,
  init: (
    socket: Socket,
    access: Access,
    rtcConfiguration: RTCConfiguration,
  ) => void,
) => {
  socket.emit("role", "browser");
  socket.once(
    "resAuth",
    async (info: Access | undefined, rtcConfiguration?: RTCConfiguration) => {
      console.log(info);
      console.log(rtcConfiguration);
      if (info && rtcConfiguration) {
        const access: Access = {
          desktopId: info.desktopId,
          token: info.token,
        };
        init(socket, access, rtcConfiguration);
      }
    },
  );
  reqAuth(socket, { desktopId, password });
};

export const listenAnswerSDP = (
  socket: Socket,
  browserWebRTC: BrowserWebRTC[],
): void => {
  const appListener = async (desktopId: string, appSdp: AppSDP) => {
    browserWebRTC.forEach(async (v) => {
      if (v.shareApp.desktopId === desktopId)
        await v.shareApp.setShareApp(appSdp);
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
