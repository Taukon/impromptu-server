export type Signaling<T, U> = (params: T) => Promise<U>;

export type AuthInfo = {
  desktopId: string;
  password: string;
  browserId: string;
};

export type ClientInfo = {
  desktopId: string;
  password: string;
};

export type Access = {
  desktopId: string;
  token: string;
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

export type AuthProxyInfo = {
  proxyId: string;
  password: string;
  desktopId: string;
};

export type ReqProxyInfo = {
  password: string;
  desktopId: string;
};
