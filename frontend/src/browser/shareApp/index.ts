import { Socket } from "socket.io-client";
import { sendAppOfferSDP } from "../signaling";
import { Access, AppSDP } from "../signaling/type";
import { controlEventListener } from "../canvas";
import {
  createPeerConnection,
  setLocalOffer,
  setRemoteAnswer,
} from "../peerConnection";
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
  private rtcConfiguration: RTCConfiguration;
  private screenChannelConnection?: RTCPeerConnection;
  private screenTrackConnection?: RTCPeerConnection;

  private controlChannel?: RTCDataChannel;
  private controlConnection?: RTCPeerConnection;

  public desktopId: string;

  public canvas: HTMLCanvasElement;
  public video: HTMLVideoElement;
  public image: HTMLImageElement;
  public audio: HTMLAudioElement;
  private screenWidth: number = 0;
  private screenHeight: number = 0;

  // screen
  private preId = 0;
  private order = 0;
  private tmp = new Uint8Array(0);
  private hasScreen = false;

  constructor(desktopId: string, rtcConfiguration: RTCConfiguration) {
    this.rtcConfiguration = rtcConfiguration;
    this.desktopId = desktopId;

    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("tabindex", String(0));

    this.video = document.createElement("video");
    this.audio = document.createElement("audio");

    this.image = new Image();
    this.image.onload = () => {
      this.canvas.width = this.image.width;
      this.canvas.height = this.image.height;
      this.canvas.getContext("2d")?.drawImage(this.image, 0, 0);
    };
  }

  public isChannelOpen(): boolean {
    return this.controlChannel?.readyState === "open";
  }

  public closeShareApp() {
    this.screenChannelConnection?.close();
    this.screenTrackConnection?.close();

    this.controlConnection?.close();
    this.controlChannel?.close();
  }

  // send Offer SDP
  public async reqShareApp(socket: Socket, access: Access): Promise<void> {
    await this.reqScreenTrack(socket, access);
    await this.reqScreenChannel(socket, access);
    await this.reqControl(socket, access);
  }

  // listen Answer SDP
  public async setShareApp(appSdp: AppSDP): Promise<void> {
    console.log(`answer sdp ${appSdp.type} : ${appSdp.appData}`);
    if (appSdp.type === `screen`) {
      await this.setScreen(appSdp);
    } else if (appSdp.type === `control`) {
      await this.setControl(appSdp.sdp);
    }
  }

  public async reqScreenChannel(socket: Socket, access: Access): Promise<void> {
    const type = `screen`;
    const offerSDP = (sdp: string) =>
      sendAppOfferSDP(socket, access, { type, sdp, appData: `channel` });

    this.screenChannelConnection = createPeerConnection(
      offerSDP,
      this.rtcConfiguration,
    );
    const screenChannel = this.screenChannelConnection.createDataChannel(type, {
      ordered: false,
      maxRetransmits: 0,
    });

    screenChannel.onopen = async () => {
      if (screenChannel.readyState === "open") {
        while (this.hasScreen === false) {
          const id = getRandomInt(appMaxId);
          const data = createAppProtocol(
            new Uint8Array(0),
            id,
            appStatus.start,
            0,
          );
          if (screenChannel.readyState === "open") screenChannel.send(data);
          await timer(2 * 1000);
        }
      }
    };

    screenChannel.onmessage = (event) => {
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

    await setLocalOffer(this.screenChannelConnection);

    return;
  }

  private async reqScreenTrack(socket: Socket, access: Access): Promise<void> {
    const type = `screen`;
    const offerSDP = (sdp: string) => {
      sendAppOfferSDP(socket, access, { type, sdp, appData: `track` });
    };

    this.screenTrackConnection = createPeerConnection(
      offerSDP,
      this.rtcConfiguration,
    );

    this.screenTrackConnection.addTransceiver("video", {
      direction: "recvonly",
    });
    this.screenTrackConnection.addTransceiver("audio", {
      direction: "recvonly",
    });

    this.screenTrackConnection.ontrack = (event) => {
      if (event.track.kind === "video" && event.streams[0]) {
        // this.video.srcObject = new MediaStream([event.track]);
        this.video.srcObject = event.streams[0];
        this.video.onloadedmetadata = () => this.video.play();

        const loop = () => {
          if (
            this.screenWidth < this.video.videoWidth &&
            this.screenHeight < this.video.videoHeight
          ) {
            console.log(
              `canvas video: ${this.video.videoWidth} ${this.video.videoHeight}`,
            );
            this.screenWidth = this.video.videoWidth;
            this.screenHeight = this.video.videoHeight;
            this.canvas.style.width = `${this.video.videoWidth}px`;
            this.canvas.style.height = `${this.video.videoHeight}px`;
          }

          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;

          this.canvas.getContext("2d")?.drawImage(this.video, 0, 0);
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      } else if (event.track.kind === "audio" && event.streams[0]) {
        // this.audio.srcObject = new MediaStream([event.track]);
        this.audio.srcObject = event.streams[0];
        this.audio.play();
      }
    };

    await setLocalOffer(this.screenTrackConnection);

    return;
  }

  // listen Answer SDP
  private async setScreen(appSdp: AppSDP): Promise<boolean> {
    if (this.screenChannelConnection && appSdp.appData === `channel`) {
      await setRemoteAnswer(appSdp.sdp, this.screenChannelConnection);
      return true;
    } else if (this.screenTrackConnection && appSdp.appData === `track`) {
      await setRemoteAnswer(appSdp.sdp, this.screenTrackConnection);
      return true;
    }
    return false;
  }

  private async reqControl(socket: Socket, access: Access): Promise<void> {
    const type = `control`;
    const offerSDP = (sdp: string) =>
      sendAppOfferSDP(socket, access, { type, sdp });

    this.controlConnection = createPeerConnection(
      offerSDP,
      this.rtcConfiguration,
    );
    this.controlChannel = this.controlConnection.createDataChannel(type, {
      ordered: true,
    });

    this.controlChannel.onopen = () => {
      if (this.controlChannel)
        controlEventListener(this.canvas, this.controlChannel);
    };

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
