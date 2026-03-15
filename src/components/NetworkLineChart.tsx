import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

interface NetworkEvent {
  id: string;
  timestamp: string;
  source_ip: string;
  destination_ip: string;
  protocol: string;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  blocked: boolean;
  bandwidth?: number;
}

interface NetworkLineChartProps {
  events: NetworkEvent[];
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  activeConnections: number;
  threatsBlocked: number;
  bandwidthUsage: number;
  threatSeverity: number;
}

const NetworkLineChart: React.FC<NetworkLineChartProps> = ({ events }) => {
  const aggregateData = (): ChartDataPoint[] => {
    if (events.length === 0) return [];

    // Group events by minute intervals
    const timeGroups: { [key: string]: NetworkEvent[] } = {};
    const now = new Date();
    
    // Create 10 minute buckets going back in time
    for (let i = 9; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000); // 60000ms = 1 minute
      const timeKey = format(time, 'HH:mm');
      timeGroups[timeKey] = [];
    }

    // Distribute events into time buckets
    events.forEach(event => {
      const eventTime = new Date(event.timestamp);
      const timeKey = format(eventTime, 'HH:mm');
      if (timeGroups[timeKey]) {
        timeGroups[timeKey].push(event);
      }
    });

    // Calculate metrics for each time bucket
    return Object.entries(timeGroups).map(([timeKey, bucketEvents]) => {
      const activeConnections = bucketEvents.length;
      const threatsBlocked = bucketEvents.filter(e => e.blocked).length;
      const bandwidthUsage = bucketEvents.reduce((sum, e) => sum + (e.bandwidth || 0), 0);
      
      // Calculate average threat severity (low=1, medium=2, high=3, critical=4)
      const severitySum = bucketEvents.reduce((sum, e) => {
        const severityMap = { low: 1, medium: 2, high: 3, critical: 4 };
        return sum + severityMap[e.threat_level];
      }, 0);
      const threatSeverity = bucketEvents.length > 0 ? severitySum / bucketEvents.length : 0;

      return {
        time: timeKey,
        timestamp: new Date(`1970-01-01 ${timeKey}:00`).getTime(),
        activeConnections,
        threatsBlocked,
        bandwidthUsage: Math.round(bandwidthUsage * 100) / 100, // Round to 2 decimal places
        threatSeverity: Math.round(threatSeverity * 100) / 100,
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
  };

  const chartData = aggregateData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{`Time: ${label}`}</p>
          <div className="space-y-1 text-sm">
            {payload.map((entry: any, index: number) => (
              <p key={index} style={{ color: entry.color }}>
                <span className="font-medium">{entry.name}:</span> {entry.value}
                {entry.dataKey === 'bandwidthUsage' && ' MB'}
                {entry.dataKey === 'threatSeverity' && '/4'}
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (events.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p>No network data to display</p>
          <p className="text-sm">Start monitoring to see live trends</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 20,
            bottom: 60,
            left: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
          />
          
          <Line 
            type="monotone" 
            dataKey="activeConnections" 
            stroke="hsl(var(--chart-1))" 
            strokeWidth={2}
            name="Active Connections"
            dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: 'hsl(var(--chart-1))', strokeWidth: 2 }}
          />
          
          <Line 
            type="monotone" 
            dataKey="threatsBlocked" 
            stroke="hsl(var(--destructive))" 
            strokeWidth={2}
            name="Threats Blocked"
            dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: 'hsl(var(--destructive))', strokeWidth: 2 }}
          />
          
          <Line 
            type="monotone" 
            dataKey="bandwidthUsage" 
            stroke="hsl(var(--chart-3))" 
            strokeWidth={2}
            name="Bandwidth Usage (MB)"
            dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: 'hsl(var(--chart-3))', strokeWidth: 2 }}
          />
          
          <Line 
            type="monotone" 
            dataKey="threatSeverity" 
            stroke="hsl(var(--chart-2))" 
            strokeWidth={2}
            name="Threat Severity"
            dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: 'hsl(var(--chart-2))', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-chart-1"></div>
          <span>Active Connections</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-destructive"></div>
          <span>Threats Blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-chart-3"></div>
          <span>Bandwidth Usage</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-chart-2"></div>
          <span>Threat Severity</span>
        </div>
      </div>
    </div>
  );
};

export default NetworkLineChart;