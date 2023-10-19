import { Socket, io } from "socket.io-client";
import { Access, AppSDP, FileSDP } from "./signaling/type";
import { ScreenApp } from "./shareApp/screen";
import { signalingToBrowser, signalingToDesktop } from "./config";
import {
  listenAppAnswerSDPToDesktop,
  listenFileAnswerSDPToDesktop,
  reqAuth,
} from "./signaling/desktop";
import { ControlApp } from "./shareApp/control";
import {
  listenAppOfferSDPToBrowser,
  listenAuth,
  listenFileOfferSDPToBrowser,
  listenProxyAuth,
  listenReqProxy,
} from "./signaling/browser";
import { WatchFile } from "./shareFile/watch";
import { TransferFile } from "./shareFile/transfer";

export const automationProxy = (
  password: string,
  showProxyIdFunc?: (proxyId: string, password: string) => void,
  showDesktopIdFunc?: (
    originalDesktopId: string,
    proxyDesktopId: string,
    password: string,
  ) => void,
  removeDesktopIdFunc?: (proxyDesktopId: string) => void,
) => {
  const fileSocket = io(signalingToBrowser, {
    secure: true,
    rejectUnauthorized: false,
  });

  fileSocket.on("end", () => {
    fileSocket.close();
  });

  fileSocket.on("disconnect", () => {
    console.log("socket closed");
    fileSocket.close();
  });

  fileSocket.once("desktopId", (msg) => {
    if (typeof msg === "string") {
      const proxyId = msg;
      if (showProxyIdFunc) showProxyIdFunc(proxyId, password);

      listenProxyAuth(fileSocket, proxyId, password);
      const reqProxyListener = async (desktopId: string, password: string) => {
        connectDesktop(
          desktopId,
          password,
          showDesktopIdFunc,
          removeDesktopIdFunc,
        );
      };
      listenReqProxy(fileSocket, reqProxyListener);
    }
  });
};

export const connectDesktop = (
  desktopId: string,
  password: string,
  showDesktopIdFunc?: (
    originalDesktopId: string,
    proxyDesktopId: string,
    password: string,
  ) => void,
  removeDesktopIdFunc?: (proxyDesktopId: string) => void,
) => {
  const toDesktopSocket = io(signalingToDesktop, {
    secure: true,
    rejectUnauthorized: false,
  });

  toDesktopSocket.on("end", () => {
    toDesktopSocket.close();
  });

  toDesktopSocket.on("disconnect", () => {
    console.log("socket closed");
    toDesktopSocket.close();
  });

  reqAuth(toDesktopSocket, { desktopId, password });

  toDesktopSocket.once(
    "resAuth",
    async (info: Access | undefined, rtcConfiguration?: RTCConfiguration) => {
      console.log(info);
      if (info && rtcConfiguration) {
        const access: Access = {
          desktopId: info.desktopId,
          token: info.token,
        };
        setShare(
          toDesktopSocket,
          access,
          password,
          rtcConfiguration,
          showDesktopIdFunc,
          removeDesktopIdFunc,
        );
      }
    },
  );
};

const setShare = (
  toDesktopSocket: Socket,
  access: Access,
  password: string,
  rtcConfigurationDesktop: RTCConfiguration,
  showDesktopIdFunc?: (
    originalDesktopId: string,
    proxyDesktopId: string,
    password: string,
  ) => void,
  removeDesktopIdFunc?: (proxyDesktopId: string) => void,
) => {
  let proxyDesktopId: string | undefined;
  const toBrowserSocket = io(signalingToBrowser, {
    secure: true,
    rejectUnauthorized: false,
  });
  toBrowserSocket.on("end", () => {
    toDesktopSocket.close();
    toBrowserSocket.close();
    if (removeDesktopIdFunc && proxyDesktopId)
      removeDesktopIdFunc(proxyDesktopId);
  });

  toBrowserSocket.on("disconnect", () => {
    console.log("socket closed");
    toBrowserSocket.close();
  });

  toBrowserSocket.once(
    "desktopId",
    (desktopId?: string, rtcConfiguration?: RTCConfiguration) => {
      if (typeof desktopId === "string" && rtcConfiguration) {
        proxyDesktopId = desktopId;
        const rtcConfigurationBrowser = rtcConfiguration;

        if (showDesktopIdFunc)
          showDesktopIdFunc(access.desktopId, proxyDesktopId, password);

        listenAuth(toBrowserSocket, proxyDesktopId, password);

        const screenApp = new ScreenApp(
          toDesktopSocket,
          toBrowserSocket,
          rtcConfigurationDesktop,
          rtcConfigurationBrowser,
        );
        const controlApp = new ControlApp(
          toDesktopSocket,
          toBrowserSocket,
          rtcConfigurationDesktop,
          rtcConfigurationBrowser,
        );

        const appListenerForDesktop = async (
          desktopId: string,
          appSdp: AppSDP,
        ) => {
          if (appSdp.type === `screen`) {
            screenApp.setAnswerSDP(appSdp);
          } else if (appSdp.type === `control`) {
            controlApp.setAnswerSDP(appSdp);
          }
        };
        listenAppAnswerSDPToDesktop(toDesktopSocket, appListenerForDesktop);

        const appListenerForBrowser = async (
          browserId: string,
          appSdp: AppSDP,
        ) => {
          if (appSdp.type === `screen` && appSdp.appData === `channel`) {
            await screenApp.setChannel(access, browserId, appSdp.sdp);
          } else if (appSdp.type === `screen` && appSdp.appData === `track`) {
            await screenApp.setTrack(access, browserId, appSdp.sdp);
          } else if (appSdp.type === `control`) {
            await controlApp.setChannel(access, browserId, appSdp.sdp);
          }
        };
        listenAppOfferSDPToBrowser(toBrowserSocket, appListenerForBrowser);

        const watchFile = new WatchFile(
          toDesktopSocket,
          toBrowserSocket,
          rtcConfigurationDesktop,
          rtcConfigurationBrowser,
        );
        const transferFile = new TransferFile(
          toDesktopSocket,
          toBrowserSocket,
          rtcConfigurationDesktop,
          rtcConfigurationBrowser,
        );

        const fileListenerForDesktop = async (
          desktopId: string,
          fileSdp: FileSDP,
        ) => {
          if (fileSdp.type === `fileWatch`) {
            watchFile.setAnswerSDP(fileSdp);
          } else if (
            fileSdp.type === `readTransfer` ||
            fileSdp.type === `writeTransfer`
          ) {
            transferFile.setAnswerSDP(fileSdp);
          }
        };
        listenFileAnswerSDPToDesktop(toDesktopSocket, fileListenerForDesktop);

        const fileListenerForBrowser = async (
          browserId: string,
          fileSdp: FileSDP,
        ) => {
          if (fileSdp.type === `fileWatch`) {
            await watchFile.setChannel(access, browserId, fileSdp.sdp);
          } else if (
            fileSdp.transferId &&
            (fileSdp.type === `readTransfer` ||
              fileSdp.type === `writeTransfer`)
          ) {
            await transferFile.setChannel(
              access,
              browserId,
              fileSdp.sdp,
              fileSdp.type,
              fileSdp.transferId,
            );
          }
        };
        listenFileOfferSDPToBrowser(toBrowserSocket, fileListenerForBrowser);
      }
    },
  );
};
