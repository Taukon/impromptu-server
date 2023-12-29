import { useEffect, useRef, useState } from "react";
import { timer } from "../../browser/util";
import { impromptu } from ".";

export const AccessDesktop: React.FC = () => {
  const [res, setRes] = useState<{id: string}>();
  const [openShare, setOpenShare] = useState<boolean>(false);

  const once = useRef(true);
  useEffect(()=>{    
    if (!once.current) return;
    impromptu.newDesktopFuncForUI = (v) => {setRes({...res, id: v.access.desktopId})};
    once.current = false;
  }, []);


  return (
    
    <div id="desktopList" style={{flexDirection: 'column'}}>
      {
        impromptu.browsers.map((v, index) => {
          return (
            <div key={index}>
              <div key={index}>Desktop ID: {v.access.desktopId}</div>
              <p>
                <button ref={
                  c => {
                    if(c){
                      c.disabled = impromptu.isOpenShareFile(v.access.desktopId);
                      c.onclick = async () => {
                        let count = 10;
                        c.disabled = true;
                        await impromptu.reqShareFile(v.access.desktopId);
                        while (!v.shareFile.isChannelOpen()) {
                          await timer(1 * 1000);
                          count--;
                          if (count < 0) {
                            v.shareFile.closeShareFile();
                            if (!impromptu.isOpenShareApp(v.access.desktopId)) {
                              impromptu.deleteDesktop(v.access.desktopId);
                              return;
                            }
                            c.disabled = false;
                            return;
                          }
                        }
                        setOpenShare(!openShare);
                      };
                    }
                  }
                }>
                  File
                </button>
                <div ref={c => {
                  while(c?.firstChild){
                    c.removeChild(c.firstChild);
                  }
                  if(impromptu.isOpenShareFile(v.access.desktopId)){
                    c?.appendChild(v.shareFile.fileDownload);
                    c?.appendChild(v.shareFile.fileUpload.input);
                    c?.appendChild(v.shareFile.fileUpload.button);
                  }
                }}></div>
              </p>
              <p>
                <button ref={
                  c => {
                    if(c){
                      c.disabled = impromptu.isOpenShareApp(v.access.desktopId);
                      c.onclick = async () => {
                        let count = 10;
                        c.disabled = true;
                        await impromptu.reqShareApp(v.access.desktopId);
                        while (!v.shareApp.isChannelOpen()) {
                          await timer(1 * 1000);
                          count--;
                          if (count < 0) {
                            v.shareApp.closeShareApp();
                            if (!impromptu.isOpenShareFile(v.access.desktopId)) {
                              impromptu.deleteDesktop(v.access.desktopId);
                              return;
                            }
                            c.disabled = false;
                            return;
                          }
                        }
                        setOpenShare(!openShare);
                      };
                    }
                  }
                }>
                  Screen
                </button>
                <div ref={c => {
                  while(c?.firstChild){
                    c.removeChild(c.firstChild);
                  }
                  if(impromptu.isOpenShareApp(v.access.desktopId))
                    c?.append(v.shareApp.canvas);
                }}></div>
              </p>
            </div>
          )
        })
      }
    </div>
  );
};