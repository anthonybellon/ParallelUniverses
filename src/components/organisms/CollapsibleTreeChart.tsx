import React, { useState, useEffect } from 'react';
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
  const [chartHeight, setChartHeight] = useState('600px');

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

  useEffect(() => {
    const totalEvents = data.reduce(
      (acc, timeline) => acc + timeline.length,
      0,
    );
    const newHeight = Math.max(600, totalEvents * 20);
    setChartHeight(`${newHeight}px`);
  }, [data]);

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
          description?.length > 150
            ? description.slice(0, 150) + '...'
            : description || '';

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
        layout: 'orthogonal',
        top: '1%',
        left: '5%',
        bottom: '1%',
        right: '5%',
        symbolSize: 20,
        roam: true,
        label: {
          position: 'top',
          verticalAlign: 'middle',
          align: 'middle',
          fontSize: 10,
          formatter: (node: { data: { name: string } }) => {
            const maxLength = 50;
            return node.data.name.length > maxLength
              ? node.data.name.substring(0, maxLength) + '...'
              : node.data.name;
          },
        },
        expandAndCollapse: true,
        initialTreeDepth: -1,
        animationDuration: 550,
        animationEasing: 'cubicOut',
        lineStyle: {
          width: 2,
          curveness: 0.5,
        },
        orient: 'LR',
        nodePadding: 20,
        itemStyle: {
          borderWidth: 1,
        },
      },
    ],
  };
  const handleChartReady = (chart: {
    dispatchAction: (arg0: { type: string }) => void;
  }) => {
    chart.dispatchAction({
      type: 'restore',
    });
  };
  return (
    <ReactECharts
      key={JSON.stringify(data)}
      option={option}
      style={{ height: chartHeight, width: '100vw' }}
      echarts={echarts}
      onChartReady={handleChartReady}
    />
  );
};

export default CollapsibleTreeChart;
