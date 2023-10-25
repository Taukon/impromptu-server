import { automationProxy, connectDesktop } from "../proxy";

const modeSwitch: HTMLDivElement = <HTMLDivElement>(
  document.getElementById("modeSwitch")
);

const setOption: HTMLDivElement = <HTMLDivElement>(
  document.getElementById("setOption")
);

let mode = true;
const setOptionForm = () => {
  const modeForm = document.createElement("p");
  modeSwitch.appendChild(modeForm);
  const modeButton = document.createElement("button");
  modeForm.appendChild(modeButton);
  modeButton.textContent = "Proxy Mode";

  modeButton.onclick = async () => {
    mode = !mode;
    if (mode) {
      modeButton.disabled = true;
      setManualOptionForm(setOption);
      modeButton.disabled = false;
    } else {
      modeButton.disabled = true;
      setAutoOptionForm(setOption);
      modeButton.disabled = false;
    }
  };

  setManualOptionForm(setOption);
};

const setManualOptionForm = (parentNode: HTMLDivElement) => {
  (<HTMLDivElement>document.getElementById("manualProxy"))?.remove();
  (<HTMLDivElement>document.getElementById("autoProxy"))?.remove();
  const optionForm = document.createElement("p");
  optionForm.id = "manualProxy";
  optionForm.textContent = `Manual Mode| `;
  parentNode.appendChild(optionForm);

  optionForm.appendChild(document.createTextNode("Original Desktop ID: "));
  const inputDesktopId = document.createElement("input");
  optionForm.appendChild(inputDesktopId);

  optionForm.appendChild(document.createTextNode(" Password: "));
  const inputPwd = document.createElement("input");
  inputPwd.value = "impromptu";
  optionForm.appendChild(inputPwd);

  const sendButton = document.createElement("button");
  sendButton.textContent = "開始";
  optionForm.appendChild(sendButton);

  const showDesktopId = (
    originalDesktopId: string,
    proxyDesktopId: string,
    password: string,
  ) => {
    const idInfo = document.createElement("p");
    idInfo.id = proxyDesktopId;
    optionForm.appendChild(idInfo);
    idInfo.textContent = `Original DesktopID: ${originalDesktopId} -> Proxy DesktopID: ${proxyDesktopId} | Password: ${password}`;
  };
  const removeDesktopId = (proxyDesktopId: string) => {
    (<HTMLDivElement>document.getElementById(proxyDesktopId))?.remove();
  };

  sendButton.onclick = () => {
    connectDesktop(
      inputDesktopId.value,
      inputPwd.value,
      showDesktopId,
      removeDesktopId,
    );
    modeSwitch.remove();
  };
};

const setAutoOptionForm = (parentNode: HTMLDivElement) => {
  (<HTMLDivElement>document.getElementById("manualProxy"))?.remove();
  (<HTMLDivElement>document.getElementById("autoProxy"))?.remove();
  const optionForm = document.createElement("p");
  optionForm.id = "autoProxy";
  optionForm.textContent = `Auto Mode| `;
  parentNode.appendChild(optionForm);

  optionForm.appendChild(
    document.createTextNode("Proxy AutoMation Password: "),
  );
  const inputPwd = document.createElement("input");
  inputPwd.value = "impromptu";
  optionForm.appendChild(inputPwd);

  const sendButton = document.createElement("button");
  sendButton.textContent = "開始";
  optionForm.appendChild(sendButton);

  const showProxyId = (proxyId: string, password: string) => {
    const idInfo = document.createElement("p");
    idInfo.id = proxyId;
    optionForm.appendChild(idInfo);
    idInfo.textContent = `AutoMation ProxyID: ${proxyId} | Password: ${password}`;
  };

  const showDesktopId = (
    originalDesktopId: string,
    proxyDesktopId: string,
    password: string,
  ) => {
    const idInfo = document.createElement("p");
    idInfo.id = proxyDesktopId;
    optionForm.appendChild(idInfo);
    idInfo.textContent = `Original DesktopID: ${originalDesktopId} -> Proxy DesktopID: ${proxyDesktopId} | Password: ${password}`;
  };
  const removeDesktopId = (proxyDesktopId: string) => {
    (<HTMLDivElement>document.getElementById(proxyDesktopId))?.remove();
  };

  sendButton.onclick = () => {
    automationProxy(
      inputPwd.value,
      showProxyId,
      showDesktopId,
      removeDesktopId,
    );
    modeSwitch.remove();
  };
};

setOptionForm();
