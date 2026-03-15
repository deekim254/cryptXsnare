import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface CaseTrendsChartProps {
  data: Array<{
    date: string;
    open: number;
    closed: number;
    resolved: number;
  }>;
}

export function CaseTrendsChart({ data }: CaseTrendsChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    date: format(new Date(item.date), 'MMM dd'),
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Case Status Trends</CardTitle>
          <CardDescription>Daily case activity by status</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <p className="text-muted-foreground">No case data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Status Trends</CardTitle>
        <CardDescription>Daily case activity by status</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="open" fill="hsl(var(--destructive))" name="Open" />
            <Bar dataKey="resolved" fill="hsl(var(--success))" name="Resolved" />
            <Bar dataKey="closed" fill="hsl(var(--muted))" name="Closed" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
