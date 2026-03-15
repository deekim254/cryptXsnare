-- Remove the sample threat alerts that were added for demonstration
DELETE FROM threat_alerts WHERE created_by = auth.uid() AND title IN (
  'DDoS Attack Detected',
  'Malicious URL Detected', 
  'Suspicious Email Activity',
  'Port Scan Attempt',
  'Low Risk Domain',
  'DNS Anomaly'
);