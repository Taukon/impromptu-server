import { getRandomId } from "../utils";
import {
  AccessToken,
  BrowserId,
  BrowserUserList,
  DesktopId,
  DesktopUser,
  DesktopUserList,
  ProxyId,
  ProxyUser,
  ProxyUserList,
} from "./manage";

export class UserManage {
  private desktopUser: DesktopUserList = {};
  private browserUser: BrowserUserList = {};
  private proxyUser: ProxyUserList = {};

  public showUsers(msg?: string) {
    console.log(
      `B: ${Object.entries(this.browserUser).length} | D: ${Object.entries(this.desktopUser).length} | P: ${Object.entries(this.proxyUser).length} | ${msg}`,
    );
  }

  public addProxyUser(socketId: string): ProxyId {
    const proxyId = socketId;
    this.proxyUser[proxyId] = { socketId: socketId };
    return proxyId;
  }

  public getProxyUser(proxyId: string): ProxyUser | undefined {
    const proxyUser = this.proxyUser[proxyId];
    return proxyUser;
  }

  public removeProxyUser(proxyId: string): void {
    if (this.proxyUser[proxyId]) delete this.proxyUser[proxyId];
  }

  public addDesktopUser(socketId: string): DesktopId {
    const desktopId = socketId;
    this.desktopUser[desktopId] = { socketId: socketId };
    return desktopId;
  }

  public addProxyInfo(desktopId: string, passwordForProxy: string): boolean {
    const desktopUser = this.desktopUser[desktopId];
    if (desktopUser) {
      desktopUser.passwordForProxy = passwordForProxy;
      this.desktopUser[desktopId] = desktopUser;
      return true;
    }
    return false;
  }

  public getDesktopUser(desktopId: string): DesktopUser | undefined {
    const desktopUser = this.desktopUser[desktopId];
    return desktopUser;
  }

  public removeDesktopUser(desktopId: string): void {
    if (this.desktopUser[desktopId]) delete this.desktopUser[desktopId];
  }

  public addBrowserUser(socketId: string): BrowserId {
    const browserId = socketId;
    this.browserUser[browserId] = { socketId: socketId };
    return browserId;
  }

  public createBrowserToken(
    browserId: string,
    desktopId: string,
  ): AccessToken | undefined {
    if (this.browserUser[browserId]) {
      const token = getRandomId();
      this.browserUser[browserId][desktopId] = token;
      return token;
    }
    return undefined;
  }

  public getBrowserSocketId(browserId: string): string | undefined {
    return this.browserUser[browserId]?.socketId;
  }

  private getBrowserToken(
    browserId: string,
    desktopId: string,
  ): AccessToken | undefined {
    const browserUser = this.browserUser[browserId];
    if (browserUser) {
      const token = browserUser[desktopId];
      return token;
    }
    return undefined;
  }

  public removeBrowserUser(browserId: string): void {
    if (this.browserUser[browserId]) delete this.browserUser[browserId];
  }

  public checkBrowserToken(
    browserId: string,
    desktopId: string,
    token: string,
  ): boolean {
    return this.getBrowserToken(browserId, desktopId) === token;
  }
}
