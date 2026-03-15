-- Create recon_results table for storing reconnaissance data
CREATE TABLE public.recon_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_domain TEXT NOT NULL,
  recon_type TEXT NOT NULL,
  results JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recon_results ENABLE ROW LEVEL SECURITY;

-- Create policies for recon_results
CREATE POLICY "Users can view their own recon results" 
ON public.recon_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recon results" 
ON public.recon_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Analysts and admins can view all recon results"
ON public.recon_results
FOR SELECT
USING (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'analyst'::user_role]));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_recon_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_recon_results_updated_at
  BEFORE UPDATE ON public.recon_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_recon_results_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_recon_results_user_id ON public.recon_results(user_id);
CREATE INDEX idx_recon_results_target_domain ON public.recon_results(target_domain);
CREATE INDEX idx_recon_results_recon_type ON public.recon_results(recon_type);
CREATE INDEX idx_recon_results_created_at ON public.recon_results(created_at DESC);