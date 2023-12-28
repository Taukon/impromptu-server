import { Socket, io } from "socket.io-client";
import { ShareApp } from "./shareApp";
import { Access, AppSDP, FileSDP } from "./signaling/type";
import { listenAppAnswerSDP, listenFileAnswerSDP, reqAuth } from "./signaling";
import { ShareFile } from "./shareFile";
import { signalingAddress, socketOption } from "./config";

type Browser = {
  access: Access;
  shareApp: ShareApp;
  shareFile: ShareFile;
};
export class Impromptu {
  // TODO change private
  public browsers: Browser[] = [];
  private socket: Socket;

  constructor() {
    this.socket = io(signalingAddress, socketOption);
  }

  public deleteDesktop(desktopId: string): void {
    this.browsers.forEach((v, index) => {
      if (v.access.desktopId === desktopId) {
        delete this.browsers[index];
        this.browsers.splice(index, 1);
      }
    });
  }

  public listenDesktopRes(callBackUI: (browser: Browser) => void): void {
    this.socket.connect();
    this.socket.emit("role", "browser");
    this.socket.on(
      "resAuth",
      async (info: Access | undefined, rtcConfiguration?: RTCConfiguration) => {
        console.log(info);
        console.log(rtcConfiguration);
        if (info && rtcConfiguration) {
          const access: Access = {
            desktopId: info.desktopId,
            token: info.token,
          };

          const clientBrowser: Browser = {
            access: access,
            shareApp: new ShareApp(access.desktopId, rtcConfiguration),
            shareFile: new ShareFile(access.desktopId, rtcConfiguration),
          };

          this.browsers.forEach((v, index) => {
            if (v.access.desktopId === clientBrowser.access.desktopId) {
              delete this.browsers[index];
              this.browsers.splice(index, 1);
            }
          });

          this.browsers.push(clientBrowser);
          // setRes(`${this.browsers.length} ${access.token}`);
          callBackUI(clientBrowser);
        }
      },
    );

    const appListener = async (desktopId: string, appSdp: AppSDP) => {
      this.browsers.forEach(async (v) => {
        if (v.shareApp.desktopId === desktopId)
          await v.shareApp.setShareApp(appSdp);
      });
    };
    const fileListener = async (desktopId: string, fileSdp: FileSDP) => {
      this.browsers.forEach(async (v) => {
        if (v.shareFile.desktopId === desktopId)
          await v.shareFile.setShareFile(fileSdp);
      });
    };

    listenAppAnswerSDP(this.socket, appListener);
    listenFileAnswerSDP(this.socket, fileListener);
  }

  public reqDesktopAuth(desktopId: string, password: string): void {
    if (this.socket.connected) {
      console.log(`send request auth`);
      reqAuth(this.socket, { desktopId, password });
    }
  }

  public async reqShareApp(desktopId: string): Promise<void> {
    const browser = this.browsers.find((v) => v.access.desktopId === desktopId);
    if (browser) {
      await browser.shareApp.reqShareApp(this.socket, browser.access);
    }
  }

  public isOpenShareApp(desktopId: string): boolean {
    const browser = this.browsers.find((v) => v.access.desktopId === desktopId);
    if (browser) {
      return browser.shareApp.isChannelOpen();
    }
    return false;
  }

  public async reqShareFile(desktopId: string): Promise<void> {
    const browser = this.browsers.find((v) => v.access.desktopId === desktopId);
    if (browser) {
      await browser.shareFile.reqShareFile(this.socket, browser.access);
    }
  }

  public isOpenShareFile(desktopId: string): boolean {
    const browser = this.browsers.find((v) => v.access.desktopId === desktopId);
    if (browser) {
      return browser.shareFile.isChannelOpen();
    }
    return false;
  }
}
