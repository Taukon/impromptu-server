import { Server, Socket } from "socket.io";
import { UserManage } from "../userManage";
import { Access, AppSDP, AuthInfo, ClientInfo, FileSDP } from "./type";

export const signalingBrowser = (
  desktopServer: Server,
  socket: Socket,
  userManage: UserManage,
): void => {
  const browserId = userManage.addBrowserUser(socket.id);

  socket.on("disconnect", () => {
    userManage.removeBrowserUser(browserId);
  });

  socket.on("reqAuth", (info: ClientInfo) => {
    const authInfo: AuthInfo = {
      desktopId: info.desktopId,
      password: info.password,
      browserId: browserId,
    };

    const desktopSocketId = userManage.getDesktopUser(info.desktopId)?.socketId;
    if (desktopSocketId) {
      desktopServer.to(desktopSocketId).emit("reqAuth", authInfo);
    } else {
      socket.emit("resAuth");
    }
  });

  // App

  // B -offer-> D
  socket.on(`shareApp-offerSDP`, (access: Access, appSdp: AppSDP) => {
    if (
      userManage.checkBrowserToken(browserId, access.desktopId, access.token)
    ) {
      const desktopSocketId = userManage.getDesktopUser(access.desktopId)
        ?.socketId;
      if (desktopSocketId)
        desktopServer
          .to(desktopSocketId)
          .emit(`shareApp-offerSDP`, browserId, appSdp);
    }
  });

  // File

  // B -offer-> D
  socket.on(`shareFile-offerSDP`, (access: Access, fileSdp: FileSDP) => {
    if (
      userManage.checkBrowserToken(browserId, access.desktopId, access.token)
    ) {
      const desktopSocketId = userManage.getDesktopUser(access.desktopId)
        ?.socketId;
      if (desktopSocketId)
        desktopServer
          .to(desktopSocketId)
          .emit(`shareFile-offerSDP`, browserId, fileSdp);
    }
  });
};
