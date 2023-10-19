export type Callback<T> = (res: T) => void;

// type RTCBundlePolicy = "balanced" | "max-bundle" | "max-compat";
// interface RTCIceServer {
//   credential?: string;
//   urls: string | string[];
//   username?: string;
// };
// type RTCIceTransportPolicy = "all" | "relay";
// type RTCRtcpMuxPolicy = "require";

// interface RTCDTMFSenderEventMap {
//   "tonechange": RTCDTMFToneChangeEvent;
// }

// interface RTCConfiguration {
//   bundlePolicy?: RTCBundlePolicy;
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   certificates?: any;//RTCCertificate[];
//   iceCandidatePoolSize?: number;
//   iceServers?: RTCIceServer[];
//   iceTransportPolicy?: RTCIceTransportPolicy;
//   rtcpMuxPolicy?: RTCRtcpMuxPolicy;
// }

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

export type AuthProxyInfo = {
  proxyId: string;
  password: string;
  desktopId: string;
};

export type ReqProxyInfo = {
  password: string;
  desktopId: string;
};

export type ReqAuthProxyInfo = {
  proxyId: string;
  proxyPassword: string;
  desktopId: string;
  desktopPassword: string;
};
