import { useEffect, useRef, useState } from "react";
import { ScreenChart } from "./ScreenChart";
import { impromptu } from ".";

export const ManualMode: React.FC<{setLock: React.Dispatch<React.SetStateAction<boolean>>}> = ({setLock}) => {
  const desktopIdRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<[string,string]>();
  const [proxy, setProxy] = useState<[string, string, string][]>([]);

  impromptu.showIdFunc = (desktopId: string, replaceId: string, password: string) => {
    setProxy([...proxy, [desktopId, replaceId, password]]);
  };

  impromptu.removeIdFunc = (replaceId: string) => {
      setProxy(proxy.filter((v) => {replaceId != v[1]}));
  };

  useEffect(()=>{
    if(info){
        impromptu.connectDesktop(info[0], info[1]);
    }
  }, [info]);

  return (
    <>
      <p>Manual Mode</p>
      <p>Original Desktop ID: <input ref={desktopIdRef}/></p>
      <p>Original Desktop Password: <input ref={passwordRef} defaultValue={"impromptu"} /></p>
      <button onClick={()=>{
        if(desktopIdRef.current?.value && passwordRef.current?.value){
          setLock(true);
          setInfo([desktopIdRef.current.value, passwordRef.current.value]);
        }
      }}>開始</button>
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
                    <ScreenChart replaceId={v[1]} />
                  </td>
                </tr>
              </>
            );
        })}
      </table>
    </>
  );
};