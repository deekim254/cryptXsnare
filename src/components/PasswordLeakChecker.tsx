import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, CheckCircle, Loader2, Eye, EyeOff, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PwnedResult {
  isBreached: boolean;
  breachCount: number;
  checkedAt: string;
}

export function PasswordLeakChecker() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PwnedResult | null>(null);
  const { toast } = useToast();

  // SHA-1 hash function using Web Crypto API
  const sha1Hash = async (text: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const checkPassword = async () => {
    if (!password.trim()) {
      toast({
        title: "Please enter a password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Hash the password with SHA-1
      const hash = await sha1Hash(password);
      const prefix = hash.substring(0, 5);
      const suffix = hash.substring(5);

      // Query HaveIBeenPwned API with k-anonymity
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'CrytiXSnare-PasswordChecker',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.text();
      
      // Parse response and look for our hash suffix
      const lines = data.split('\n');
      let breachCount = 0;
      let isBreached = false;

      for (const line of lines) {
        const [hashSuffix, count] = line.trim().split(':');
        if (hashSuffix === suffix) {
          breachCount = parseInt(count, 10);
          isBreached = true;
          break;
        }
      }

      const pwnedResult: PwnedResult = {
        isBreached,
        breachCount,
        checkedAt: new Date().toISOString(),
      };

      setResult(pwnedResult);

      toast({
        title: isBreached ? "Password found in breaches!" : "Password not found in breaches",
        description: isBreached 
          ? `This password appears ${breachCount.toLocaleString()} times in data breaches`
          : "This password hasn't been found in known data breaches",
        variant: isBreached ? "destructive" : "default",
      });
    } catch (error) {
      console.error('Error checking password:', error);
      toast({
        title: "Error checking password",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setPassword("");
    setResult(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Password Leak Checker
        </CardTitle>
        <CardDescription>
          Check if your password has been compromised in known data breaches using HaveIBeenPwned
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Privacy Notice */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Privacy Protected:</strong> Your password is hashed locally with SHA-1 before checking. 
            Only the first 5 characters of the hash are sent to HaveIBeenPwned using their k-anonymity model. 
            Your actual password never leaves your browser.
          </AlertDescription>
        </Alert>

        {/* Password Input */}
        <div className="space-y-2">
          <Label htmlFor="password-check">Password to Check</Label>
          <div className="relative">
            <Input
              id="password-check"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password to check..."
              className="pr-10"
              onKeyDown={(e) => e.key === 'Enter' && checkPassword()}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={checkPassword} disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              "Check Password"
            )}
          </Button>
          {result && (
            <Button variant="outline" onClick={clearResults}>
              Clear
            </Button>
          )}
        </div>

        {/* Results */}
        {result && (
          <Card className={result.isBreached ? "border-destructive" : "border-success"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.isBreached ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Password Compromised
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-success" />
                    Password Not Found
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.isBreached ? (
                <div className="space-y-3">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Security Risk:</strong> This password has been found in data breaches and should be changed immediately.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Breach Count</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-lg px-3 py-1">
                          {result.breachCount.toLocaleString()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">times found</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Risk Level</Label>
                      <Badge variant="destructive">
                        {result.breachCount > 1000 ? "Very High" : 
                         result.breachCount > 100 ? "High" : 
                         result.breachCount > 10 ? "Medium" : "Low"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Recommendations</Label>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Change this password immediately</li>
                      <li>• Use a unique, strong password for each account</li>
                      <li>• Consider using a password manager</li>
                      <li>• Enable two-factor authentication where available</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Alert className="border-success">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <AlertDescription>
                      <strong>Good News:</strong> This password hasn't been found in any known data breaches.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label>Security Tips</Label>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Keep using unique passwords for each account</li>
                      <li>• Regularly check your passwords for breaches</li>
                      <li>• Consider using a password manager</li>
                      <li>• Enable two-factor authentication</li>
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                Checked: {new Date(result.checkedAt).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• This service uses the HaveIBeenPwned Pwned Passwords API</p>
          <p>• Data is sourced from publicly disclosed security breaches</p>
          <p>• Your password is never transmitted in full to any external service</p>
        </div>
      </CardContent>
    </Card>
  );
}