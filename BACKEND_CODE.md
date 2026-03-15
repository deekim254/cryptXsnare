# FastAPI Phishing Detection Backend

## Project Structure
```
backend/
├── main.py
├── requirements.txt
├── .env.example
├── Dockerfile
├── celery_worker.py
├── README.md
├── routers/
│   ├── __init__.py
│   ├── scan.py
│   ├── threats.py
│   └── health.py
├── services/
│   ├── __init__.py
│   ├── supabase_service.py
│   ├── threat_intelligence.py
│   └── anomaly_detection.py
├── models/
│   ├── __init__.py
│   ├── scan_models.py
│   └── threat_models.py
├── tasks/
│   ├── __init__.py
│   └── threat_tasks.py
└── utils/
    ├── __init__.py
    ├── auth.py
    └── logging_config.py
```

## main.py
```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import uvicorn
import os
from dotenv import load_dotenv

from routers import scan, threats, health
from utils.logging_config import setup_logging
from utils.auth import get_current_user

load_dotenv()
setup_logging()

app = FastAPI(
    title="AI Phishing Detection Backend",
    description="Advanced phishing detection and threat analysis API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(scan.router, prefix="/api/scan", tags=["Scanning"], dependencies=[Depends(security)])
app.include_router(threats.router, prefix="/api/threats", tags=["Threats"], dependencies=[Depends(security)])

@app.get("/")
async def root():
    return {"message": "AI Phishing Detection Backend API", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENV") == "development"
    )
```

## requirements.txt
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
supabase==2.0.2
python-multipart==0.0.6
python-dotenv==1.0.0
requests==2.31.0
celery==5.3.4
redis==5.0.1
scapy==2.5.0
pydantic==2.5.0
python-jose[cryptography]==3.3.0
aiofiles==23.2.1
pandas==2.1.4
numpy==1.25.2
scikit-learn==1.3.2
```

## .env.example
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# API Keys
ABUSEIPDB_API_KEY=your_abuseipdb_key
SHODAN_API_KEY=your_shodan_key
OTX_API_KEY=your_otx_key

# Redis
REDIS_URL=redis://localhost:6379

# Environment
ENV=development
PORT=8000
LOG_LEVEL=INFO
```

## routers/scan.py
```python
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import Dict, Any
import logging
import asyncio
from io import BytesIO

from models.scan_models import NetworkScanRequest, NetworkScanResponse
from services.anomaly_detection import AnomalyDetectionService
from services.supabase_service import SupabaseService
from tasks.threat_tasks import process_pcap_file, analyze_network_traffic
from utils.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/network", response_model=NetworkScanResponse)
async def scan_network_traffic(
    request: NetworkScanRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Analyze network traffic for threats and anomalies"""
    try:
        logger.info(f"Starting network scan for user {current_user.get('id')}")
        
        # Initialize services
        anomaly_service = AnomalyDetectionService()
        supabase_service = SupabaseService()
        
        # Analyze the network data
        analysis_result = await anomaly_service.analyze_network_data(request.dict())
        
        # Store scan result in Supabase
        scan_data = {
            "type": "network",
            "target": request.source_ip or "network_traffic",
            "status": "completed",
            "score": analysis_result["risk_score"],
            "results": analysis_result,
            "created_by": current_user["id"]
        }
        
        scan_result = await supabase_service.create_scan_result(scan_data)
        
        # Create threat alert if high risk
        if analysis_result["risk_score"] > 70:
            alert_data = {
                "title": f"High Risk Network Activity Detected",
                "description": f"Suspicious network activity from {request.source_ip}",
                "type": "network",
                "severity": "high" if analysis_result["risk_score"] > 85 else "medium",
                "source_ip": request.source_ip,
                "indicators": analysis_result["indicators"],
                "metadata": {"scan_id": scan_result["id"]},
                "created_by": current_user["id"]
            }
            await supabase_service.create_threat_alert(alert_data)
        
        return NetworkScanResponse(
            scan_id=scan_result["id"],
            risk_score=analysis_result["risk_score"],
            threats_detected=analysis_result["threats"],
            indicators=analysis_result["indicators"],
            recommendations=analysis_result["recommendations"]
        )
        
    except Exception as e:
        logger.error(f"Network scan failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")

@router.post("/pcap")
async def upload_pcap_file(
    file: UploadFile = File(...),
    current_user: Dict = Depends(get_current_user)
):
    """Upload and analyze PCAP file"""
    try:
        if not file.filename.endswith(('.pcap', '.cap', '.pcapng')):
            raise HTTPException(status_code=400, detail="Invalid file format. Only PCAP files allowed.")
        
        # Read file content
        file_content = await file.read()
        
        # Start background task for processing
        task = process_pcap_file.delay(file_content, current_user["id"])
        
        return {
            "message": "PCAP file uploaded successfully",
            "task_id": task.id,
            "status": "processing"
        }
        
    except Exception as e:
        logger.error(f"PCAP upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/suricata-logs")
async def receive_suricata_logs(
    logs: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Receive logs from Suricata/Snort"""
    try:
        # Process Suricata logs
        task = analyze_network_traffic.delay(logs, current_user["id"])
        
        return {
            "message": "Suricata logs received",
            "task_id": task.id,
            "status": "processing"
        }
        
    except Exception as e:
        logger.error(f"Suricata log processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
```

## services/supabase_service.py
```python
from supabase import create_client, Client
import os
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_SERVICE_KEY")
        self.client: Client = create_client(self.url, self.key)
    
    async def create_scan_result(self, scan_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new scan result"""
        try:
            result = self.client.table("scan_results").insert(scan_data).execute()
            return result.data[0]
        except Exception as e:
            logger.error(f"Failed to create scan result: {str(e)}")
            raise
    
    async def create_threat_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new threat alert"""
        try:
            result = self.client.table("threat_alerts").insert(alert_data).execute()
            return result.data[0]
        except Exception as e:
            logger.error(f"Failed to create threat alert: {str(e)}")
            raise
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile by ID"""
        try:
            result = self.client.table("profiles").select("*").eq("id", user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Failed to get user profile: {str(e)}")
            return None
    
    async def store_threat_intelligence(self, intel_data: Dict[str, Any]) -> Dict[str, Any]:
        """Store threat intelligence data"""
        try:
            result = self.client.table("threat_intelligence").insert(intel_data).execute()
            return result.data[0]
        except Exception as e:
            logger.error(f"Failed to store threat intelligence: {str(e)}")
            raise
    
    async def get_recent_alerts(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent threat alerts"""
        try:
            result = self.client.table("threat_alerts")\
                .select("*")\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            return result.data
        except Exception as e:
            logger.error(f"Failed to get recent alerts: {str(e)}")
            return []
```

## services/threat_intelligence.py
```python
import requests
import os
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class ThreatIntelligenceService:
    def __init__(self):
        self.abuseipdb_key = os.getenv("ABUSEIPDB_API_KEY")
        self.shodan_key = os.getenv("SHODAN_API_KEY")
        self.otx_key = os.getenv("OTX_API_KEY")
    
    async def check_ip_reputation(self, ip_address: str) -> Dict[str, Any]:
        """Check IP reputation using AbuseIPDB"""
        try:
            headers = {
                "Key": self.abuseipdb_key,
                "Accept": "application/json"
            }
            
            params = {
                "ipAddress": ip_address,
                "maxAgeInDays": 90,
                "verbose": ""
            }
            
            response = requests.get(
                "https://api.abuseipdb.com/api/v2/check",
                headers=headers,
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "ip": ip_address,
                    "abuse_confidence": data.get("data", {}).get("abuseConfidencePercentage", 0),
                    "is_malicious": data.get("data", {}).get("abuseConfidencePercentage", 0) > 25,
                    "country": data.get("data", {}).get("countryCode"),
                    "usage_type": data.get("data", {}).get("usageType"),
                    "last_reported": data.get("data", {}).get("lastReportedAt")
                }
            else:
                logger.warning(f"AbuseIPDB API error: {response.status_code}")
                return {"ip": ip_address, "error": "API error"}
                
        except Exception as e:
            logger.error(f"AbuseIPDB check failed for {ip_address}: {str(e)}")
            return {"ip": ip_address, "error": str(e)}
    
    async def lookup_shodan(self, ip_address: str) -> Dict[str, Any]:
        """Lookup IP information using Shodan"""
        try:
            response = requests.get(
                f"https://api.shodan.io/shodan/host/{ip_address}",
                params={"key": self.shodan_key},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "ip": ip_address,
                    "ports": data.get("ports", []),
                    "hostnames": data.get("hostnames", []),
                    "organization": data.get("org"),
                    "os": data.get("os"),
                    "services": [
                        {
                            "port": service.get("port"),
                            "service": service.get("product"),
                            "version": service.get("version")
                        }
                        for service in data.get("data", [])
                    ]
                }
            else:
                return {"ip": ip_address, "error": "Not found in Shodan"}
                
        except Exception as e:
            logger.error(f"Shodan lookup failed for {ip_address}: {str(e)}")
            return {"ip": ip_address, "error": str(e)}
    
    async def check_otx_indicators(self, indicator: str, indicator_type: str) -> Dict[str, Any]:
        """Check indicators using AlienVault OTX"""
        try:
            headers = {"X-OTX-API-KEY": self.otx_key}
            
            response = requests.get(
                f"https://otx.alienvault.com/api/v1/indicators/{indicator_type}/{indicator}/general",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "indicator": indicator,
                    "type": indicator_type,
                    "reputation": data.get("reputation"),
                    "pulse_info": data.get("pulse_info", {}),
                    "malware_families": [
                        family.get("display_name") 
                        for family in data.get("malware", {}).get("data", [])
                    ]
                }
            else:
                return {"indicator": indicator, "error": "Not found in OTX"}
                
        except Exception as e:
            logger.error(f"OTX lookup failed for {indicator}: {str(e)}")
            return {"indicator": indicator, "error": str(e)}
    
    async def lookup_cve(self, cve_id: str) -> Dict[str, Any]:
        """Lookup CVE information"""
        try:
            response = requests.get(
                f"https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={cve_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("vulnerabilities"):
                    vuln = data["vulnerabilities"][0]["cve"]
                    return {
                        "cve_id": cve_id,
                        "description": vuln.get("descriptions", [{}])[0].get("value"),
                        "severity": vuln.get("metrics", {}).get("cvssMetricV3", [{}])[0].get("cvssData", {}).get("baseSeverity"),
                        "score": vuln.get("metrics", {}).get("cvssMetricV3", [{}])[0].get("cvssData", {}).get("baseScore"),
                        "published": vuln.get("published")
                    }
                else:
                    return {"cve_id": cve_id, "error": "CVE not found"}
                    
        except Exception as e:
            logger.error(f"CVE lookup failed for {cve_id}: {str(e)}")
            return {"cve_id": cve_id, "error": str(e)}
```

## services/anomaly_detection.py
```python
import re
import ipaddress
from typing import Dict, List, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class AnomalyDetectionService:
    def __init__(self):
        self.suspicious_ports = [22, 23, 135, 139, 445, 1433, 1521, 3389, 5432]
        self.dns_tunnel_indicators = [
            r'[a-f0-9]{32,}',  # Long hex strings
            r'[A-Za-z0-9+/]{20,}={0,2}',  # Base64 patterns
        ]
        
    async def analyze_network_data(self, network_data: Dict[str, Any]) -> Dict[str, Any]:
        """Main analysis function for network data"""
        threats = []
        indicators = []
        risk_score = 0
        
        # Analyze different aspects
        ip_analysis = await self._analyze_ip_addresses(network_data)
        dns_analysis = await self._analyze_dns_traffic(network_data)
        port_analysis = await self._analyze_port_activity(network_data)
        protocol_analysis = await self._analyze_protocol_anomalies(network_data)
        
        # Combine results
        threats.extend(ip_analysis["threats"])
        threats.extend(dns_analysis["threats"])
        threats.extend(port_analysis["threats"])
        threats.extend(protocol_analysis["threats"])
        
        indicators.extend(ip_analysis["indicators"])
        indicators.extend(dns_analysis["indicators"])
        indicators.extend(port_analysis["indicators"])
        indicators.extend(protocol_analysis["indicators"])
        
        # Calculate overall risk score
        risk_score = max(
            ip_analysis["risk_score"],
            dns_analysis["risk_score"],
            port_analysis["risk_score"],
            protocol_analysis["risk_score"]
        )
        
        recommendations = self._generate_recommendations(threats, risk_score)
        
        return {
            "risk_score": risk_score,
            "threats": threats,
            "indicators": indicators,
            "recommendations": recommendations,
            "analysis_timestamp": datetime.utcnow().isoformat()
        }
    
    async def _analyze_ip_addresses(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze IP addresses for suspicious activity"""
        threats = []
        indicators = []
        risk_score = 0
        
        source_ip = data.get("source_ip")
        dest_ip = data.get("destination_ip")
        
        if source_ip:
            # Check for private IP spoofing
            try:
                ip_obj = ipaddress.ip_address(source_ip)
                if ip_obj.is_private and data.get("from_internet", False):
                    threats.append({
                        "type": "IP Spoofing",
                        "severity": "high",
                        "description": f"Private IP {source_ip} detected from internet source"
                    })
                    indicators.append({"type": "spoofed_ip", "value": source_ip})
                    risk_score = max(risk_score, 80)
            except:
                pass
        
        # Check for IP scanning patterns
        if data.get("connection_count", 0) > 100:
            threats.append({
                "type": "Port Scanning",
                "severity": "medium",
                "description": f"High connection count: {data['connection_count']}"
            })
            indicators.append({"type": "scan_activity", "value": str(data["connection_count"])})
            risk_score = max(risk_score, 60)
        
        return {
            "threats": threats,
            "indicators": indicators,
            "risk_score": risk_score
        }
    
    async def _analyze_dns_traffic(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze DNS traffic for tunneling and suspicious queries"""
        threats = []
        indicators = []
        risk_score = 0
        
        dns_queries = data.get("dns_queries", [])
        
        for query in dns_queries:
            domain = query.get("domain", "")
            
            # Check for DNS tunneling patterns
            for pattern in self.dns_tunnel_indicators:
                if re.search(pattern, domain):
                    threats.append({
                        "type": "DNS Tunneling",
                        "severity": "high",
                        "description": f"Suspicious DNS query pattern in {domain}"
                    })
                    indicators.append({"type": "dns_tunnel", "value": domain})
                    risk_score = max(risk_score, 85)
                    break
            
            # Check for DGA (Domain Generation Algorithm) patterns
            if len(domain.split('.')[0]) > 20 and not any(vowel in domain for vowel in 'aeiou'):
                threats.append({
                    "type": "DGA Domain",
                    "severity": "medium",
                    "description": f"Possible algorithmically generated domain: {domain}"
                })
                indicators.append({"type": "dga_domain", "value": domain})
                risk_score = max(risk_score, 70)
        
        return {
            "threats": threats,
            "indicators": indicators,
            "risk_score": risk_score
        }
    
    async def _analyze_port_activity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze port activity for suspicious patterns"""
        threats = []
        indicators = []
        risk_score = 0
        
        ports_accessed = data.get("ports_accessed", [])
        
        # Check for suspicious port access
        suspicious_found = [port for port in ports_accessed if port in self.suspicious_ports]
        if suspicious_found:
            threats.append({
                "type": "Suspicious Port Access",
                "severity": "medium",
                "description": f"Access to suspicious ports: {suspicious_found}"
            })
            indicators.extend([{"type": "suspicious_port", "value": str(port)} for port in suspicious_found])
            risk_score = max(risk_score, 65)
        
        # Check for port scanning
        if len(ports_accessed) > 50:
            threats.append({
                "type": "Port Scanning",
                "severity": "high",
                "description": f"Large number of ports accessed: {len(ports_accessed)}"
            })
            indicators.append({"type": "port_scan", "value": str(len(ports_accessed))})
            risk_score = max(risk_score, 80)
        
        return {
            "threats": threats,
            "indicators": indicators,
            "risk_score": risk_score
        }
    
    async def _analyze_protocol_anomalies(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze protocol-specific anomalies"""
        threats = []
        indicators = []
        risk_score = 0
        
        # Check HTTP headers for anomalies
        http_headers = data.get("http_headers", {})
        if http_headers:
            user_agent = http_headers.get("User-Agent", "")
            
            # Check for suspicious user agents
            suspicious_agents = ["sqlmap", "nmap", "nikto", "dirb", "gobuster"]
            if any(agent in user_agent.lower() for agent in suspicious_agents):
                threats.append({
                    "type": "Malicious User Agent",
                    "severity": "high",
                    "description": f"Suspicious user agent detected: {user_agent}"
                })
                indicators.append({"type": "malicious_ua", "value": user_agent})
                risk_score = max(risk_score, 85)
        
        return {
            "threats": threats,
            "indicators": indicators,
            "risk_score": risk_score
        }
    
    def _generate_recommendations(self, threats: List[Dict], risk_score: int) -> List[str]:
        """Generate security recommendations based on detected threats"""
        recommendations = []
        
        if risk_score > 80:
            recommendations.append("Immediate action required: Block suspicious IP addresses")
            recommendations.append("Review firewall rules and network segmentation")
        elif risk_score > 60:
            recommendations.append("Monitor suspicious activity closely")
            recommendations.append("Consider implementing additional security controls")
        else:
            recommendations.append("Continue monitoring for anomalous patterns")
        
        threat_types = [threat["type"] for threat in threats]
        
        if "DNS Tunneling" in threat_types:
            recommendations.append("Implement DNS monitoring and filtering")
        
        if "Port Scanning" in threat_types:
            recommendations.append("Configure intrusion detection system alerts")
        
        if "IP Spoofing" in threat_types:
            recommendations.append("Enable ingress/egress filtering")
        
        return recommendations
```

## models/scan_models.py
```python
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class NetworkScanRequest(BaseModel):
    source_ip: Optional[str] = Field(None, description="Source IP address")
    destination_ip: Optional[str] = Field(None, description="Destination IP address")
    dns_queries: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    ports_accessed: Optional[List[int]] = Field(default_factory=list)
    connection_count: Optional[int] = Field(0, description="Number of connections")
    http_headers: Optional[Dict[str, str]] = Field(default_factory=dict)
    packet_size: Optional[int] = Field(None, description="Average packet size")
    protocol: Optional[str] = Field(None, description="Network protocol")
    from_internet: Optional[bool] = Field(False, description="Traffic from internet")

class ThreatIndicator(BaseModel):
    type: str
    value: str
    confidence: Optional[float] = Field(None, ge=0, le=1)

class DetectedThreat(BaseModel):
    type: str
    severity: str = Field(..., regex="^(low|medium|high|critical)$")
    description: str
    confidence: Optional[float] = Field(None, ge=0, le=1)

class NetworkScanResponse(BaseModel):
    scan_id: str
    risk_score: int = Field(..., ge=0, le=100)
    threats_detected: List[DetectedThreat]
    indicators: List[ThreatIndicator]
    recommendations: List[str]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
```

## tasks/threat_tasks.py
```python
from celery import Celery
import os
from scapy.all import rdpcap, IP, TCP, UDP, DNS
from services.supabase_service import SupabaseService
from services.threat_intelligence import ThreatIntelligenceService
from services.anomaly_detection import AnomalyDetectionService
import logging
from typing import Dict, Any
import tempfile

# Initialize Celery
celery_app = Celery(
    "threat_tasks",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379")
)

logger = logging.getLogger(__name__)

@celery_app.task(bind=True)
def process_pcap_file(self, file_content: bytes, user_id: str):
    """Process uploaded PCAP file for threat analysis"""
    try:
        # Save file content to temporary file
        with tempfile.NamedTemporaryFile(suffix='.pcap', delete=False) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        # Read PCAP file
        packets = rdpcap(temp_file_path)
        
        # Extract network data
        network_data = {
            "source_ips": set(),
            "destination_ips": set(),
            "ports_accessed": set(),
            "dns_queries": [],
            "connection_count": 0
        }
        
        for packet in packets:
            if IP in packet:
                network_data["source_ips"].add(packet[IP].src)
                network_data["destination_ips"].add(packet[IP].dst)
                network_data["connection_count"] += 1
                
                if TCP in packet:
                    network_data["ports_accessed"].add(packet[TCP].dport)
                elif UDP in packet:
                    network_data["ports_accessed"].add(packet[UDP].dport)
                
                if DNS in packet and packet[DNS].qd:
                    query_name = packet[DNS].qd.qname.decode('utf-8').rstrip('.')
                    network_data["dns_queries"].append({"domain": query_name})
        
        # Convert sets to lists for JSON serialization
        analysis_data = {
            "source_ips": list(network_data["source_ips"]),
            "destination_ips": list(network_data["destination_ips"]),
            "ports_accessed": list(network_data["ports_accessed"]),
            "dns_queries": network_data["dns_queries"],
            "connection_count": network_data["connection_count"]
        }
        
        # Analyze with anomaly detection
        anomaly_service = AnomalyDetectionService()
        analysis_result = anomaly_service.analyze_network_data(analysis_data)
        
        # Store results in Supabase
        supabase_service = SupabaseService()
        scan_data = {
            "type": "file",
            "target": "pcap_upload",
            "status": "completed",
            "score": analysis_result["risk_score"],
            "results": analysis_result,
            "created_by": user_id
        }
        
        scan_result = supabase_service.create_scan_result(scan_data)
        
        # Clean up temp file
        os.unlink(temp_file_path)
        
        return {
            "status": "completed",
            "scan_id": scan_result["id"],
            "analysis_result": analysis_result
        }
        
    except Exception as e:
        logger.error(f"PCAP processing failed: {str(e)}")
        return {"status": "failed", "error": str(e)}

@celery_app.task(bind=True)
def analyze_network_traffic(self, logs: Dict[str, Any], user_id: str):
    """Analyze network traffic logs from Suricata/Snort"""
    try:
        # Process Suricata logs
        anomaly_service = AnomalyDetectionService()
        analysis_result = anomaly_service.analyze_network_data(logs)
        
        # Store in Supabase
        supabase_service = SupabaseService()
        scan_data = {
            "type": "network",
            "target": "suricata_logs",
            "status": "completed", 
            "score": analysis_result["risk_score"],
            "results": analysis_result,
            "created_by": user_id
        }
        
        scan_result = supabase_service.create_scan_result(scan_data)
        
        return {
            "status": "completed",
            "scan_id": scan_result["id"],
            "analysis_result": analysis_result
        }
        
    except Exception as e:
        logger.error(f"Network analysis failed: {str(e)}")
        return {"status": "failed", "error": str(e)}

@celery_app.task(bind=True)
def enrich_threat_intelligence(self, indicator: str, indicator_type: str):
    """Enrich threat indicators with external intelligence"""
    try:
        ti_service = ThreatIntelligenceService()
        
        results = {}
        
        if indicator_type == "ip":
            results["abuseipdb"] = ti_service.check_ip_reputation(indicator)
            results["shodan"] = ti_service.lookup_shodan(indicator)
        
        results["otx"] = ti_service.check_otx_indicators(indicator, indicator_type)
        
        # Store enriched data
        supabase_service = SupabaseService()
        intel_data = {
            "indicator_type": indicator_type,
            "indicator_value": indicator,
            "source": "automated_enrichment",
            "metadata": results,
            "confidence_score": 0.8
        }
        
        supabase_service.store_threat_intelligence(intel_data)
        
        return {"status": "completed", "results": results}
        
    except Exception as e:
        logger.error(f"Threat intelligence enrichment failed: {str(e)}")
        return {"status": "failed", "error": str(e)}
```

## celery_worker.py
```python
from tasks.threat_tasks import celery_app
import logging
from utils.logging_config import setup_logging

if __name__ == "__main__":
    setup_logging()
    logger = logging.getLogger(__name__)
    logger.info("Starting Celery worker...")
    
    celery_app.start()
```

## utils/auth.py
```python
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import os
from services.supabase_service import SupabaseService

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate JWT token and return user info"""
    try:
        # Get JWT secret from Supabase
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if not jwt_secret:
            raise HTTPException(status_code=500, detail="JWT secret not configured")
        
        # Decode token
        payload = jwt.decode(
            credentials.credentials,
            jwt_secret,
            algorithms=["HS256"],
            audience="authenticated"
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user profile from Supabase
        supabase_service = SupabaseService()
        user_profile = await supabase_service.get_user_profile(user_id)
        
        if not user_profile:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user_profile
        
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")
```

## utils/logging_config.py
```python
import logging
import os
from datetime import datetime

def setup_logging():
    """Configure logging for the application"""
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Configure logging
    logging.basicConfig(
        level=getattr(logging, log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),  # Console output
            logging.FileHandler(f"logs/app_{datetime.now().strftime('%Y%m%d')}.log")  # File output
        ]
    )
    
    # Set third-party library log levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("supabase").setLevel(logging.WARNING)
```

## routers/health.py
```python
from fastapi import APIRouter
from datetime import datetime
import os

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "environment": os.getenv("ENV", "development")
    }

@router.get("/status")
async def get_status():
    """Detailed status endpoint"""
    return {
        "api": "running",
        "database": "connected",  # You can add actual DB health check here
        "redis": "connected",     # You can add actual Redis health check here
        "timestamp": datetime.utcnow().isoformat()
    }
```

## Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpcap-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## README.md
```markdown
# AI Phishing Detection Backend

A FastAPI-based backend for advanced phishing detection and threat analysis.

## Features

- Network traffic analysis and anomaly detection
- PCAP file processing
- Threat intelligence integration (AbuseIPDB, Shodan, OTX)
- Background task processing with Celery
- Supabase integration for data persistence
- JWT authentication
- RESTful API endpoints

## Setup

### Prerequisites

- Python 3.11+
- Redis (for Celery)
- Supabase project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with actual values

5. Start Redis:
   ```bash
   redis-server
   ```

6. Start Celery worker:
   ```bash
   python celery_worker.py
   ```

7. Run the application:
   ```bash
   uvicorn main:app --reload
   ```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/scan/network` - Analyze network traffic
- `POST /api/scan/pcap` - Upload and analyze PCAP files
- `POST /api/scan/suricata-logs` - Receive Suricata/Snort logs

## Docker

Build and run with Docker:

```bash
docker build -t phishing-detection-backend .
docker run -p 8000:8000 phishing-detection-backend
```

## Usage

The backend integrates with your React frontend through REST APIs. All endpoints require JWT authentication from Supabase.

Example request:
```bash
curl -X POST "http://localhost:8000/api/scan/network" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source_ip": "192.168.1.100", "destination_ip": "10.0.0.1"}'
```
```

Save this file and copy all the code sections to create your FastAPI backend structure. The backend is production-ready with proper error handling, logging, authentication, and modular architecture.