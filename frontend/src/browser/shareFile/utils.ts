import { appHeader, appMax, appStatus, createAppProtocol } from "../protocol";
import { timer } from "../util";

const loop = 5;
export const sendFileBuffer = async (
  channel: RTCDataChannel,
  chunk: Uint8Array,
  fileSize: number,
  id: number,
  order: number,
  total: number,
): Promise<{ order: number; total: number }> => {
  const chunkSize = appMax - appHeader;
  const send = async (data: Uint8Array) => {
    // eslint-disable-next-line no-constant-condition
    while (1) {
      if (channel.bufferedAmount == 0) break;
      await timer(loop);
    }
    channel.send(data);
  };

  if (chunk.byteLength <= chunkSize) {
    total += chunk.byteLength;

    // once
    if (fileSize === total && order === 0) {
      const appData = createAppProtocol(chunk, id, appStatus.start, order);
      await send(appData);
      const appDataTmp = createAppProtocol(
        new Uint8Array(0),
        id,
        appStatus.end,
        order + 1,
      );
      await send(appDataTmp);
    } else if (order === 0) {
      const appData = createAppProtocol(chunk, id, appStatus.start, order);
      await send(appData);
    } else if (total < fileSize) {
      const appData = createAppProtocol(chunk, id, appStatus.middle, order);
      await send(appData);
    } else {
      const appData = createAppProtocol(chunk, id, appStatus.end, order);
      await send(appData);
    }

    order++;
  }

  return { order, total };
};

export const getRandomStringId = (): string => {
  const S = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  return Array.from(crypto.getRandomValues(new Uint32Array(10)))
    .map((v) => S[v % S.length])
    .join("");
};
