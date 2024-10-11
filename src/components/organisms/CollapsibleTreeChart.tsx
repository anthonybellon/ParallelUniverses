import React from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { EventNode } from 'src/data/events';

interface TreeNode extends EventNode {
  children: TreeNode[];
}

interface CollapsibleTreeChartProps {
  data: EventNode[][];
}

const CollapsibleTreeChart: React.FC<CollapsibleTreeChartProps> = ({
  data,
}) => {
  const buildNestedTreeData = (timelines: EventNode[][]): TreeNode[] => {
    const rootNodes: TreeNode[] = [];
    const nodeMap = new Map<string, TreeNode>();

    timelines.forEach((events) => {
      events.forEach((event, index) => {
        const node: TreeNode = { ...event, children: [] };
        nodeMap.set(event.id, node);

        if (index === 0) {
          if (event.eventType === 'Splinter') {
            const parentNode = nodeMap.get(event.parentID!);
            if (parentNode) {
              parentNode.children.push(node);
            } else {
              rootNodes.push(node);
            }
          } else {
            rootNodes.push(node);
          }
        } else {
          const parentNode = nodeMap.get(events[index - 1].id);
          if (parentNode) {
            parentNode.children.push(node);
          }
        }
      });
    });

    return rootNodes;
  };

  const nodes = buildNestedTreeData(data);

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params: {
        data: {
          name: string;
          date: string;
          description: string;
          eventType: string;
          embellishments: string[];
        };
      }) => {
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
        data: nodes,
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
        initialTreeDepth: -1,
        animationDuration: 550,
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
