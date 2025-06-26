import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DonationDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  donation: any;
}

const DonationDetailsModal: React.FC<DonationDetailsModalProps> = ({
  open,
  onOpenChange,
  donation,
}) => {
  if (!donation) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Donation Details</DialogTitle>
          <DialogDescription>
            Here are the details for this donation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <strong>Amount:</strong> {donation.units} units
          </div>
          <div>
            <strong>Blood Type:</strong> {donation.blood_type}
          </div>
          <div>
            <strong>Date:</strong>{" "}
            {donation.donation_date
              ? new Date(donation.donation_date).toLocaleString()
              : "-"}
          </div>
          <div>
            <strong>Status:</strong> {donation.status}
          </div>
          <div>
            <strong>Notes:</strong> {donation.notes || "-"}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DonationDetailsModal;
