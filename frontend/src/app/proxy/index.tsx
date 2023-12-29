
import { useEffect, useState } from "react";
import { Impromptu } from "../../proxy";
import { ManualMode } from "./manualMode";
import { AutoMode } from "./autoMode";

export const impromptu = new Impromptu();

export const ImpromptuProxy: React.FC<{setLock: React.Dispatch<React.SetStateAction<boolean>>}> = ({setLock}) => {
  const [auto, setAuto] = useState<boolean>(false);
  const [modeLock, setModeLock] = useState<boolean>(false);
  
  useEffect(() => {
    if(modeLock){
      setLock(true);
    }
  }, [modeLock]);

  return (
      <>
        {modeLock ? <></> : 
        <>
          <button onClick={()=>{
              setAuto(!auto);
          }} disabled={modeLock}>{!auto ? `自動接続` : `手動接続`}</button>
        </>}

        {auto ? <AutoMode setModeLock={setModeLock} /> : <ManualMode setModeLock={setModeLock}/>}
      </>
  );
};
