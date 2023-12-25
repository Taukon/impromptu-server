import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Impromptu } from '../../browser';
import { AccessDesktop } from './accessDesktop';

export const impromptu = new Impromptu();

const RootDiv = () => {
  const desktopIdRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<[string,string]>();

  useEffect(()=>{
    console.log(`desktopInfo ${info}`);
    if(info){
        impromptu.reqDesktopAuth(info[0], info[1]);
    }
  }, [info]);

  return (
    <>
      <div id="setOption">
        <p>
          <div>Desktop ID: <input ref={desktopIdRef}/></div>
          {/* <input ref={desktopIdRef}/> */}
          <div>Password: <input ref={passwordRef} defaultValue={"impromptu"} /></div>
          {/* <input ref={passwordRef} defaultValue={"impromptu"} /> */}
          <button onClick={()=>{
            if(desktopIdRef.current?.value && passwordRef.current?.value){
              setInfo([desktopIdRef.current.value, passwordRef.current.value]);
            }
          }}>開始</button>
        </p>
      </div>
      <AccessDesktop />
    </>
  );
};

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<RootDiv />);
