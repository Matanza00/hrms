import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud } from "lucide-react";

export const Route = createFileRoute("/_app/leaves/request")({
  component: () => (
    <div className="max-w-2xl rounded-2xl border bg-card p-6">
      <h3 className="text-base font-semibold">New leave request</h3>
      <p className="text-xs text-muted-foreground mb-5">Submit a request for approval by HR.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Leave type</Label>
          <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="annual">Annual</SelectItem><SelectItem value="casual">Casual</SelectItem><SelectItem value="sick">Sick</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent>
          </Select>
        </div>
        <div />
        <div className="space-y-1.5"><Label className="text-xs">Start date</Label><Input type="date" /></div>
        <div className="space-y-1.5"><Label className="text-xs">End date</Label><Input type="date" /></div>
        <div className="sm:col-span-2 space-y-1.5"><Label className="text-xs">Reason</Label><Textarea rows={3} placeholder="Briefly explain your reason…" /></div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs">Attachment</Label>
          <div className="rounded-xl border-2 border-dashed p-6 text-center">
            <UploadCloud className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground mt-2">Optional medical note or supporting document</p>
          </div>
        </div>
        <div className="sm:col-span-2 space-y-1.5"><Label className="text-xs">Notes for admin</Label><Textarea rows={2} /></div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" asChild><Link to="/leaves">Cancel</Link></Button>
        <Button>Submit request</Button>
      </div>
    </div>
  ),
});
