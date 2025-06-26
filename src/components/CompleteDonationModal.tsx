import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface CompleteDonationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  appointment: {
    id: string;
    hospital_id: string;
    blood_type: string;
    user_id: string;
  } | null;
}

const CompleteDonationModal: React.FC<CompleteDonationModalProps> = ({
  isOpen,
  onOpenChange,
  appointment,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bloodUnits, setBloodUnits] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment || !bloodUnits || +bloodUnits <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid number of units.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const units = +bloodUnits;

      // 1. Insert into donations table
      const { error: insertError } = await supabase.from("donations").insert({
        donation_appointment_id: appointment.id,
        user_id: appointment.user_id,
        hospital_id: appointment.hospital_id,
        blood_type: appointment.blood_type,
        units,
        status: "completed",
        donation_date: new Date().toISOString(),
      });

      if (insertError) {
        toast({
          title: "Error",
          description: insertError.message || "Failed to record donation.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // 2. Update the appointment as completed
      const { error: updateError } = await supabase
        .from("donation_appointments")
        .update({ status: "completed" })
        .eq("id", appointment.id);

      if (updateError) {
        toast({
          title: "Error",
          description: updateError.message || "Failed to update appointment.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // 3. Increment the blood inventory
      const { error: rpcError } = await supabase.rpc("increment_blood_units", {
        h_id: appointment.hospital_id,
        b_type: appointment.blood_type,
        increment_val: units,
      });
      if (rpcError) {
        toast({
          title: "Error",
          description: rpcError.message || "Failed to update blood inventory.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Donation Completed!",
        description: "The donation has been successfully recorded.",
      });
      // Invalidate queries to refetch data
      await queryClient.invalidateQueries({
        queryKey: ["agent-appointments"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["hospital-blood-inventory", appointment.hospital_id],
      });
      onOpenChange(false);
      setBloodUnits("");
    } catch (error: any) {
      console.error("Error completing donation:", error);
      toast({
        title: "Error",
        description:
          error.message || "An error occurred while completing the donation.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Donation</DialogTitle>
          <DialogDescription>
            Enter the amount of blood donated to complete the appointment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-I4 items-center gap-4">
              <Label htmlFor="blood-amount" className="text-right">
                Blood Amount (units)
              </Label>
              <Input
                id="blood-amount"
                type="number"
                value={bloodUnits}
                onChange={(e) => setBloodUnits(e.target.value)}
                className="col-span-3"
                placeholder="e.g., 1"
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CompleteDonationModal;
