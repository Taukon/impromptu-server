import { Socket } from "socket.io-client";
import { sendAppAnswerSDP, sendAppOfferSDP } from "../signaling";
import { Access, AppSDP } from "../signaling/type";
// import { reflectScreen } from "../shareApp/connect";
import { controlEventListener } from "../canvas";
import {
  createPeerConnection,
  setLocalOffer,
  setRemoteAnswer,
  setRemoteOffer,
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
  private screenChannelConnection?: RTCPeerConnection;
  private screenTrackConnection?: RTCPeerConnection;

  private controlChannel?: RTCDataChannel;
  private controlConnection?: RTCPeerConnection;

  // public audioStream?: RTCDataChannel;
  // private audioConection?: RTCPeerConnection;

  public desktopId: string;

  public canvas: HTMLCanvasElement;
  public video: HTMLVideoElement;
  public image: HTMLImageElement;
  public audio: HTMLAudioElement;

  private intervalId: number | undefined;

  // screen channel
  private preId = 0;
  private order = 0;
  private tmp = new Uint8Array(0);
  private hasScreen = false;

  constructor(desktopId: string) {
    this.desktopId = desktopId;

    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("tabindex", String(0));

    this.video = document.createElement("video");
    this.audio = document.createElement("audio");
    this.image = new Image();
  }

  public isChannelOpen(): boolean {
    return this.controlChannel?.readyState === "open";
  }

  public closeShareApp() {
    this.screenChannelConnection?.close();
    this.screenTrackConnection?.close();
    this.controlConnection?.close();

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  // send Offer SDP
  public async reqShareApp(socket: Socket, access: Access): Promise<void> {
    // await this.reqScreen(socket, access);
    await this.reqControl(socket, access);
  }

  // listen Answer SDP
  public async setShareApp(type: string, answerSdp: string): Promise<void> {
    if (type === `control`) {
      await this.setControl(answerSdp);
    }
  }

  // listen Offer SDP
  public async listenOfferScreen(
    socket: Socket,
    access: Access,
    appSdp: AppSDP,
  ): Promise<void> {
    if (appSdp.type === `screen` && appSdp.appData === `channel`) {
      await this.resScreenChannelReq(socket, access, appSdp.sdp);
    } else if (appSdp.type === `screen` && appSdp.appData === `track`) {
      await this.resScreenTrackReq(socket, access, appSdp.sdp);
    }
  }

  // --------------------------------------------------------------
  // listen Offer SDP & send Answer SDP
  private async resScreenChannelReq(
    socket: Socket,
    access: Access,
    offerSdp: string,
  ): Promise<void> {
    // console.log(`channel`);
    this.image.onload = () => {
      this.canvas.width = this.image.width;
      this.canvas.height = this.image.height;
      this.canvas.getContext("2d")?.drawImage(this.image, 0, 0);
    };

    const type = `screen`;
    const answerSDP = (sdp: string) =>
      sendAppAnswerSDP(socket, access, {
        type,
        sdp,
        appData: `channel`,
      });

    this.screenChannelConnection = createPeerConnection(
      answerSDP,
      peerConnectionConfig,
    );

    this.screenChannelConnection.ondatachannel = async (
      event: RTCDataChannelEvent,
    ) => {
      event.channel.onopen = async () => {
        // console.log(`${event.channel?.readyState} : ${event.channel?.readyState === "open"}`);
        if (event.channel.readyState === "open") {
          while (this.hasScreen === false) {
            const id = getRandomInt(appMaxId);
            const data = createAppProtocol(
              new Uint8Array(0),
              id,
              appStatus.start,
              0,
            );
            event.channel.send(data);
            await timer(2 * 1000);
          }
        }
      };

      event.channel.onmessage = (event) => {
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
    };

    await setRemoteOffer(offerSdp, this.screenChannelConnection);
  }

  // listen Offer SDP & send Answer SDP
  private async resScreenTrackReq(
    socket: Socket,
    access: Access,
    offerSdp: string,
  ): Promise<void> {
    // console.log(`track`);
    const type = `screen`;
    const answerSDP = (sdp: string) =>
      sendAppAnswerSDP(socket, access, {
        type,
        sdp,
        appData: `track`,
      });

    this.screenTrackConnection = createPeerConnection(
      answerSDP,
      peerConnectionConfig,
    );

    this.screenTrackConnection.ontrack = (event) => {
      // console.log(`ontrack: ${event.track.kind}`);
      if (event.track.kind === "video") {
        this.video.srcObject = new MediaStream([event.track]);
        this.video.onloadedmetadata = () => this.video.play();

        const loop = () => {
          // console.log(`canvas vide: ${this.video.videoWidth} ${this.video.videoHeight}`);
          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;
          this.canvas.getContext("2d")?.drawImage(this.video, 0, 0);
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      } else if (event.track.kind === "audio") {
        this.audio.srcObject = new MediaStream([event.track]);
        this.audio.play();
      }
    };

    await setRemoteOffer(offerSdp, this.screenTrackConnection);
  }

  private async reqControl(socket: Socket, access: Access): Promise<void> {
    const type = `control`;
    const offerSDP = (sdp: string) =>
      sendAppOfferSDP(socket, access, { type, sdp });

    this.controlConnection = createPeerConnection(
      offerSDP,
      peerConnectionConfig,
    );
    const controlChannel = this.controlConnection.createDataChannel(type, {
      ordered: true,
    });

    controlChannel.onopen = () => {
      controlEventListener(this.canvas, controlChannel);
    };

    await setLocalOffer(this.controlConnection);
    this.controlChannel = controlChannel;

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
