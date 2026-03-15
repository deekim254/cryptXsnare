import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface CaseStatusChartProps {
  data: {
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
}

const COLORS = {
  open: 'hsl(var(--destructive))',
  in_progress: 'hsl(var(--warning))',
  resolved: 'hsl(var(--success))',
  closed: 'hsl(var(--muted))',
};

export function CaseStatusChart({ data }: CaseStatusChartProps) {
  const chartData = [
    { name: 'Open', value: data.open, color: COLORS.open },
    { name: 'In Progress', value: data.in_progress, color: COLORS.in_progress },
    { name: 'Resolved', value: data.resolved, color: COLORS.resolved },
    { name: 'Closed', value: data.closed, color: COLORS.closed },
  ].filter(item => item.value > 0);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Case Status Distribution</CardTitle>
          <CardDescription>Current case status breakdown</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No case data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Status Distribution</CardTitle>
        <CardDescription>Current case status breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
