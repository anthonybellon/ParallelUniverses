import React from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { EventNode } from 'src/data/events';

interface CollapsibleTreeChartProps {
  data: EventNode[];
  onNodeClick: (event: EventNode) => void;
}

const CollapsibleTreeChart: React.FC<CollapsibleTreeChartProps> = ({
  data,
  onNodeClick,
}) => {
  const option = {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: (params: any) => {
        const { name, date, description } = params.data as EventNode;
        return `
          <div style="max-width: 300px; word-wrap: break-word; white-space: normal;">
            <strong>${name}</strong><br/>
            <em>${date}</em><br/><br/>
            <p style="margin: 0; line-height: 1.5;">${description}</p>
          </div>
        `;
      },
    },
    series: [
      {
        type: 'tree',
        data,
        top: '5%',
        left: '20%',
        bottom: '5%',
        right: '20%',
        symbolSize: 10,
        label: {
          position: 'top',
          verticalAlign: 'middle',
          align: 'center',
          fontSize: 12,
        },
        expandAndCollapse: true,
        initialTreeDepth: 2,
        animationDuration: 750,
        animationEasing: 'cubicOut',
        lineStyle: {
          width: 2,
          curveness: 0.5,
        },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '600px', width: '100%' }}
      echarts={echarts}
      onEvents={{
        click: (params: { data: EventNode }) => {
          if (params.data) {
            onNodeClick(params.data as EventNode);
          }
        },
      }}
    />
  );
};

export default CollapsibleTreeChart;
