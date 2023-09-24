import { Server, Socket } from "socket.io";
import { UserManage } from "../userManage";
import { AppSDP, FileSDP } from "./type";

export const signalingDesktop = (
  browserServer: Server,
  socket: Socket,
  userManage: UserManage,
): void => {
  const desktopId = userManage.addDesktopUser(socket.id);
  socket.emit("desktopId", desktopId);

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
        browserServer.to(browserSocketId).emit("resAuth", {
          desktopId: desktopId,
          token: accessToken,
        });
      } else {
        browserServer.to(browserSocketId).emit("resAuth");
      }
    } else if (browserSocketId) {
      browserServer.to(browserSocketId).emit("resAuth");
    }
  });

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
