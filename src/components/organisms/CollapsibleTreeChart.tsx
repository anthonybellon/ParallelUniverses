import React from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { EventNode } from 'src/data/events';

interface TreeNode extends EventNode {
  children: TreeNode[];
}

interface CollapsibleTreeChartProps {
  data: EventNode[];
}

const CollapsibleTreeChart: React.FC<CollapsibleTreeChartProps> = ({
  data,
}) => {
  const buildTreeData = (events: EventNode[]): TreeNode[] => {
    if (!events.length) return [];

    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const root: TreeNode = { ...sortedEvents[0], children: [] };
    let currentNode = root;

    for (let i = 1; i < sortedEvents.length; i++) {
      const newNode: TreeNode = { ...sortedEvents[i], children: [] };
      currentNode.children = [newNode];
      currentNode = newNode;
    }

    return [root];
  };

  const treeData = buildTreeData(data);

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params: echarts.EChartOption.Tooltip.Format) => {
        const { name, date, description, eventType, embellishments } =
          params.data;
        const embellishmentsList = embellishments
          ?.map((embellishment: string) => `<li>${embellishment}</li>`)
          .join('');
        const formattedDescription =
          description.length > 150
            ? description.slice(0, 150) + '...'
            : description;

        return `
          <div style="max-width: 300px; word-wrap: break-word; white-space: normal;">
            <strong>${name} (${eventType})</strong><br/>
            <em>${date}</em><br/><br/>
            <p style="margin: 0; line-height: 1.5;">${formattedDescription}</p>
            ${embellishments ? `<ul style="margin: 0; line-height: 1.5;">${embellishmentsList}</ul>` : ''}
          </div>
        `;
      },
    },
    series: [
      {
        type: 'tree',
        data: treeData,
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
    />
  );
};

export default CollapsibleTreeChart;
