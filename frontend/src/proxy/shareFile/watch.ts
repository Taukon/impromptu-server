import { Socket } from "socket.io-client";
import { Access, FileSDP } from "../signaling/type";
import { sendFileOfferSDPToDesktop } from "../signaling/desktop";
import {
  createPeerConnection,
  setLocalOffer,
  setRemoteAnswer,
  setRemoteOffer,
} from "../peerConnection";
import { sendFileAnswerSDPToBrowser } from "../signaling/browser";
import { timer } from "../util";

const waitTime = 2 * 1000;

export type FileStatistics = {
  desktopType: string;
  total: number;
};

export class WatchFile {
  private rtcConfigurationDesktop: RTCConfiguration;
  private rtcConfigurationBrowser: RTCConfiguration;
  private toDesktopSocket: Socket;
  private toBrowserSocket: Socket;

  private watchFileConnection?: RTCPeerConnection;
  private watchFileDesktopChannel?: RTCDataChannel;
  private watchFileBrowserChannels: { [browserId: string]: RTCDataChannel } =
    {};

  constructor(
    toDesktopSocket: Socket,
    toBrowserSocket: Socket,
    rtcConfigurationDesktop: RTCConfiguration,
    rtcConfigurationBrowser: RTCConfiguration,
  ) {
    this.toDesktopSocket = toDesktopSocket;
    this.toBrowserSocket = toBrowserSocket;
    this.rtcConfigurationDesktop = rtcConfigurationDesktop;
    this.rtcConfigurationBrowser = rtcConfigurationBrowser;
  }

  // https://www.w3.org/TR/webrtc-stats/#dom-rtcdatachannelstats-state
  public async getFileStatistics(): Promise<FileStatistics> {
    const stats = await this.watchFileConnection?.getStats();

    if (stats) {
      let remoteCandidateId: string | undefined;
      let remoteCandidateType: string = "None";
      stats.forEach((report) => {
        if (report.type === "candidate-pair" && report.nominated) {
          remoteCandidateId = report.remoteCandidateId;
        } else if (
          report.type === "remote-candidate" &&
          remoteCandidateId === report.id
        ) {
          // console.log(`remote:${remoteCandidateId} | ${JSON.stringify(report)}`);
          remoteCandidateType = report.candidateType;
        }
      });

      switch (remoteCandidateType) {
        case "host":
          remoteCandidateType = "LAN内";
          break;
        case "srflx":
        case "prflx":
          remoteCandidateType = "ダイレクト";
          break;
        case "relay":
          remoteCandidateType = "リレー";
          break;
        default:
          break;
      }

      return {
        desktopType: remoteCandidateType,
        total: Object.values(this.watchFileBrowserChannels).length,
      };
    }

    return {
      desktopType: "None",
      total: Object.values(this.watchFileBrowserChannels).length,
    };
  }

  // send Offer SDP to Desktop & send Answer SDP to Browser
  public async setChannel(
    access: Access,
    browserId: string,
    offerSdp: string,
  ): Promise<void> {
    if (this.watchFileConnection?.connectionState !== "connected") {
      this.watchFileConnection?.close();
      await this.reqWatchFileToDesktop(this.toDesktopSocket, access);
      await timer(waitTime);
    }
    if (this.watchFileDesktopChannel?.readyState === "open")
      await this.resWatchFileReqToBrowser(
        browserId,
        this.toBrowserSocket,
        offerSdp,
        this.watchFileDesktopChannel,
      );
  }

  private async reqWatchFileToDesktop(
    socket: Socket,
    access: Access,
  ): Promise<void> {
    const type = `fileWatch`;
    const offerSDP = (sdp: string) =>
      sendFileOfferSDPToDesktop(socket, access, { type, sdp });

    this.watchFileConnection = createPeerConnection(
      offerSDP,
      this.rtcConfigurationDesktop,
    );
    const watchFileChannel = this.watchFileConnection.createDataChannel(type, {
      ordered: true,
    });

    watchFileChannel.onclose = () => {
      Object.values(this.watchFileBrowserChannels).forEach((v) => {
        v.close();
      });
      delete this.watchFileConnection;
      delete this.watchFileDesktopChannel;
    };

    watchFileChannel.onerror = () => {
      Object.values(this.watchFileBrowserChannels).forEach((v) => {
        v.close();
      });
      delete this.watchFileConnection;
      delete this.watchFileDesktopChannel;
    };

    watchFileChannel.onmessage = (event) => {
      Object.values(this.watchFileBrowserChannels).forEach((v) => {
        if (v.readyState === "open") {
          v.send(event.data);
        }
      });
    };

    await setLocalOffer(this.watchFileConnection);

    this.watchFileDesktopChannel = watchFileChannel;

    return;
  }

  // listen Answer SDP
  public async setAnswerSDP(fileSdp: FileSDP): Promise<void> {
    if (this.watchFileConnection && fileSdp.type === `fileWatch`) {
      await setRemoteAnswer(fileSdp.sdp, this.watchFileConnection);
    }
  }

  private async resWatchFileReqToBrowser(
    browserId: string,
    socket: Socket,
    sdp: string,
    watchFileDesktopChannel: RTCDataChannel,
  ) {
    const answerSDP = (answerSDP: string) =>
      sendFileAnswerSDPToBrowser(socket, browserId, {
        type: `fileWatch`,
        sdp: answerSDP,
      });

    const fileWatchConnection = createPeerConnection(
      answerSDP,
      this.rtcConfigurationBrowser,
    );

    fileWatchConnection.ondatachannel = (event: RTCDataChannelEvent) => {
      event.channel.onopen = () => {
        if (this.watchFileConnection?.connectionState === "connected") {
          this.watchFileBrowserChannels[browserId]?.close();
          this.watchFileBrowserChannels[browserId] = event.channel;
        } else {
          event.channel.close();
        }
      };

      event.channel.onclose = () => {
        event.channel.close();
        delete this.watchFileBrowserChannels[browserId];
      };

      event.channel.onerror = () => {
        event.channel.close();
        delete this.watchFileBrowserChannels[browserId];
      };

      event.channel.onmessage = (event) => {
        if (watchFileDesktopChannel?.readyState === "open") {
          watchFileDesktopChannel.send(event.data);
        }
      };
    };

    await setRemoteOffer(sdp, fileWatchConnection);
  }
}
