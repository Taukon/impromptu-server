import { Socket, io } from "socket.io-client";
import { ControlApp } from "./shareApp/control";
import { ScreenApp, ScreenStatistics } from "./shareApp/screen";
import { TransferFile } from "./shareFile/transfer";
import { FileStatistics, WatchFile } from "./shareFile/watch";
import { signalingAddress, socketOption } from "./config";
import { Access, AppSDP, FileSDP } from "./signaling/type";
import {
  listenAppOfferSDPToBrowser,
  listenAuth,
  listenFileOfferSDPToBrowser,
} from "./signaling/browser";
import {
  listenAppAnswerSDPToDesktop,
  listenFileAnswerSDPToDesktop,
  reqAuth,
} from "./signaling/desktop";
import { listenProxyAuth, listenReqProxy } from "./signaling/proxy";

type Proxy = {
  replaceId: string;
  desktopSocket: Socket;
  replaceSocket: Socket;
  screenApp: ScreenApp;
  controlApp: ControlApp;
  watchFile: WatchFile;
  transferFile: TransferFile;
};

type Statistics = {
  exist: boolean;
  screen: ScreenStatistics;
  file: FileStatistics;
};

export class Impromptu {
  public proxies: Proxy[] = [];
  private autoProxy: boolean = false;

  public showIdFunc?: (
    desktopId: string,
    replaceId: string,
    password: string,
  ) => void;
  public removeIdFunc?: (replaceId: string) => void;
  public showProxyIdFunc?: (proxyId: string, password: string) => void;

  constructor() {}

  public async getStatistics(replaceId: string): Promise<Statistics> {
    const proxy = this.proxies.find((v) => v.replaceId === replaceId);
    if (proxy) {
      return {
        exist: true,
        screen: await proxy.screenApp.getScreenStatistics(),
        file: await proxy.watchFile.getFileStatistics(),
      };
    }
    return {
      exist: false,
      screen: { desktopType: "none", total: 0, data: [] },
      file: { desktopType: "none", total: 0 },
    };
  }

  public autoConnectDesktop(proxyPassword: string) {
    if (this.autoProxy) return;
    this.autoProxy = true;

    const proxySocket = io(signalingAddress, socketOption);
    proxySocket.connect();

    proxySocket.on("end", () => {
      proxySocket.close();
    });

    proxySocket.on("disconnect", () => {
      console.log("socket closed");
      proxySocket.close();
    });

    proxySocket.once("proxyId", (msg) => {
      if (typeof msg === "string") {
        const proxyId = msg;
        if (this.showProxyIdFunc) this.showProxyIdFunc(proxyId, proxyPassword);

        listenProxyAuth(proxySocket, proxyId, proxyPassword);
        const reqProxyListener = async (
          desktopId: string,
          password: string,
        ) => {
          this.connectDesktop(desktopId, password);
        };
        listenReqProxy(proxySocket, reqProxyListener);
      }
    });

    proxySocket.emit("role", "proxy");
  }

  public connectDesktop(desktopId: string, password: string) {
    const desktopSocket = io(signalingAddress, socketOption);

    desktopSocket.connect();
    desktopSocket.emit("role", "browser");

    desktopSocket.on("end", () => {
      desktopSocket.close();
    });

    desktopSocket.on("disconnect", () => {
      console.log("socket closed");
      desktopSocket.close();
    });

    desktopSocket.once(
      "resAuth",
      async (info: Access | undefined, rtcConfiguration?: RTCConfiguration) => {
        if (info && rtcConfiguration) {
          const access: Access = {
            desktopId: info.desktopId,
            token: info.token,
          };

          this.setProxy(desktopSocket, access, password, rtcConfiguration);
        }
      },
    );

    reqAuth(desktopSocket, { desktopId, password });
  }

  private setProxy(
    desktopSocket: Socket,
    access: Access,
    replacePassword: string,
    rtcConfigurationDesktop: RTCConfiguration,
  ) {
    let replaceId: string | undefined;

    const replaceSocket = io(signalingAddress, socketOption);
    replaceSocket.connect();

    replaceSocket.on("end", () => {
      desktopSocket.close();
      replaceSocket.close();
      if (this.removeIdFunc && replaceId) this.removeIdFunc(replaceId);
    });

    replaceSocket.on("disconnect", () => {
      console.log("socket closed");
      replaceSocket.close();
    });

    replaceSocket.once(
      "desktopId",
      (desktopId?: string, rtcConfiguration?: RTCConfiguration) => {
        if (typeof desktopId === "string" && rtcConfiguration) {
          replaceId = desktopId;
          const rtcConfigurationBrowser = rtcConfiguration;

          const proxy: Proxy = {
            replaceId: replaceId,
            desktopSocket: desktopSocket,
            replaceSocket: replaceSocket,
            screenApp: new ScreenApp(
              desktopSocket,
              replaceSocket,
              rtcConfigurationDesktop,
              rtcConfigurationBrowser,
            ),
            controlApp: new ControlApp(
              desktopSocket,
              replaceSocket,
              rtcConfigurationDesktop,
              rtcConfigurationBrowser,
            ),
            watchFile: new WatchFile(
              desktopSocket,
              replaceSocket,
              rtcConfigurationDesktop,
              rtcConfigurationBrowser,
            ),
            transferFile: new TransferFile(
              desktopSocket,
              replaceSocket,
              rtcConfigurationDesktop,
              rtcConfigurationBrowser,
            ),
          };

          this.proxies.push(proxy);

          if (this.showIdFunc)
            this.showIdFunc(access.desktopId, replaceId, replacePassword);

          listenAuth(replaceSocket, replaceId, replacePassword);

          const appListenerForDesktop = async (
            desktopId: string,
            appSdp: AppSDP,
          ) => {
            if (appSdp.type === `screen`) {
              proxy.screenApp.setAnswerSDP(appSdp);
            } else if (appSdp.type === `control`) {
              proxy.controlApp.setAnswerSDP(appSdp);
            }
          };
          listenAppAnswerSDPToDesktop(desktopSocket, appListenerForDesktop);

          const appListenerForBrowser = async (
            browserId: string,
            appSdp: AppSDP,
          ) => {
            if (appSdp.type === `screen` && appSdp.appData === `channel`) {
              await proxy.screenApp.setChannel(access, browserId, appSdp.sdp);
            } else if (appSdp.type === `screen` && appSdp.appData === `track`) {
              await proxy.screenApp.setTrack(access, browserId, appSdp.sdp);
            } else if (appSdp.type === `control`) {
              await proxy.controlApp.setChannel(access, browserId, appSdp.sdp);
            }
          };
          listenAppOfferSDPToBrowser(replaceSocket, appListenerForBrowser);

          const fileListenerForDesktop = async (
            desktopId: string,
            fileSdp: FileSDP,
          ) => {
            if (fileSdp.type === `fileWatch`) {
              proxy.watchFile.setAnswerSDP(fileSdp);
            } else if (
              fileSdp.type === `readTransfer` ||
              fileSdp.type === `writeTransfer`
            ) {
              proxy.transferFile.setAnswerSDP(fileSdp);
            }
          };
          listenFileAnswerSDPToDesktop(desktopSocket, fileListenerForDesktop);

          const fileListenerForBrowser = async (
            browserId: string,
            fileSdp: FileSDP,
          ) => {
            if (fileSdp.type === `fileWatch`) {
              await proxy.watchFile.setChannel(access, browserId, fileSdp.sdp);
            } else if (
              fileSdp.transferId &&
              (fileSdp.type === `readTransfer` ||
                fileSdp.type === `writeTransfer`)
            ) {
              await proxy.transferFile.setChannel(
                access,
                browserId,
                fileSdp.sdp,
                fileSdp.type,
                fileSdp.transferId,
              );
            }
          };
          listenFileOfferSDPToBrowser(replaceSocket, fileListenerForBrowser);
        }
      },
    );

    replaceSocket.emit("role", "desktop");
  }
}
