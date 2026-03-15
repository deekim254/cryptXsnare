import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

interface NetworkBubbleChartProps {
  events: NetworkEvent[];
}

interface ChartDataPoint {
  x: number;
  y: number;
  z: number;
  event: NetworkEvent;
}

const NetworkBubbleChart: React.FC<NetworkBubbleChartProps> = ({ events }) => {
  const protocolMapping = {
    'HTTP': 1,
    'HTTPS': 2,
    'FTP': 3,
    'SSH': 4,
    'DNS': 5,
    'SMTP': 6,
    'TCP': 7,
    'UDP': 8,
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'low': return 'hsl(var(--chart-1))';
      case 'medium': return 'hsl(var(--chart-2))';
      case 'high': return 'hsl(var(--chart-3))';
      case 'critical': return 'hsl(var(--chart-4))';
      default: return 'hsl(var(--muted))';
    }
  };

  const chartData: ChartDataPoint[] = events.map((event, index) => {
    const timeOffset = new Date(event.timestamp).getTime() - new Date(events[events.length - 1]?.timestamp || 0).getTime();
    const protocolY = protocolMapping[event.protocol as keyof typeof protocolMapping] || 0;
    
    return {
      x: timeOffset / (1000 * 60), // Convert to minutes from oldest event
      y: protocolY,
      z: event.bandwidth || Math.random() * 100 + 10, // Bubble size (bandwidth or random)
      event,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      const event = data.event;
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{event.description}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Source:</span> {event.source_ip}</p>
            <p><span className="text-muted-foreground">Destination:</span> {event.destination_ip}</p>
            <p><span className="text-muted-foreground">Protocol:</span> {event.protocol}</p>
            <p><span className="text-muted-foreground">Threat Level:</span> 
              <span className={`ml-1 font-medium ${
                event.threat_level === 'critical' ? 'text-destructive' :
                event.threat_level === 'high' ? 'text-orange-500' :
                event.threat_level === 'medium' ? 'text-warning' :
                'text-muted-foreground'
              }`}>
                {event.threat_level.toUpperCase()}
              </span>
            </p>
            <p><span className="text-muted-foreground">Time:</span> {new Date(event.timestamp).toLocaleTimeString()}</p>
            <p><span className="text-muted-foreground">Status:</span> 
              <span className={`ml-1 font-medium ${event.blocked ? 'text-destructive' : 'text-muted-foreground'}`}>
                {event.blocked ? 'Blocked' : 'Allowed'}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderScatter = (props: any) => {
    const { payload } = props;
    
    return (
      <Cell 
        key={`cell-${payload.event.id}`}
        fill={getThreatColor(payload.event.threat_level)}
        stroke={payload.event.blocked ? 'hsl(var(--destructive))' : 'transparent'}
        strokeWidth={payload.event.blocked ? 2 : 0}
      />
    );
  };

  if (events.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No network events to display</p>
          <p className="text-sm">Start monitoring to see live data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{
            top: 20,
            right: 20,
            bottom: 60,
            left: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => `${Math.abs(Math.round(value))}m ago`}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Protocol"
            domain={[0, 9]}
            tickFormatter={(value) => {
              const protocols = Object.keys(protocolMapping);
              return protocols[value - 1] || '';
            }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Scatter 
            name="Network Events" 
            data={chartData} 
            fill="hsl(var(--primary))"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={getThreatColor(entry.event.threat_level)}
                stroke={entry.event.blocked ? 'hsl(var(--destructive))' : 'transparent'}
                strokeWidth={entry.event.blocked ? 2 : 0}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-chart-1"></div>
          <span>Low Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-chart-2"></div>
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-chart-3"></div>
          <span>High Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-chart-4"></div>
          <span>Critical Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-destructive bg-transparent"></div>
          <span>Blocked</span>
        </div>
      </div>
    </div>
  );
};

export default NetworkBubbleChart;