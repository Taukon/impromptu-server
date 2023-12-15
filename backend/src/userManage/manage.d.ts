export type DesktopId = string;
export type DesktopUser = {
  socketId: string;
  passwordForProxy?: string;
};
export type DesktopUserList = {
  [desktopId: DesktopId]: DesktopUser;
};

export type BrowserId = string;
export type AccessToken = string;
export type BrowserUser = {
  socketId: string;
  [desktopId: DesktopId]: AccessToken;
};
export type BrowserUserList = {
  [browserId: string]: BrowserUserInfo;
};

export type ProxyId = string;
export type ProxyUser = {
  socketId: string;
};
export type ProxyUserList = {
  [proxyId: ProxyId]: ProxyUser;
};
