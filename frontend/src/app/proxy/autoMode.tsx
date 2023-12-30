import { useEffect, useRef, useState } from "react";
import { Statistics } from "./statistics";
import { impromptu } from ".";

export const AutoMode: React.FC<{setModeLock: React.Dispatch<React.SetStateAction<boolean>>}> = ({setModeLock}) => {
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

            impromptu.initialize();
            impromptu.autoConnectDesktop(proxyPassword);
        }
      }, [proxyPassword]);
    
    return (
        <>
            <p>自動接続モード</p>
            <p>Proxy Password: <input ref={passwordRef} defaultValue={"impromptu"} /></p>
            <button onClick={()=>{
                if(passwordRef.current?.value){
                    setModeLock(true);
                    setProxyPassword(passwordRef.current.value);
                }
            }} disabled={proxyPassword ? true : false}>開始</button>
            {proxyId && proxyPassword && 
            <table  border={1}>
                <tr>
                    <th>Proxy ID</th>
                    <th>Password</th>
                </tr>
                <tr>
                    <td>{proxyId} <button onClick={() => navigator.clipboard.writeText(proxyId)}>copy</button></td>
                    <td>{proxyPassword} <button onClick={() => navigator.clipboard.writeText(proxyPassword)}>copy</button></td>
                </tr>
            </table>
            }
            
            {proxy.length > 0 ?
            <table border={1}>
                <tr>
                    <th>Original ID</th>
                    <th>Replace ID</th>
                    <th>Password</th>
                </tr>
                {proxy.map( v => {
                    return (
                    <>
                        <tr>
                            <td>{v[0]} <button onClick={() => navigator.clipboard.writeText(v[0])}>copy</button></td>
                            <td>{v[1]} <button onClick={() => navigator.clipboard.writeText(v[1])}>copy</button></td>
                            <td>{v[2]} <button onClick={() => navigator.clipboard.writeText(v[2])}>copy</button></td>
                        </tr>
                        <tr>
                        <td colSpan={3}>
                            <Statistics replaceId={v[1]} />
                        </td>
                        </tr>
                    </>
                    );
                })}
            </table> : <></>}
        </>
    );
};