import { Socket } from "socket.io-client";
import { Access, FileSDP } from "../signaling/type";
import { FileDownload, FileUpload, FileWatchMsg } from "../monitorFile/type";
import { removeFileList, updateFiles } from "../monitorFile";
import { appStatus, decodeParseData, parseAppProtocol } from "../protocol";
import { sendFileAnswerSDP, sendFileOfferSDP } from "../signaling";
import { peerConnectionConfig } from "../config";
import {
  createPeerConnection,
  setLocalOffer,
  setRemoteAnswer,
  setRemoteOffer,
} from "../peerConection";
import {
  getRandomStringId,
  reqReadFile,
  reqWatchList,
  reqWriteFile,
  sendFileBuffer,
} from "./connect";
import {
  AcceptReadFile,
  AcceptWriteFile,
  FileReaderList,
  ReqWriteFile,
  TransferList,
} from "./type";
import { timer } from "../util";
import streamSaver from "streamsaver";

export class ShareFile {
  public desktopId: string;

  public fileUpload: FileUpload;
  public fileDownload: FileDownload;

  private fileWatchChannel?: RTCDataChannel;
  private fileWatchConnection?: RTCPeerConnection;

  private transferList: TransferList = {}; //for writeTransfer
  private fileReaderList: FileReaderList = {};

  constructor(desktopId: string) {
    this.desktopId = desktopId;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    // input.name = 'files[]'; // 複数ファイル対応のために[]を追加
    const uploadButton = document.createElement("button");
    uploadButton.textContent = "send";

    this.fileUpload = {
      input: fileInput,
      button: uploadButton,
    };
    this.fileDownload = document.createElement("div");
  }

  public isChannelOpen(): boolean {
    return this.fileWatchChannel?.readyState === "open";
  }

  public closeShareFile() {
    this.fileWatchConnection?.close();
    this.fileWatchChannel?.close();
  }

  //-------------------------------------------------------------------------
  // send Offer SDP
  public async reqShareFile(socket: Socket, access: Access): Promise<void> {
    await this.reqFileWatch(socket, access);
    this.writeFile(this.fileUpload, socket, access);
  }

  // listen Answer SDP
  public async setShareFile(fileSdp: FileSDP): Promise<void> {
    if (fileSdp.type === `fileWatch`) {
      await this.setFileWatch(fileSdp.sdp);
    } else if (fileSdp.type === `writeTransfer`) {
      await this.setWriteTransfer(fileSdp);
    }
  }

  // listen Offer SDP
  public listenOfferTransfer(socket: Socket, access: Access, fileSdp: FileSDP) {
    if (fileSdp.type === `readTransfer` && fileSdp.transferId) {
      this.resReadTransfer(socket, access, fileSdp.transferId, fileSdp.sdp);
    }
    // else if (fileSdp.type === `writeTransfer` && fileSdp.transferId) {
    //   this.resWriteTransfer(socket, access, fileSdp.transferId, fileSdp.sdp);
    // }
  }
  //-------------------------------------------------------------------------

  private writeFile(
    fileUpload: FileUpload,
    socket: Socket,
    access: Access,
  ): void {
    fileUpload.button.addEventListener("click", () => {
      if (fileUpload.input.files) {
        for (let i = 0; i < fileUpload.input.files.length; i++) {
          const fileName = fileUpload.input.files.item(i)?.name;
          const fileSize = fileUpload.input.files.item(i)?.size;
          const fileStream = fileUpload.input.files.item(i)?.stream();
          if (
            fileName &&
            fileSize &&
            fileStream &&
            this.fileWatchChannel?.readyState === "open"
          ) {
            // console.log(`file name: ${fileName} | size: ${fileSize}`);
            this.fileReaderList[fileName] = {
              fileSize: fileSize,
              fileStream: fileStream,
            };
            // reqWriteFile(this.fileWatchChannel, { fileName, fileSize });
            this.reqWriteTransfer(socket, access, { fileName, fileSize });
          }
        }
      } else {
        console.log(`nothing`);
      }
    });
  }

  private async reqFileWatch(socket: Socket, access: Access): Promise<void> {
    const type = `fileWatch`;
    const offerSDP = (sdp: string) =>
      sendFileOfferSDP(socket, access, { type, sdp });

    this.fileWatchConnection = createPeerConnection(
      offerSDP,
      peerConnectionConfig,
    );
    this.fileWatchChannel = this.fileWatchConnection.createDataChannel(type, {
      ordered: true,
    });

    this.fileWatchChannel.onclose = () => {
      if (this.fileDownload) removeFileList(this.fileDownload);
    };

    this.fileWatchChannel.onopen = () => {
      reqWatchList(this.fileWatchChannel);
    };

    this.fileWatchChannel.onmessage = async (event) => {
      const parse = parseAppProtocol(new Uint8Array(event.data as ArrayBuffer));
      if (parse.status === appStatus.fileWatch) {
        const data: FileWatchMsg = decodeParseData(parse.data);

        if (this.fileDownload)
          updateFiles(this.fileDownload, data, async (fileName: string) => {
            if (this.fileWatchChannel?.readyState === "open") {
              reqReadFile(this.fileWatchChannel, { fileName });
            }
          });
      }
    };

    // this.screenConnection.onconnectionstatechange = () => {
    //   console.log(`screen: ${this.screenConnection?.connectionState} | ${this.screenChannel?.readyState}`)
    // };

    await setLocalOffer(this.fileWatchConnection);

    return;
  }

  // listen Answer SDP
  private async setFileWatch(
    answerSdp: string,
  ): Promise<RTCDataChannel | undefined> {
    if (this.fileWatchChannel && this.fileWatchConnection) {
      await setRemoteAnswer(answerSdp, this.fileWatchConnection);
      return this.fileWatchChannel;
    }
    return undefined;
  }

  // listen Offer SDP & send Answer SDP
  private async resReadTransfer(
    socket: Socket,
    access: Access,
    transferId: string,
    offerSdp: string,
  ): Promise<boolean> {
    const answerSDP = (answerSDP: string) =>
      sendFileAnswerSDP(socket, access, {
        type: `readTransfer`,
        sdp: answerSDP,
        transferId,
      });

    let stamp = -1;
    let checkStamp = -1;
    let limit = 3;
    let isClosed = false;

    let receivedSize = 0;
    let fileName: string | undefined;
    let fileSize: number | undefined;
    let writer: WritableStreamDefaultWriter | undefined;

    const transferConnection = createPeerConnection(
      answerSDP,
      peerConnectionConfig,
    );
    transferConnection.ondatachannel = async (event: RTCDataChannelEvent) => {
      // read
      event.channel.onmessage = (ev) => {
        const parse = parseAppProtocol(new Uint8Array(ev.data as ArrayBuffer));
        if (parse.status === appStatus.fileAcceptRead) {
          const data: AcceptReadFile = decodeParseData(parse.data);
          fileName = data.fileName;
          fileSize = data.fileSize;

          const fileStream = streamSaver.createWriteStream(fileName, {
            size: fileSize,
          });

          writer = fileStream.getWriter();
          if (fileSize === 0) {
            writer.close();
            return;
          }
        } else if (fileName && fileSize && writer) {
          stamp = parse.order;
          receivedSize += parse.data.byteLength;
          writer.write(parse.data);

          if (receivedSize === fileSize) {
            isClosed = true;
            writer.close();
            transferConnection.close();
          }
        } else if (parse.status === appStatus.fileError) {
          if (writer) {
            writer.abort();
            transferConnection.close();
          }
        }
      };
    };

    await setRemoteOffer(offerSdp, transferConnection);

    // timeout check for read file
    // eslint-disable-next-line no-constant-condition
    while (1) {
      await timer(2 * 1000);
      if (fileName && fileSize && writer) {
        if (isClosed) break;
        if (stamp === checkStamp) {
          limit--;
          if (limit == 0) {
            console.log(`timeout recieve file: ${fileName}`);
            writer.abort();
            transferConnection.close();

            return false;
          }
        } else {
          checkStamp = stamp;
        }
      }
    }

    return true;
  }

  // send Offer SDP
  private async reqWriteTransfer(
    socket: Socket,
    access: Access,
    writeFile: ReqWriteFile,
  ): Promise<void> {
    const type = `writeTransfer`;
    const transferId = getRandomStringId();
    const offerSDP = (sdp: string) =>
      sendFileOfferSDP(socket, access, { type, sdp, transferId });

    const writeConnection = createPeerConnection(
      offerSDP,
      peerConnectionConfig,
    );

    const writeChannel = writeConnection.createDataChannel(type, {
      ordered: true,
    });

    writeChannel.onclose = () => {
      delete this.transferList[transferId];
    };

    writeChannel.onerror = () => {
      delete this.transferList[transferId];
    };

    writeChannel.onopen = () => {
      reqWriteFile(writeChannel, writeFile);
    };

    writeChannel.onmessage = async (ev) => {
      const parse = parseAppProtocol(new Uint8Array(ev.data as ArrayBuffer));

      if (parse.status === appStatus.fileAcceptWrite) {
        const data: AcceptWriteFile = decodeParseData(parse.data);
        const info = this.fileReaderList[data.fileName];

        // console.log(`write transfer ${parse.status}`);
        if (info?.fileSize === data.fileSize) {
          await sendFileBuffer(writeChannel, info.fileStream, info.fileSize);
          delete this.fileReaderList[data.fileName];
        }
      }
    };

    this.transferList[transferId] = writeConnection;

    await setLocalOffer(writeConnection);

    return;
  }

  // listen answer SDP
  private async setWriteTransfer(fileSdp: FileSDP): Promise<boolean> {
    if (fileSdp.transferId) {
      // console.log(`answer: ${JSON.stringify(fileSdp)}`);
      const answerSdp = fileSdp.sdp;
      const connection = this.transferList[fileSdp.transferId];
      if (connection) {
        return await setRemoteAnswer(answerSdp, connection);
      }
    }
    return false;
  }
}
