import { useEffect, useRef, useState } from "react";
import { Statistics } from "./statistics";
import { impromptu } from ".";

export const ManualMode: React.FC<{
  setModeLock: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ setModeLock }) => {
  const desktopIdRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<[string, string]>();
  const [proxy, setProxy] = useState<[string, string, string][]>([]);

  impromptu.showIdFunc = (
    desktopId: string,
    replaceId: string,
    password: string,
  ) => {
    setProxy([...proxy, [desktopId, replaceId, password]]);
  };

  impromptu.removeIdFunc = (replaceId: string) => {
    setProxy(
      proxy.filter((v) => {
        replaceId != v[1];
      }),
    );
  };

  const once = useRef(true);
  useEffect(() => {
    if (info) {
      if (once.current) {
        impromptu.initialize();
        once.current = false;
      }

      impromptu.connectDesktop(info[0], info[1]);
    }
  }, [info]);

  return (
    <>
      <p className="collapse-title text-xl font-medium">手動接続モード</p>
      <p className="collapse-title text-xl font-medium">
        Original Desktop ID:{" "}
        <input
          className="input input-bordered input-success input-sm w-full max-w-xs text-xl"
          ref={desktopIdRef}
        />
      </p>
      <p className="collapse-title text-xl font-medium">
        Original Desktop Password:{" "}
        <input
          className="input input-bordered input-success input-sm w-full max-w-xs text-xl"
          ref={passwordRef}
          defaultValue={"impromptu"}
        />
      </p>
      <button
        className="btn btn-outline text-base btn-primary"
        onClick={() => {
          if (desktopIdRef.current?.value && passwordRef.current?.value) {
            setModeLock(true);
            setInfo([desktopIdRef.current.value, passwordRef.current.value]);
          }
        }}
      >
        開始
      </button>
      <div className="divider divider-primary"></div>
      {proxy.length > 0 ? (
        <table border={1}>
          <tr className="text-lg">
            <th>Original ID</th>
            <th>Replace ID</th>
            <th>Password</th>
          </tr>
          {proxy.map((v) => {
            return (
              <>
                <tr className="border-2 border-blue-400 text-lg">
                  <td>
                    {v[0]}{" "}
                    <button
                      className="btn btn-outline btn-info"
                      onClick={() => navigator.clipboard.writeText(v[0])}
                    >
                      copy
                    </button>
                  </td>
                  <td>
                    {v[1]}{" "}
                    <button
                      className="btn btn-outline btn-info"
                      onClick={() => navigator.clipboard.writeText(v[1])}
                    >
                      copy
                    </button>
                  </td>
                  <td>
                    {v[2]}{" "}
                    <button
                      className="btn btn-outline btn-info"
                      onClick={() => navigator.clipboard.writeText(v[2])}
                    >
                      copy
                    </button>
                  </td>
                </tr>
                <tr className="border-2 border-blue-400 text-lg">
                  <td colSpan={3}>
                    <Statistics replaceId={v[1]} />
                  </td>
                </tr>
              </>
            );
          })}
        </table>
      ) : (
        <></>
      )}
    </>
  );
};
