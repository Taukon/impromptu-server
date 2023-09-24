import {
  appHeader,
  appMax,
  appMaxId,
  appStatus,
  createAppProtocol,
  createAppProtocolFromJson,
  getRandomInt,
} from "../protocol";
import { timer } from "../util";
import { ReqReadFile, ReqWriteFile } from "./type";

export const reqWatchList = (channel: RTCDataChannel | undefined): void => {
  if (channel?.readyState === "open") {
    const id = getRandomInt(appMaxId);
    const data = createAppProtocol(
      new Uint8Array(0),
      id,
      appStatus.fileRequestList,
      0,
    );
    channel.send(data);
  }
};

export const reqWriteFile = (
  channel: RTCDataChannel | undefined,
  reqWriteFile: ReqWriteFile,
): void => {
  if (channel?.readyState === "open") {
    const jsonString = JSON.stringify(reqWriteFile);
    const data = createAppProtocolFromJson(
      jsonString,
      appStatus.fileRequestWrite,
    );

    channel.send(data);
  }
};

export const reqReadFile = (
  channel: RTCDataChannel | undefined,
  reqReadFile: ReqReadFile,
): void => {
  if (channel?.readyState === "open") {
    const jsonString = JSON.stringify(reqReadFile);
    const data = createAppProtocolFromJson(
      jsonString,
      appStatus.fileRequestRead,
    );
    channel.send(data);
  }
};

const loop = 5;
export const sendFileBuffer = async (
  channel: RTCDataChannel,
  fileStream: ReadableStream<Uint8Array>,
  fileSize: number,
): Promise<void> => {
  const reader = fileStream.getReader();
  const id = getRandomInt(appMaxId);
  const chunkSize = appMax - appHeader;
  let order = 0;
  let total = 0;
  try {
    // eslint-disable-next-line no-constant-condition
    while (1) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value.byteLength > chunkSize) {
        let sliceOffset = 0;
        console.log(`Buffer Size Over`);
        while (sliceOffset < value.byteLength) {
          const sliceBuf = value.slice(sliceOffset, sliceOffset + chunkSize);

          total += sliceBuf.byteLength;
          if (order === 0) {
            const appData = createAppProtocol(
              sliceBuf,
              id,
              appStatus.start,
              order,
            );
            channel.send(appData);
          } else if (total < fileSize) {
            const appData = createAppProtocol(
              sliceBuf,
              id,
              appStatus.middle,
              order,
            );
            channel.send(appData);
          } else {
            const appData = createAppProtocol(
              sliceBuf,
              id,
              appStatus.end,
              order,
            );
            channel.send(appData);
          }

          sliceOffset += sliceBuf.byteLength;
          order++;
          await timer(loop);
        }
      } else {
        total += value.byteLength;
        console.log(`total ${total}`);

        // once
        if (fileSize === total && order === 0) {
          const appData = createAppProtocol(value, id, appStatus.start, order);
          channel.send(appData);
          const appDataTmp = createAppProtocol(
            new Uint8Array(0),
            id,
            appStatus.end,
            order + 1,
          );
          channel.send(appDataTmp);
        } else if (order === 0) {
          const appData = createAppProtocol(value, id, appStatus.start, order);
          channel.send(appData);
        } else if (total < fileSize) {
          const appData = createAppProtocol(value, id, appStatus.middle, order);
          channel.send(appData);
        } else {
          const appData = createAppProtocol(value, id, appStatus.end, order);
          channel.send(appData);
        }

        order++;
        await timer(100);
      }
    }
    reader.releaseLock();
  } catch (error) {
    console.log(`closed transport`);
    console.log(error);
  }
};

export const getRandomStringId = (): string => {
  const S = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  return Array.from(crypto.getRandomValues(new Uint32Array(10)))
    .map((v) => S[v % S.length])
    .join("");
};
