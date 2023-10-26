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

export class TransferFile {
  private rtcConfigurationDesktop: RTCConfiguration;
  private rtcConfigurationBrowser: RTCConfiguration;
  private toDesktopSocket: Socket;
  private toBrowserSocket: Socket;

  private transferFileConnections: { [transferId: string]: RTCPeerConnection } =
    {};
  private transferFileBrowserChannels: {
    [transferId: string]: RTCDataChannel;
  } = {};

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
    type: string,
    transferId: string,
  ): Promise<void> {
    if (
      this.transferFileConnections[transferId]?.connectionState !== "connected"
    ) {
      const callBack = async (transferFileDesktopChannel: RTCDataChannel) =>
        await this.resTransferFileReqToBrowser(
          browserId,
          this.toBrowserSocket,
          offerSdp,
          type,
          transferId,
          transferFileDesktopChannel,
        );
      await this.reqTransferFileToDesktop(
        this.toDesktopSocket,
        access,
        type,
        transferId,
        callBack,
      );
    }
  }

  // send Offer SDP to Desktop
  private async reqTransferFileToDesktop(
    socket: Socket,
    access: Access,
    type: string,
    transferId: string,
    callBack: (transferFileDesktopChannel: RTCDataChannel) => Promise<void>,
  ): Promise<void> {
    const offerSDP = (sdp: string) =>
      sendFileOfferSDPToDesktop(socket, access, { type, sdp, transferId });

    const transferFileConnection = createPeerConnection(
      offerSDP,
      this.rtcConfigurationDesktop,
    );
    const transferFileChannel = transferFileConnection.createDataChannel(type, {
      ordered: true,
    });

    transferFileChannel.onopen = () => {
      callBack(transferFileChannel);
    };

    transferFileChannel.onclose = () => {
      delete this.transferFileConnections[transferId];
      this.transferFileBrowserChannels[transferId]?.close();
    };

    transferFileChannel.onerror = () => {
      delete this.transferFileConnections[transferId];
      this.transferFileBrowserChannels[transferId]?.close();
    };

    transferFileChannel.onmessage = (event) => {
      const browserChannel = this.transferFileBrowserChannels[transferId];
      if (browserChannel?.readyState === "open") {
        browserChannel.send(event.data);
      }
    };

    await setLocalOffer(transferFileConnection);

    this.transferFileConnections[transferId] = transferFileConnection;

    return;
  }

  // listen Answer SDP
  public async setAnswerSDP(fileSdp: FileSDP): Promise<void> {
    const transferId = fileSdp?.transferId;
    if (
      transferId &&
      (fileSdp.type === `readTransfer` || fileSdp.type === `writeTransfer`)
    ) {
      const connection = this.transferFileConnections[transferId];
      if (connection) await setRemoteAnswer(fileSdp.sdp, connection);
    }
  }

  private async resTransferFileReqToBrowser(
    browserId: string,
    socket: Socket,
    sdp: string,
    type: string,
    transferId: string,
    transferFileDesktopChannel: RTCDataChannel,
  ) {
    const answerSDP = (answerSDP: string) =>
      sendFileAnswerSDPToBrowser(socket, browserId, {
        type,
        sdp: answerSDP,
        transferId,
      });

    const transferFileConnection = createPeerConnection(
      answerSDP,
      this.rtcConfigurationBrowser,
    );

    transferFileConnection.ondatachannel = (event: RTCDataChannelEvent) => {
      event.channel.onopen = () => {
        if (
          this.transferFileConnections[transferId]?.connectionState ===
          "connected"
        ) {
          this.transferFileBrowserChannels[transferId]?.close();
          this.transferFileBrowserChannels[transferId] = event.channel;
        } else {
          event.channel.close();
        }
      };

      event.channel.onclose = () => {
        event.channel.close();
        delete this.transferFileBrowserChannels[transferId];
        this.transferFileConnections[transferId]?.close();
      };

      event.channel.onerror = () => {
        event.channel.close();
        delete this.transferFileBrowserChannels[transferId];
        this.transferFileConnections[transferId]?.close();
      };

      event.channel.onmessage = (event) => {
        if (transferFileDesktopChannel?.readyState === "open") {
          // TODO fix queue
          transferFileDesktopChannel.send(event.data);
        }
      };
    };

    await setRemoteOffer(sdp, transferFileConnection);
  }
}
