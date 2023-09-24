import { appStatus, appendBuffer, parseAppProtocol } from "../protocol";

// -------- Control

// ------- Screen

export const reflectScreen = (
  channel: RTCDataChannel,
  image: HTMLImageElement,
): void => {
  let preId: number;
  let order: number = 0;
  let tmp: Uint8Array;

  channel.onmessage = (event) => {
    const buf = event.data;
    const parse = parseAppProtocol(new Uint8Array(buf));
    if (parse.status === appStatus.once) {
      const imgBase64 = btoa(
        new Uint8Array(parse.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );
      image.src = "data:image/jpeg;base64," + imgBase64;
    } else if (parse.status === appStatus.start) {
      tmp = parse.data;
      preId = parse.id;
      order = parse.order + 1;
    } else if (
      parse.status === appStatus.middle &&
      parse.id === preId &&
      parse.order === order
    ) {
      tmp = appendBuffer(tmp, parse.data);
      order++;
    } else if (
      parse.status === appStatus.end &&
      parse.id === preId &&
      parse.order === order
    ) {
      tmp = appendBuffer(tmp, parse.data);
      const imgBase64 = btoa(
        new Uint8Array(tmp).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );
      image.src = "data:image/jpeg;base64," + imgBase64;
      tmp = new Uint8Array(0);
      order = 0;
    } else {
      order = 0;
      tmp = new Uint8Array(0);
    }
  };
};

// ------- Audio
