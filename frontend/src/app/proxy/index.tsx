
import { useState } from "react";
import { Impromptu } from "../../proxy";
import { createRoot } from "react-dom/client";
import { ManualMode } from "./manualMode";
import { AutoMode } from "./autoMode";

export const impromptu = new Impromptu();

const RootDiv = () => {
  const [auto, setAuto] = useState<boolean>(false);
  const [lock, setLock] = useState<boolean>(false);
  
  return (
      <>
        <button onClick={()=>{
          if(lock === false)
            setAuto(!auto);
        }} disabled={lock}>Proxy Mode</button>

        {auto ? <AutoMode setLock={setLock} /> : <ManualMode setLock={setLock}/>}
      </>
  );
};
  
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<RootDiv />);