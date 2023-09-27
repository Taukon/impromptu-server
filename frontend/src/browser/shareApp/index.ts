import { Socket } from "socket.io-client";
import { sendAppOfferSDP } from "../signaling";
import { Access } from "../signaling/type";
// import { reflectScreen } from "../shareApp/connect";
import { controlEventListener } from "../canvas";
import {
  createPeerConnection,
  setLocalOffer,
  setRemoteAnswer,
} from "../peerConection";
import { peerConnectionConfig } from "../config";
import {
  appMaxId,
  appStatus,
  appendBuffer,
  createAppProtocol,
  getRandomInt,
  parseAppProtocol,
} from "../protocol";
import { timer } from "../util";

export class ShareApp {
  private screenChannel?: RTCDataChannel;
  private screenConnection?: RTCPeerConnection;

  private controlChannel?: RTCDataChannel;
  private controlConnection?: RTCPeerConnection;

  // public audioStream?: RTCDataChannel;
  // private audioConection?: RTCPeerConnection;

  public desktopId: string;

  public canvas: HTMLCanvasElement;
  public image: HTMLImageElement;
  public audio?: HTMLAudioElement;

  // screen
  private preId = 0;
  private order = 0;
  private tmp = new Uint8Array(0);
  private hasScreen = false;

  constructor(desktopId: string) {
    this.desktopId = desktopId;

    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("tabindex", String(0));

    this.image = new Image();
    this.image.onload = () => {
      this.canvas.width = this.image.width;
      this.canvas.height = this.image.height;
      this.canvas.getContext("2d")?.drawImage(this.image, 0, 0);
    };
  }

  public isChannelOpen(): boolean {
    return (
      this.screenChannel?.readyState === "open" &&
      this.controlChannel?.readyState === "open"
    );
  }

  public closeShareApp() {
    this.screenConnection?.close();
    this.screenChannel?.close();
    this.controlConnection?.close();
    this.controlChannel?.close();
  }

  // send Offer SDP
  public async reqShareApp(socket: Socket, access: Access): Promise<void> {
    await this.reqScreen(socket, access);
    await this.reqControl(socket, access);
  }

  // listen Answer SDP
  public async setShareApp(type: string, answerSdp: string): Promise<void> {
    if (type === `screen`) {
      await this.setScreen(answerSdp);
    } else if (type === `control`) {
      await this.setControl(answerSdp);
    }
  }

  private async reqScreen(socket: Socket, access: Access): Promise<void> {
    const type = `screen`;
    const offerSDP = (sdp: string) =>
      sendAppOfferSDP(socket, access, { type, sdp });

    this.screenConnection = createPeerConnection(
      offerSDP,
      peerConnectionConfig,
    );
    this.screenChannel = this.screenConnection.createDataChannel(type, {
      ordered: false,
      maxRetransmits: 0,
    });

    this.screenChannel.onopen = async () => {
      if (this.screenChannel?.readyState === "open") {
        while (this.hasScreen === false) {
          const id = getRandomInt(appMaxId);
          const data = createAppProtocol(
            new Uint8Array(0),
            id,
            appStatus.start,
            0,
          );
          this.screenChannel.send(data);
          await timer(2 * 1000);
        }
      }
    };

    this.screenChannel.onmessage = (event) => {
      if (!this.hasScreen) this.hasScreen = true;
      const buf = event.data;
      const parse = parseAppProtocol(new Uint8Array(buf));
      if (parse.status === appStatus.once) {
        const imgBase64 = btoa(
          new Uint8Array(parse.data).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );
        this.image.src = "data:image/jpeg;base64," + imgBase64;
      } else if (parse.status === appStatus.start) {
        this.tmp = parse.data;
        this.preId = parse.id;
        this.order = parse.order + 1;
      } else if (
        parse.status === appStatus.middle &&
        parse.id === this.preId &&
        parse.order === this.order
      ) {
        this.tmp = appendBuffer(this.tmp, parse.data);
        this.order++;
      } else if (
        parse.status === appStatus.end &&
        parse.id === this.preId &&
        parse.order === this.order
      ) {
        this.tmp = appendBuffer(this.tmp, parse.data);
        const imgBase64 = btoa(
          new Uint8Array(this.tmp).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );
        this.image.src = "data:image/jpeg;base64," + imgBase64;
        this.tmp = new Uint8Array(0);
        this.order = 0;
      } else {
        this.order = 0;
        this.tmp = new Uint8Array(0);
      }
    };

    // this.screenConnection.onconnectionstatechange = () => {
    //   console.log(`screen: ${this.screenConnection?.connectionState} | ${this.screenChannel?.readyState}`)
    // };

    await setLocalOffer(this.screenConnection);

    return;
  }

  // listen Answer SDP
  private async setScreen(
    answerSdp: string,
  ): Promise<RTCDataChannel | undefined> {
    if (this.screenChannel && this.screenConnection) {
      await setRemoteAnswer(answerSdp, this.screenConnection);
      return this.screenChannel;
    }
    return undefined;
  }

  private async reqControl(socket: Socket, access: Access): Promise<void> {
    const type = `control`;
    const offerSDP = (sdp: string) =>
      sendAppOfferSDP(socket, access, { type, sdp });

    this.controlConnection = createPeerConnection(
      offerSDP,
      peerConnectionConfig,
    );
    this.controlChannel = this.controlConnection.createDataChannel(type, {
      ordered: true,
    });

    this.controlChannel.onopen = () => {
      if (this.controlChannel)
        controlEventListener(this.canvas, this.controlChannel);
    };

    // this.controlConnection.onconnectionstatechange = () => {
    //   console.log(`control: ${this.controlConnection?.connectionState} | ${this.controlChannel?.readyState}`)
    // };

    await setLocalOffer(this.controlConnection);

    return;
  }

  // listen Answer SDP
  private async setControl(
    answerSdp: string,
  ): Promise<RTCDataChannel | undefined> {
    if (this.controlChannel && this.controlConnection) {
      await setRemoteAnswer(answerSdp, this.controlConnection);
      return this.controlChannel;
    }
    return undefined;
  }
}
