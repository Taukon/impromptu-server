import { 
  useEffect, 
  useRef, 
  useState 
} from "react";
import { 
  BarChart, 
  Bar, 
  Rectangle, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer
} from 'recharts';
import { impromptu } from ".";

type ScreenChartData = {
  name: string;
  損失率: number;
};

type StatisticsData = {
  screen: {
    type: string;
    total: number;
    data: ScreenChartData[];
  };
  file: {
    type: string;
    total: number;
  }
};

export const Statistics: React.FC<{replaceId: string}> = ({replaceId}) => {
  const [statistics, setStatistics] = useState<StatisticsData>({
    screen: {
      type: "none",
      total: 0,
      data: []
    },
    file: {
      type: "none",
      total: 0
    }
  });
  const [timeout, setTimeout] = useState<NodeJS.Timeout>();

  const once = useRef(true);
  useEffect(()=>{
    if (!once.current) return;
    once.current = false;

    const interval = setInterval(async () => {
      const result = await impromptu.getStatistics(replaceId);
      // console.log(`${result.exist} | ${JSON.stringify(result.data)}`);
      if(result.exist){
        const list: ScreenChartData[] = result.screen.data.map(v => {return {name: v.name, 損失率: v.lostRate}});
        setStatistics({
          screen: {
            type: result.screen.desktopType,
            total: result.screen.total,
            data: list
          },
          file: {
            type: result.file.desktopType,
            total: result.file.total
          }
        });
      }else if(timeout){
        clearInterval(timeout);
      }

    }, 3000);
    setTimeout(interval);

  }, []);

  return (
    <>
      <details>
        <summary>統計</summary>
        <p>デスクトップとの接続タイプ（ファイル）：{statistics.file.type}</p>
        <p>ファイル共有数：{statistics.file.total}</p>
        <p>デスクトップとの接続タイプ（スクリーン）：{statistics.screen.type}</p>
        <p>スクリーン共有数：{statistics.screen.total}</p>
        <p>スクリーン転送損失率（％）</p>
        <div style={{ width: 700, height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            width={700}
            height={300}
            data={statistics.screen.data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]}/>
            <Tooltip />
            <Legend />
            <Bar dataKey="損失率" fill="#82ca9d" barSize={statistics.screen.total < 5 ? 50 : 20} activeBar={<Rectangle fill="gold" stroke="purple" />} />
          </BarChart>
          </ResponsiveContainer>
        </div>
      </details>
    </>
  );
};