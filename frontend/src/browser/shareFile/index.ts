import { Socket } from "socket.io-client";
import { Access, FileSDP } from "../signaling/type";
import { FileDownload, FileUpload, FileWatchMsg } from "../monitorFile/type";
import { removeFileList, updateFiles } from "../monitorFile";
import {
  appHeader,
  appMax,
  appMaxId,
  appStatus,
  createAppProtocol,
  createAppProtocolFromJson,
  decodeParseData,
  getRandomInt,
  parseAppProtocol,
} from "../protocol";
import { sendFileOfferSDP } from "../signaling";
import {
  createPeerConnection,
  setLocalOffer,
  setRemoteAnswer,
} from "../peerConnection";
import { getRandomStringId, sendFileBuffer } from "./utils";
import {
  AcceptReadFile,
  ReqReadFile,
  ReqWriteFile,
  TransferList,
} from "./type";
import { timer } from "../util";
import streamSaver from "streamsaver";

export class ShareFile {
  public desktopId: string;
  public fileUpload: FileUpload;
  public fileDownload: FileDownload;

  private rtcConfiguration: RTCConfiguration;
  private fileWatchChannel?: RTCDataChannel;
  private fileWatchConnection?: RTCPeerConnection;

  private transferList: TransferList = {};

  constructor(desktopId: string, rtcConfiguration: RTCConfiguration) {
    this.rtcConfiguration = rtcConfiguration;
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
    } else if (
      fileSdp.type === `writeTransfer` ||
      fileSdp.type === `readTransfer`
    ) {
      await this.setFileTransfer(fileSdp);
    }
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
            this.reqWriteTransfer(
              socket,
              access,
              { fileName, fileSize },
              fileStream,
            );
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
      this.rtcConfiguration,
    );
    this.fileWatchChannel = this.fileWatchConnection.createDataChannel(type, {
      ordered: true,
    });

    this.fileWatchChannel.onclose = () => {
      if (this.fileDownload) removeFileList(this.fileDownload);
    };

    this.fileWatchChannel.onopen = () => {
      const id = getRandomInt(appMaxId);
      const data = createAppProtocol(
        new Uint8Array(0),
        id,
        appStatus.fileRequestList,
        0,
      );
      this.fileWatchChannel?.send(data);
    };

    this.fileWatchChannel.onmessage = async (event) => {
      const parse = parseAppProtocol(new Uint8Array(event.data as ArrayBuffer));
      if (parse.status === appStatus.fileWatch) {
        const data: FileWatchMsg = decodeParseData(parse.data);

        if (this.fileDownload)
          updateFiles(this.fileDownload, data, async (fileName: string) => {
            if (this.fileWatchChannel?.readyState === "open") {
              this.reqReadTransfer(socket, access, { fileName: fileName });
            }
          });
      }
    };

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

  // send Offer SDP
  private async reqReadTransfer(
    socket: Socket,
    access: Access,
    readFile: ReqReadFile,
  ): Promise<boolean> {
    const type = `readTransfer`;
    const transferId = getRandomStringId();
    const offerSDP = (sdp: string) =>
      sendFileOfferSDP(socket, access, { type, sdp, transferId });

    let stamp = -1;
    let checkStamp = -1;
    let limit = 3;
    let isClosed = false;

    let receivedSize = 0;
    let fileName: string | undefined;
    let fileSize: number | undefined;
    let writer: WritableStreamDefaultWriter | undefined;

    const readConnection = createPeerConnection(
      offerSDP,
      this.rtcConfiguration,
    );

    const readChannel = readConnection.createDataChannel(type, {
      ordered: true,
    });

    const reqReadFile = (): void => {
      const jsonString = JSON.stringify(readFile);
      const data = createAppProtocolFromJson(
        jsonString,
        appStatus.fileRequestRead,
      );
      readChannel.send(data);
    };

    readChannel.onclose = () => {
      delete this.transferList[transferId];
    };

    readChannel.onerror = () => {
      delete this.transferList[transferId];
    };

    readChannel.onopen = () => {
      reqReadFile();
    };

    // read
    readChannel.onmessage = async (ev) => {
      const parse = parseAppProtocol(new Uint8Array(ev.data as ArrayBuffer));

      if (fileName && fileSize && writer) {
        stamp = parse.order;
        receivedSize += parse.data.byteLength;
        writer.write(parse.data);

        if (receivedSize === fileSize) {
          isClosed = true;
          writer.close();
          readConnection.close();
        } else {
          reqReadFile();
        }
      } else if (
        parse.status === appStatus.fileAcceptRead &&
        !fileName &&
        !fileSize &&
        !writer
      ) {
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

        reqReadFile();
      } else if (parse.status === appStatus.fileError) {
        if (writer) {
          writer.abort();
          readConnection.close();
        }
      }
    };

    this.transferList[transferId] = readConnection;

    await setLocalOffer(readConnection);

    // timeout check for read file
    // eslint-disable-next-line no-constant-condition
    while (1) {
      await timer(2 * 1000);
      if (fileName && fileSize && writer) {
        if (isClosed) break;
        if (stamp === checkStamp) {
          limit--;
          if (limit == 0) {
            console.log(`timeout receive file: ${fileName}`);
            writer.abort();
            readConnection.close();

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
    fileStream: ReadableStream<Uint8Array>,
  ): Promise<void> {
    const type = `writeTransfer`;
    const transferId = getRandomStringId();
    const offerSDP = (sdp: string) =>
      sendFileOfferSDP(socket, access, { type, sdp, transferId });

    const writeConnection = createPeerConnection(
      offerSDP,
      this.rtcConfiguration,
    );

    const writeChannel = writeConnection.createDataChannel(type, {
      ordered: true,
    });

    const reader = fileStream.getReader();
    const id = getRandomInt(appMaxId);
    let fileOrder = 0;
    let fileTotal = 0;
    const fileSize = writeFile.fileSize;

    writeChannel.onopen = () => {
      const jsonString = JSON.stringify(writeFile);
      const data = createAppProtocolFromJson(
        jsonString,
        appStatus.fileRequestWrite,
      );

      writeChannel.send(data);
    };

    writeChannel.onclose = () => {
      delete this.transferList[transferId];
      try {
        reader.releaseLock();
      } catch (error) {
        console.log(error);
      }
    };

    writeChannel.onerror = () => {
      delete this.transferList[transferId];
    };

    let sliceOffset = 0;
    let tempBuffer: Uint8Array | undefined;
    const getFileBuffer = async (): Promise<Uint8Array | undefined> => {
      const chunkSize = appMax - appHeader;
      if (tempBuffer && tempBuffer.byteLength > sliceOffset) {
        const sliceBuf = tempBuffer.slice(sliceOffset, sliceOffset + chunkSize);
        sliceOffset += sliceBuf.byteLength;
        return sliceBuf;
      } else {
        tempBuffer = undefined;
        sliceOffset = 0;
        const { done, value } = await reader.read();
        if (!done && value) {
          if (value.byteLength > chunkSize) {
            tempBuffer = value;
            const sliceBuf = tempBuffer.slice(
              sliceOffset,
              sliceOffset + chunkSize,
            );
            sliceOffset += sliceBuf.byteLength;

            return sliceBuf;
          } else {
            return value;
          }
        }
        return undefined;
      }
    };

    writeChannel.onmessage = async (ev) => {
      const parse = parseAppProtocol(new Uint8Array(ev.data as ArrayBuffer));
      if (parse.status === appStatus.fileAcceptWrite) {
        const chunk = await getFileBuffer();
        if (chunk) {
          const { order, total } = await sendFileBuffer(
            writeChannel,
            chunk,
            fileSize,
            id,
            fileOrder,
            fileTotal,
          );
          fileOrder = order;
          fileTotal = total;
        }
      }
    };

    this.transferList[transferId] = writeConnection;

    await setLocalOffer(writeConnection);

    return;
  }

  // listen answer SDP
  private async setFileTransfer(fileSdp: FileSDP): Promise<boolean> {
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
