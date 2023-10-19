import { Server, Socket } from "socket.io";
import { UserManage } from "../userManage";
import {
  AppSDP,
  AuthProxyInfo,
  FileSDP,
  ReqAuthProxyInfo,
  ReqProxyInfo,
} from "./type";
import { peerConnectionConfig } from "../config";

export const signalingDesktop = (
  desktopServer: Server,
  browserServer: Server,
  socket: Socket,
  userManage: UserManage,
): void => {
  const desktopId = userManage.addDesktopUser(socket.id);
  socket.emit("desktopId", desktopId, peerConnectionConfig);

  socket.on("disconnect", () => {
    userManage.removeDesktopUser(desktopId);
  });

  socket.on("resAuth", async (res: { browserId: string; status: boolean }) => {
    const browserSocketId = userManage.getBrowserSocketId(res.browserId);

    if (res.status && browserSocketId) {
      const accessToken = userManage.createBrowserToken(
        res.browserId,
        desktopId,
      );
      if (accessToken) {
        browserServer.to(browserSocketId).emit(
          "resAuth",
          {
            desktopId: desktopId,
            token: accessToken,
          },
          peerConnectionConfig,
        );
      } else {
        browserServer.to(browserSocketId).emit("resAuth");
      }
    } else if (browserSocketId) {
      browserServer.to(browserSocketId).emit("resAuth");
    }
  });

  socket.on("reqAutoProxy", (info: ReqAuthProxyInfo) => {
    const proxyUser = userManage.getDesktopUser(info.proxyId);
    if (proxyUser?.socketId) {
      const authInfo: AuthProxyInfo = {
        proxyId: info.proxyId,
        password: info.proxyPassword,
        desktopId: info.desktopId,
      };
      userManage.addProxyInfo(info.desktopId, info.desktopPassword);
      desktopServer.to(proxyUser.socketId).emit("reqProxyAuth", authInfo);
    }
  });

  socket.on(
    "resProxyAuth",
    async (res: { desktopId: string; status: boolean }) => {
      const password = userManage.getDesktopUser(res.desktopId)
        ?.passwordForProxy;
      if (res.status && password) {
        const proxyInfo: ReqProxyInfo = {
          desktopId: res.desktopId,
          password: password,
        };
        socket.emit("reqProxy", proxyInfo);
      }
    },
  );

  // App

  // D -offer-> B
  socket.on(`shareApp-offerSDP`, (browserId: string, appSdp: AppSDP) => {
    const browserSocketId = userManage.getBrowserSocketId(browserId);
    if (browserSocketId) {
      browserServer
        .to(browserSocketId)
        .emit(`shareApp-offerSDP`, desktopId, appSdp);
    }
  });

  // D -answer-> B
  socket.on(`shareApp-answerSDP`, (browserId: string, appSdp: AppSDP) => {
    const browserSocketId = userManage.getBrowserSocketId(browserId);
    // console.log(`type: ${type} | browserId ${browserId} | browserSocketId ${browserSocketId}`)
    if (browserSocketId) {
      browserServer
        .to(browserSocketId)
        .emit(`shareApp-answerSDP`, desktopId, appSdp);
    }
  });

  // File

  // D -offer-> D
  socket.on(`shareFile-offerSDP`, (browserId: string, fileSdp: FileSDP) => {
    const browserSocketId = userManage.getBrowserSocketId(browserId);
    if (browserSocketId) {
      browserServer
        .to(browserSocketId)
        .emit(`shareFile-offerSDP`, desktopId, fileSdp);
    }
  });

  // D -answer-> B
  socket.on(`shareFile-answerSDP`, (browserId: string, fileSdp: FileSDP) => {
    const browserSocketId = userManage.getBrowserSocketId(browserId);
    // console.log(`type: ${type} | browserId ${browserId} | browserSocketId ${browserSocketId}`)
    if (browserSocketId) {
      browserServer
        .to(browserSocketId)
        .emit(`shareFile-answerSDP`, desktopId, fileSdp);
    }
  });

  // socket.on(`shareFile-ice`, (browserId: string, type: string, ice: string) => {
  //   const browserSocketId = userManage.getBrowserSocketId(browserId);
  //   if (browserSocketId) {
  //     browserServer.to(browserSocketId).emit(`shareFile-ice`, desktopId, type, ice);
  //   }
  // });
};
