import { useEffect, useRef, useState } from "react";
import { Impromptu } from "../../browser";
import { AccessDesktop } from "./accessDesktop";

export const impromptu = new Impromptu();

export const ImpromptuBrowser: React.FC<{
  setLock: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ setLock }) => {
  const desktopIdRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<[string, string]>();

  const once = useRef(true);
  useEffect(() => {
    if (info) {
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
        {/* <p> */}
        <div className="collapse-title text-xl font-medium">
          Desktop ID:{" "}
          <input
            className="input input-bordered input-success input-sm w-full max-w-xs text-xl"
            ref={desktopIdRef}
          />
        </div>
        <div className="collapse-title text-xl font-medium">
          Password:{" "}
          <input
            className="input input-bordered input-success input-sm w-full max-w-xs text-xl"
            ref={passwordRef}
            defaultValue={"impromptu"}
          />
        </div>
        <button
          className="btn btn-outline text-base btn-primary"
          onClick={() => {
            if (desktopIdRef.current?.value && passwordRef.current?.value) {
              setInfo([desktopIdRef.current.value, passwordRef.current.value]);
            }
          }}
        >
          開始
        </button>
        {/* </p> */}
      </div>
      <div className="divider divider-primary"></div>
      <AccessDesktop />
    </>
  );
};
