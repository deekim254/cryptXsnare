import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Link as LinkIcon, MessageSquare, Clock, User, AlertTriangle } from "lucide-react";
import { caseService, type CaseDetail } from "@/services/caseService";
import { alertService } from "@/services/alertService";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";

const priorityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const statusColors = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [linkAlertDialogOpen, setLinkAlertDialogOpen] = useState(false);
  const [availableAlerts, setAvailableAlerts] = useState<any[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      loadCaseDetail();
      loadAvailableAlerts();
    }
  }, [id]);

  const loadCaseDetail = async () => {
    try {
      setLoading(true);
      const data = await caseService.getCase(id!);
      setCaseData(data);
    } catch (error) {
      toast({
        title: "Error loading case",
        description: "Failed to load case details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableAlerts = async () => {
    try {
      const { alerts } = await alertService.listAlerts({ limit: 100 });
      setAvailableAlerts(alerts);
    } catch (error) {
      console.error("Error loading alerts:", error);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await caseService.updateCase(id!, { status });
      await loadCaseDetail();
      toast({
        title: "Status updated",
        description: "Case status has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update case status.",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePriority = async (priority: string) => {
    try {
      await caseService.updateCase(id!, { priority });
      await loadCaseDetail();
      toast({
        title: "Priority updated",
        description: "Case priority has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update case priority.",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;

    try {
      await caseService.addComment(id!, comment);
      setComment("");
      await loadCaseDetail();
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment.",
        variant: "destructive",
      });
    }
  };

  const handleLinkAlert = async () => {
    if (!selectedAlertId) return;

    try {
      await caseService.linkAlert(id!, selectedAlertId);
      await loadCaseDetail();
      setLinkAlertDialogOpen(false);
      setSelectedAlertId("");
      toast({
        title: "Alert linked",
        description: "Alert has been linked to this case successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to link alert.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading case details...</div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p>Case not found.</p>
          <Button onClick={() => navigate('/cases')} className="mt-4">
            Back to Cases
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/cases')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{caseData.title}</h1>
          <p className="text-muted-foreground">Case ID: {caseData.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Case Details */}
          <Card>
            <CardHeader>
              <CardTitle>Case Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Description</Label>
                <p className="text-sm mt-1">{caseData.description || 'No description provided.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Created By</Label>
                  <p className="text-sm mt-1">{caseData.created_by_profile?.full_name || 'Unknown'}</p>
                </div>
                <div>
                  <Label>Assigned To</Label>
                  <p className="text-sm mt-1">{caseData.assigned_to_profile?.full_name || 'Unassigned'}</p>
                </div>
                <div>
                  <Label>Created</Label>
                  <p className="text-sm mt-1">{format(new Date(caseData.created_at), 'PPpp')}</p>
                </div>
                <div>
                  <Label>Last Updated</Label>
                  <p className="text-sm mt-1">{formatDistanceToNow(new Date(caseData.updated_at), { addSuffix: true })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Linked Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Linked Alerts ({caseData.linked_alerts.length})
              </CardTitle>
              <Dialog open={linkAlertDialogOpen} onOpenChange={setLinkAlertDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link Alert
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link Alert to Case</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Select Alert</Label>
                      <Select value={selectedAlertId} onValueChange={setSelectedAlertId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an alert" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableAlerts.map((alert) => (
                            <SelectItem key={alert.id} value={alert.id}>
                              {alert.type} - {alert.source} ({alert.severity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleLinkAlert}>Link Alert</Button>
                      <Button variant="outline" onClick={() => setLinkAlertDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {caseData.linked_alerts.length > 0 ? (
                <div className="space-y-2">
                  {caseData.linked_alerts.map((link) => (
                    <div key={link.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{link.alert.type}</p>
                          <p className="text-sm text-muted-foreground">
                            Source: {link.alert.source} | Severity: {link.alert.severity}
                          </p>
                        </div>
                        <Badge className={statusColors[link.alert.status]}>
                          {link.alert.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No alerts linked to this case yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Timeline / Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline & Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {caseData.comments.map((comment) => (
                  <div key={comment.id} className="p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{comment.user.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <p className="text-sm mt-1">{comment.comment}</p>
                        {comment.comment_type !== 'comment' && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {comment.comment_type.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>Add Comment</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                />
                <Button onClick={handleAddComment} disabled={!comment.trim()}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Comment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Priority */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Priority</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select value={caseData.status} onValueChange={handleUpdateStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={caseData.priority} onValueChange={handleUpdatePriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2">
                <Badge className={statusColors[caseData.status]}>
                  {caseData.status.replace('_', ' ')}
                </Badge>
                <Badge className={`${priorityColors[caseData.priority]} ml-2`}>
                  {caseData.priority}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {caseData.status === 'open' && (
                <Button className="w-full" onClick={() => handleUpdateStatus('in_progress')}>
                  Start Working
                </Button>
              )}
              {['open', 'in_progress'].includes(caseData.status) && (
                <Button className="w-full" variant="outline" onClick={() => handleUpdateStatus('resolved')}>
                  Mark as Resolved
                </Button>
              )}
              {caseData.status === 'resolved' && (
                <Button className="w-full" variant="outline" onClick={() => handleUpdateStatus('closed')}>
                  Close Case
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
