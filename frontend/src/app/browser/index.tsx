import { useEffect, useRef, useState } from 'react';
import { Impromptu } from '../../browser';
import { AccessDesktop } from './accessDesktop';

export const impromptu = new Impromptu();

export const ImpromptuBrowser: React.FC<{setLock: React.Dispatch<React.SetStateAction<boolean>>}> = ({setLock}) => {
  const desktopIdRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<[string,string]>();

  const once = useRef(true);
  useEffect(()=>{
    if(info){
      if (once.current) {
        once.current = false;
        impromptu.initialize();
        setLock(true);
      }
      impromptu.reqDesktopAuth(info[0], info[1]);
    }
  }, [info]);

  return (
    <>
      <div id="setOption">
        <p>
          <div>Desktop ID: <input ref={desktopIdRef}/></div>
          <div>Password: <input ref={passwordRef} defaultValue={"impromptu"} /></div>
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
