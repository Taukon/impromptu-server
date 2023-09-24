export type ReqWriteFile = {
  fileName: string;
  fileSize: number;
};

export type ReqReadFile = {
  fileName: string;
};

export type AcceptWriteFile = {
  fileName: string;
  fileSize: number;
};

export type AcceptReadFile = {
  fileName: string;
  fileSize: number;
};

type FileReader = {
  fileSize: number;
  fileStream: ReadableStream<Uint8Array>;
};

export type FileReaderList = {
  [fileName: string]: FileReader;
};

export type TransferList = {
  [id: string]: RTCPeerConnection;
};
