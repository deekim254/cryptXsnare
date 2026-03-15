
-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'viewer');

-- Create enum for threat types
CREATE TYPE threat_type AS ENUM ('url', 'email', 'network', 'file');

-- Create enum for severity levels
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Create enum for alert status
CREATE TYPE alert_status AS ENUM ('open', 'investigating', 'resolved', 'false_positive');

-- Create profiles table for user management
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create threat_alerts table
CREATE TABLE public.threat_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type threat_type NOT NULL,
    severity severity_level NOT NULL,
    status alert_status NOT NULL DEFAULT 'open',
    title TEXT NOT NULL,
    description TEXT,
    source_ip INET,
    source_domain TEXT,
    source_url TEXT,
    indicators JSONB,
    metadata JSONB,
    assigned_to UUID REFERENCES public.profiles(id),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scan_results table
CREATE TABLE public.scan_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type threat_type NOT NULL,
    target TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    score DECIMAL(3,2), -- 0.00 to 1.00
    results JSONB,
    scan_duration INTEGER, -- milliseconds
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create threat_intelligence table
CREATE TABLE public.threat_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL, -- 'mitre', 'abuseipdb', 'otx', etc.
    indicator_type TEXT NOT NULL, -- 'ip', 'domain', 'url', 'hash'
    indicator_value TEXT NOT NULL,
    threat_type TEXT,
    confidence_score DECIMAL(3,2),
    first_seen TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_settings table
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.get_current_user_role() = 'admin');

-- RLS Policies for threat_alerts
CREATE POLICY "Authenticated users can view threat alerts" ON public.threat_alerts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Analysts and admins can create threat alerts" ON public.threat_alerts
    FOR INSERT TO authenticated 
    WITH CHECK (public.get_current_user_role() IN ('admin', 'analyst'));

CREATE POLICY "Analysts and admins can update threat alerts" ON public.threat_alerts
    FOR UPDATE TO authenticated 
    USING (public.get_current_user_role() IN ('admin', 'analyst'));

-- RLS Policies for scan_results
CREATE POLICY "Users can view their own scan results" ON public.scan_results
    FOR SELECT USING (auth.uid() = created_by OR public.get_current_user_role() IN ('admin', 'analyst'));

CREATE POLICY "Authenticated users can create scan results" ON public.scan_results
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- RLS Policies for threat_intelligence
CREATE POLICY "Authenticated users can view threat intelligence" ON public.threat_intelligence
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage threat intelligence" ON public.threat_intelligence
    FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin');

-- RLS Policies for system_settings
CREATE POLICY "Admins can manage system settings" ON public.system_settings
    FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin');

CREATE POLICY "All users can view system settings" ON public.system_settings
    FOR SELECT TO authenticated USING (true);

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'viewer'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_threat_alerts_created_at ON public.threat_alerts(created_at DESC);
CREATE INDEX idx_threat_alerts_severity ON public.threat_alerts(severity);
CREATE INDEX idx_threat_alerts_status ON public.threat_alerts(status);
CREATE INDEX idx_threat_alerts_type ON public.threat_alerts(type);
CREATE INDEX idx_scan_results_created_at ON public.scan_results(created_at DESC);
CREATE INDEX idx_threat_intelligence_indicator ON public.threat_intelligence(indicator_value);
CREATE INDEX idx_threat_intelligence_type ON public.threat_intelligence(indicator_type);

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description) VALUES
('retention_policy_days', '90', 'Number of days to retain threat data'),
('alert_thresholds', '{"low": 0.3, "medium": 0.6, "high": 0.8, "critical": 0.9}', 'Threat score thresholds for alert severity'),
('email_notifications', '{"enabled": true, "recipients": []}', 'Email notification settings'),
('auto_quarantine', '{"enabled": false, "threshold": 0.9}', 'Automatic quarantine settings');
