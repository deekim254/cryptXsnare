-- Create cases table
CREATE TABLE public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_by UUID NOT NULL,
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create case_alerts junction table for linking alerts to cases
CREATE TABLE public.case_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  linked_by UUID NOT NULL,
  UNIQUE(case_id, alert_id)
);

-- Create case_comments table for timeline and comments
CREATE TABLE public.case_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'comment' CHECK (comment_type IN ('comment', 'status_change', 'assignment', 'alert_linked')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cases
CREATE POLICY "Users can view cases they created" 
ON public.cases 
FOR SELECT 
USING (created_by = auth.uid());

CREATE POLICY "Analysts and admins can view all cases" 
ON public.cases 
FOR SELECT 
USING (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'analyst'::user_role]));

CREATE POLICY "Authenticated users can create cases" 
ON public.cases 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Case creators and analysts can update cases" 
ON public.cases 
FOR UPDATE 
USING (created_by = auth.uid() OR get_current_user_role() = ANY (ARRAY['admin'::user_role, 'analyst'::user_role]));

CREATE POLICY "Admins can delete cases" 
ON public.cases 
FOR DELETE 
USING (get_current_user_role() = 'admin'::user_role);

-- RLS Policies for case_alerts
CREATE POLICY "Users can view case_alerts for accessible cases" 
ON public.case_alerts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_alerts.case_id 
    AND (cases.created_by = auth.uid() OR get_current_user_role() = ANY (ARRAY['admin'::user_role, 'analyst'::user_role]))
  )
);

CREATE POLICY "Users can link alerts to their cases" 
ON public.case_alerts 
FOR INSERT 
WITH CHECK (
  auth.uid() = linked_by AND
  EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_alerts.case_id 
    AND (cases.created_by = auth.uid() OR get_current_user_role() = ANY (ARRAY['admin'::user_role, 'analyst'::user_role]))
  )
);

CREATE POLICY "Admins can delete case_alerts" 
ON public.case_alerts 
FOR DELETE 
USING (get_current_user_role() = 'admin'::user_role);

-- RLS Policies for case_comments
CREATE POLICY "Users can view comments for accessible cases" 
ON public.case_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_comments.case_id 
    AND (cases.created_by = auth.uid() OR get_current_user_role() = ANY (ARRAY['admin'::user_role, 'analyst'::user_role]))
  )
);

CREATE POLICY "Users can add comments to accessible cases" 
ON public.case_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_comments.case_id 
    AND (cases.created_by = auth.uid() OR get_current_user_role() = ANY (ARRAY['admin'::user_role, 'analyst'::user_role]))
  )
);

-- Create function to update cases updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cases_updated_at
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.update_cases_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_cases_priority ON public.cases(priority);
CREATE INDEX idx_cases_created_by ON public.cases(created_by);
CREATE INDEX idx_cases_assigned_to ON public.cases(assigned_to);
CREATE INDEX idx_cases_created_at ON public.cases(created_at DESC);
CREATE INDEX idx_case_alerts_case_id ON public.case_alerts(case_id);
CREATE INDEX idx_case_alerts_alert_id ON public.case_alerts(alert_id);
CREATE INDEX idx_case_comments_case_id ON public.case_comments(case_id);
CREATE INDEX idx_case_comments_created_at ON public.case_comments(created_at DESC);