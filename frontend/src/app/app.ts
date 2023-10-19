import { io, Socket } from "socket.io-client";
import {
  BrowserWebRTC,
  initShareApp,
  initShareFile,
  listenAnswerSDP,
  reqAccess,
} from "../browser";
import { Access } from "../browser/signaling/type";
import { timer } from "../browser/util";

const createWebSocket = (): Socket => {
  const sock = io("/");
  sock.on("end", () => {
    sock.close();
  });
  sock.on("disconnect", () => {
    console.log("socket closed");
    sock.close();
  });
  return sock;
};

const clientList: BrowserWebRTC[] = [];
const socket = createWebSocket();

const setOption: HTMLDivElement = <HTMLDivElement>(
  document.getElementById("setOption")
);

const deleteClient = (desktopList: HTMLElement, client: BrowserWebRTC) => {
  clientList.forEach((value, key) => {
    if (value.access.desktopId == client.access.desktopId) {
      desktopList.removeChild(desktopList.childNodes.item(key));
      //console.log("key: " + key + ", " + clientList[key].desktopAddress);
      //console.log(document.getElementById('screen').childNodes);
      delete clientList[key];
      clientList.splice(key, 1);
    }
  });
};

const setOptionForm = (socket: Socket) => {
  const optionForm = document.createElement("p");
  setOption.appendChild(optionForm);

  optionForm.appendChild(document.createTextNode(" Desktop ID: "));
  const inputDesktopId = document.createElement("input");
  optionForm.appendChild(inputDesktopId);

  optionForm.appendChild(document.createTextNode(" Password: "));
  const inputPwd = document.createElement("input");
  inputPwd.value = "impromptu";
  optionForm.appendChild(inputPwd);

  const sendButton = document.createElement("button");
  sendButton.textContent = "開始";
  optionForm.appendChild(sendButton);
  sendButton.onclick = () =>
    reqAccess(socket, inputDesktopId.value, inputPwd.value, start);

  listenAnswerSDP(socket, clientList);
};

const start = async (
  socket: Socket,
  access: Access,
  rtcConfiguration: RTCConfiguration,
): Promise<void> => {
  const client: BrowserWebRTC = {
    access: access,
    shareApp: initShareApp(access.desktopId, rtcConfiguration),
    shareFile: initShareFile(access.desktopId, rtcConfiguration),
  };

  const desktopList = document.getElementById("desktopList");

  if (desktopList) {
    const desktopDiv = document.createElement("div");
    desktopDiv.id = client.access.desktopId;
    desktopDiv.textContent = `Desktop ID: ${client.access.desktopId}`;
    desktopList.appendChild(desktopDiv);

    // screen
    const screenInfo = document.createElement("p");
    desktopDiv.appendChild(screenInfo);
    const screenShareButton = document.createElement("button");
    screenShareButton.textContent = "Screen";
    screenInfo.appendChild(screenShareButton);

    screenShareButton.onclick = async () => {
      let count = 10;
      screenShareButton.disabled = true;
      await client.shareApp.reqShareApp(socket, access);
      while (!client.shareApp.isChannelOpen()) {
        await timer(1 * 1000);
        count--;
        if (count < 0) {
          client.shareApp.closeShareApp();
          if (!client.shareFile.isChannelOpen()) {
            deleteClient(desktopList, client);
            return;
          }
          screenShareButton.disabled = false;
          return;
        }
      }
      const screen = document.createElement("p");
      screenInfo.appendChild(screen);
      screen.appendChild(client.shareApp.canvas);
    };

    // file
    const fileInfo = document.createElement("p");
    desktopDiv.appendChild(fileInfo);
    const fileShareButton = document.createElement("button");
    fileShareButton.textContent = "File";
    fileInfo.appendChild(fileShareButton);

    fileShareButton.onclick = async () => {
      let count = 10;
      fileShareButton.disabled = true;
      await client.shareFile.reqShareFile(socket, client.access);
      while (!client.shareFile.isChannelOpen()) {
        await timer(1 * 1000);
        count--;
        if (count < 0) {
          client.shareFile.closeShareFile();
          if (!client.shareApp.isChannelOpen()) {
            deleteClient(desktopList, client);
            return;
          }
          fileShareButton.disabled = false;
          return;
        }
      }

      fileInfo.appendChild(client.shareFile.fileDownload);
      fileInfo.appendChild(client.shareFile.fileUpload.input);
      fileInfo.appendChild(client.shareFile.fileUpload.button);
    };

    // remove already client
    deleteClient(desktopList, client);

    clientList.push(client);
  }
};

setOptionForm(socket);
