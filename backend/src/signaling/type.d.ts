export type Callback<T> = (res: T) => void;

export type Access = {
  desktopId: string;
  token: string;
};

type AuthInfo = {
  desktopId: string;
  password: string;
  browserId: string;
};

export type ClientInfo = {
  desktopId: string;
  password: string;
};

export type AppSDP = {
  type: string;
  sdp: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appData?: any;
};

export type FileSDP = {
  type: string;
  sdp: string;
  transferId?: string;
};
