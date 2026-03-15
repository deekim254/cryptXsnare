-- Fix privilege escalation vulnerability in profiles table
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create secure policies that prevent role changes by regular users
CREATE POLICY "Users can update their own profile (no role changes)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (get_current_user_role() = 'admin'::user_role);

-- Fix sensitive data visibility - threat_alerts
DROP POLICY IF EXISTS "Authenticated users can view threat alerts" ON public.threat_alerts;

CREATE POLICY "Users can view relevant threat alerts" 
ON public.threat_alerts 
FOR SELECT 
USING (
  (created_by = auth.uid()) OR 
  (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'analyst'::user_role]))
);

-- Fix sensitive data visibility - system_settings
DROP POLICY IF EXISTS "All users can view system settings" ON public.system_settings;

CREATE POLICY "Admins can view system settings" 
ON public.system_settings 
FOR SELECT 
USING (get_current_user_role() = 'admin'::user_role);

-- Fix sensitive data visibility - threat_intelligence  
DROP POLICY IF EXISTS "Authenticated users can view threat intelligence" ON public.threat_intelligence;

CREATE POLICY "Analysts and admins can view threat intelligence" 
ON public.threat_intelligence 
FOR SELECT 
USING (get_current_user_role() = ANY (ARRAY['admin'::user_role, 'analyst'::user_role]));

-- Secure the get_current_user_role function
DROP FUNCTION IF EXISTS public.get_current_user_role();

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Secure the handle_new_user function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'viewer'::user_role
    );
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trigger to prevent unauthorized role changes
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    -- Allow role changes only if user is admin or it's the initial insert
    IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
        IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'admin'::user_role THEN
            RAISE EXCEPTION 'Only admins can change user roles';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_role_escalation_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();