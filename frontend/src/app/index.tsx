
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ImpromptuProxy } from "./proxy";
import { ImpromptuBrowser } from "./browser";

const RootDiv = () => {
  const [proxy, setProxy] = useState<boolean>(false);
  const [lock, setLock] = useState<boolean>(false);

  return (
      <>
        {lock ? <></> : 
        <p>
          <button onClick={()=>{
              if(lock === false)
                  setProxy(!proxy);
          }} disabled={lock}>{!proxy ? `中継配信` : `操作`}</button>
        </p>}

        {proxy ? <ImpromptuProxy setLock={setLock} /> : <ImpromptuBrowser setLock={setLock}/>}
      </>
  );
};
  
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<RootDiv />);