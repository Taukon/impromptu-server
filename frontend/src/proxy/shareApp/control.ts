import { Socket } from "socket.io-client";
import {
  createPeerConnection,
  setLocalOffer,
  setRemoteAnswer,
  setRemoteOffer,
} from "../peerConnection";
import { sendAppOfferSDPToDesktop } from "../signaling/desktop";
import { Access, AppSDP } from "../signaling/type";
import { sendAppAnswerSDPToBrowser } from "../signaling/browser";
import { timer } from "../util";

const waitTime = 2 * 1000;

export class ControlApp {
  private controlConnection?: RTCPeerConnection;
  private controlDesktopChannel?: RTCDataChannel;
  private controlBrowserChannels: { [browserId: string]: RTCDataChannel } = {};

  private rtcConfigurationDesktop: RTCConfiguration;
  private rtcConfigurationBrowser: RTCConfiguration;
  private toDesktopSocket: Socket;
  private toBrowserSocket: Socket;

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

  // send Offer SDP to Desktop & send Answer SDP to Browser
  public async setChannel(
    access: Access,
    browserId: string,
    offerSdp: string,
  ): Promise<void> {
    if (this.controlConnection?.connectionState !== "connected") {
      this.controlConnection?.close();
      await this.reqControlToDesktop(this.toDesktopSocket, access);
      await timer(waitTime);
    }
    if (this.controlDesktopChannel?.readyState === "open")
      await this.resControlReqToBrowser(
        browserId,
        this.toBrowserSocket,
        offerSdp,
        this.controlDesktopChannel,
      );
  }

  private async reqControlToDesktop(
    socket: Socket,
    access: Access,
  ): Promise<void> {
    const type = `control`;
    const offerSDP = (sdp: string) =>
      sendAppOfferSDPToDesktop(socket, access, { type, sdp });

    this.controlConnection = createPeerConnection(
      offerSDP,
      this.rtcConfigurationDesktop,
    );
    const controlChannel = this.controlConnection.createDataChannel(type, {
      ordered: true,
    });

    controlChannel.onclose = () => {
      Object.values(this.controlBrowserChannels).forEach((v) => {
        v.close();
      });
      delete this.controlConnection;
      delete this.controlDesktopChannel;
    };

    controlChannel.onerror = () => {
      Object.values(this.controlBrowserChannels).forEach((v) => {
        v.close();
      });
      delete this.controlConnection;
      delete this.controlDesktopChannel;
    };

    await setLocalOffer(this.controlConnection);

    this.controlDesktopChannel = controlChannel;

    return;
  }

  // listen Answer SDP
  public async setAnswerSDP(appSdp: AppSDP): Promise<void> {
    if (this.controlConnection && appSdp.type === `control`) {
      await setRemoteAnswer(appSdp.sdp, this.controlConnection);
    }
  }

  private async resControlReqToBrowser(
    browserId: string,
    socket: Socket,
    sdp: string,
    controlDesktopChannel: RTCDataChannel,
  ) {
    const answerSDP = (answerSDP: string) =>
      sendAppAnswerSDPToBrowser(socket, browserId, {
        type: `control`,
        sdp: answerSDP,
      });

    const controlConnection = createPeerConnection(
      answerSDP,
      this.rtcConfigurationBrowser,
    );

    controlConnection.ondatachannel = async (event: RTCDataChannelEvent) => {
      event.channel.onopen = () => {
        if (this.controlConnection?.connectionState === "connected") {
          this.controlBrowserChannels[browserId]?.close();
          this.controlBrowserChannels[browserId] = event.channel;
        } else {
          event.channel.close();
        }
      };

      event.channel.onclose = () => {
        event.channel.close();
      };
      event.channel.onerror = () => {
        event.channel.close();
      };

      event.channel.onmessage = (event) => {
        if (
          controlDesktopChannel.readyState === "open" &&
          controlDesktopChannel.bufferedAmount === 0
        )
          controlDesktopChannel.send(event.data);
      };
    };

    await setRemoteOffer(sdp, controlConnection);
  }
}
