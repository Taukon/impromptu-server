import { useEffect, useRef, useState } from "react";
import { impromptu } from ".";

export const AutoMode: React.FC<{setLock: React.Dispatch<React.SetStateAction<boolean>>}> = ({setLock}) => {
    const passwordRef = useRef<HTMLInputElement>(null);
    const [proxyPassword, setProxyPassword] = useState<string>();
    const [proxy, setProxy] = useState<[string, string, string][]>([]);
    const [proxyId, setProxyId] = useState<string>();
  
    impromptu.showIdFunc = (desktopId: string, replaceId: string, password: string) => {
      setProxy([...proxy, [desktopId, replaceId, password]]);
    };

    impromptu.removeIdFunc = (replaceId: string) => {
        setProxy(proxy.filter((v) => {replaceId != v[1]}));
    };

    impromptu.showProxyIdFunc = (proxyId) => {
        setProxyId(proxyId);
    };

    const once = useRef(true);
    useEffect(()=>{
        if(proxyPassword){
            if (!once.current) return;
            once.current = false;

            impromptu.autoConnectDesktop(proxyPassword);
        }
      }, [proxyPassword]);
    
    return (
        <>
            <p>Auto Mode</p>
            <p>Proxy Password: <input ref={passwordRef} defaultValue={"impromptu"} /></p>
            <button onClick={()=>{
                if(passwordRef.current?.value){
                    setLock(true);
                    setProxyPassword(passwordRef.current.value);
                }
            }} disabled={proxyPassword ? true : false}>開始</button>
            {proxyId && proxyPassword && <p>Proxy ID: {proxyId} | Password: {proxyPassword}</p>}
            {proxy.map( v => {
                return (
                    <>
                    <p>Original ID: {v[0]} | Replace ID: {v[1]} | Password: {v[2]}</p>
                    </>
                );
            })}
        </>
    );
};