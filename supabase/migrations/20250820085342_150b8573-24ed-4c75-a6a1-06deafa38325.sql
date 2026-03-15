-- Insert sample threat alerts for demonstration
INSERT INTO threat_alerts (type, severity, status, title, description, source_ip, source_domain, source_url, created_by, created_at, updated_at)
VALUES 
  ('network', 'high', 'open', 'DDoS Attack Detected', 'Unusual traffic spike from multiple sources targeting our infrastructure', '192.168.1.105', null, null, auth.uid(), now(), now()),
  ('url', 'critical', 'investigating', 'Malicious URL Detected', 'Known phishing domain attempting to steal credentials', null, 'phishing-site.malicious.com', 'https://phishing-site.malicious.com/login', auth.uid(), now() - interval '2 hours', now() - interval '1 hour'),
  ('email', 'medium', 'open', 'Suspicious Email Activity', 'Email containing suspicious attachment detected', null, 'suspicious-sender.com', null, auth.uid(), now() - interval '30 minutes', now() - interval '30 minutes'),
  ('network', 'high', 'resolved', 'Port Scan Attempt', 'Sequential port scanning activity detected and blocked', '10.0.0.45', null, null, auth.uid(), now() - interval '4 hours', now() - interval '1 hour'),
  ('url', 'low', 'false_positive', 'Low Risk Domain', 'Domain flagged by automated system but verified as safe', null, 'legitimate-site.com', 'https://legitimate-site.com', auth.uid(), now() - interval '6 hours', now() - interval '2 hours'),
  ('network', 'medium', 'open', 'DNS Anomaly', 'Suspicious DNS queries detected from internal network', '172.16.0.22', null, null, auth.uid(), now() - interval '1 hour', now() - interval '1 hour');