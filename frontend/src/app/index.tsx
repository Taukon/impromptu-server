
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ImpromptuProxy } from "./proxy";
import { ImpromptuBrowser } from "./browser";
import "./main.css";

const RootDiv = () => {
  const [proxy, setProxy] = useState<boolean>(false);
  const [lock, setLock] = useState<boolean>(false);

  return (
      <>
        {lock ? <></> : 
        <div className="navbar bg-neutral text-neutral-content">
          <button  className="btn btn-outline text-base btn-primary" onClick={()=>{
              if(lock === false)
                  setProxy(!proxy);
          }} disabled={lock}>{!proxy ? `中継配信` : `操作`}</button>
        </div>}

        {proxy ? <ImpromptuProxy setLock={setLock} /> : <ImpromptuBrowser setLock={setLock}/>}
      </>
  );
};
  
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<RootDiv />);