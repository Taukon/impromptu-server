import { Server, Socket } from "socket.io";
import { UserManage } from "../userManage";
import { AppSDP, AuthProxyInfo, FileSDP, ReqAuthProxyInfo } from "./type";
import { peerConnectionConfig } from "../config";

export const signalingDesktop = (
  proxyServer: Server,
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
      proxyServer.to(proxyUser.socketId).emit("reqProxyAuth", authInfo);
    }
  });

  // App

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
};
