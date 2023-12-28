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
  Legend
} from 'recharts';
import { impromptu } from ".";

type ScreenChartData = {
  name: string;
  損失率: number;
};

export const ScreenChart: React.FC<{replaceId: string}> = ({replaceId}) => {
  const [chartData, setChartData] = useState<ScreenChartData[]>([]);
  const [timeout, setTimeout] = useState<NodeJS.Timeout>();

  const once = useRef(true);
  useEffect(()=>{
    if (!once.current) return;
    once.current = false;

    const interval = setInterval(async () => {
      const result = await impromptu.getScreenLostRate(replaceId);
      // console.log(`${result.exist} | ${JSON.stringify(result.data)}`);
      if(result.exist){
        const list: ScreenChartData[] = result.data.map(v => {return {name: v.name, 損失率: v.lostRate}});
        setChartData(list);
      }else if(timeout){
        clearInterval(timeout);
      }

    }, 3000);
    setTimeout(interval);

  }, []);

  return (
    <>
      <details>
        <summary>スクリーン転送状況</summary>
        <p>操作クライアント数：{chartData.length}</p>
        <p>画像転送損失率（％）</p>
        <div className="container">
          <BarChart
            width={700}
            height={300}
            data={chartData}
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
            <Bar dataKey="損失率" fill="#82ca9d" activeBar={<Rectangle fill="gold" stroke="purple" />} />
          </BarChart>
        </div>
      </details>
    </>
  );
};