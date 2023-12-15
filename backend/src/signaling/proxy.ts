import { Socket } from "socket.io";
import { UserManage } from "../userManage";
import { ReqProxyInfo } from "./type";
import { peerConnectionConfig } from "../config";

export const signalingProxy = (
  socket: Socket,
  userManage: UserManage,
): void => {
  const proxyId = userManage.addProxyUser(socket.id);
  socket.emit("proxyId", proxyId, peerConnectionConfig);

  socket.on("disconnect", () => {
    userManage.removeProxyUser(proxyId);
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
};
