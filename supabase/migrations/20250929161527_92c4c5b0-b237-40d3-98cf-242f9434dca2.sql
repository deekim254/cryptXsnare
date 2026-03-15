-- Create alerts table with requested schema
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for alerts
CREATE POLICY "Users can view alerts based on role" 
ON public.alerts 
FOR SELECT 
USING (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'analyst'::user_role, 'viewer'::user_role]));

CREATE POLICY "Analysts and admins can create alerts" 
ON public.alerts 
FOR INSERT 
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'analyst'::user_role]));

CREATE POLICY "Analysts and admins can update alerts" 
ON public.alerts 
FOR UPDATE 
USING (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'analyst'::user_role]));

CREATE POLICY "Admins can delete alerts" 
ON public.alerts 
FOR DELETE 
USING (get_current_user_role() = 'admin'::user_role);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_alerts_updated_at
BEFORE UPDATE ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_alerts_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_alerts_severity ON public.alerts(severity);
CREATE INDEX idx_alerts_status ON public.alerts(status);
CREATE INDEX idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX idx_alerts_assigned_to ON public.alerts(assigned_to);