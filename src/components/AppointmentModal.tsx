import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Heart } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled?: () => void;
}

const AppointmentModal = ({
  open,
  onOpenChange,
  onScheduled,
}: AppointmentModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<string | null>(
    null
  );

  // Check if user already has an appointment
  const { data: existingAppointments = [] } = useQuery({
    queryKey: ["user-appointments-check", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("donation_appointments")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "scheduled");

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Fetch hospitals
  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospitals")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch time windows for selected hospital
  const { data: timeWindows = [] } = useQuery({
    queryKey: ["hospital-time-windows", selectedHospital],
    queryFn: async () => {
      if (!selectedHospital) return [];
      const { data, error } = await supabase
        .from("hospital_time_windows")
        .select("*")
        .eq("hospital_id", selectedHospital)
        .eq("is_active", true)
        .order("day_of_week")
        .order("start_time");

      if (error) throw error;
      return data;
    },
    enabled: !!selectedHospital,
  });

  // Add a query to fetch the user's profile and get their blood type
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("blood_type")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getDayName = (dayOfWeek: number) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[dayOfWeek];
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleSchedule = async () => {
    if (!selectedHospital || !selectedTimeWindow || !user) return;

    // Double-check if user already has an appointment
    if (existingAppointments.length > 0) {
      console.log("User already has an appointment scheduled");
      return;
    }

    try {
      // For demo purposes, we'll schedule for next week at the selected time window
      const timeWindow = timeWindows.find((tw) => tw.id === selectedTimeWindow);
      if (!timeWindow) return;

      const today = new Date();
      const daysUntilSelected =
        (timeWindow.day_of_week - today.getDay() + 7) % 7;
      const appointmentDate = new Date(today);
      appointmentDate.setDate(
        today.getDate() + (daysUntilSelected === 0 ? 7 : daysUntilSelected)
      );

      // Set the time from the time window
      const [hours, minutes] = timeWindow.start_time.split(":");
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error } = await supabase.from("donation_appointments").insert({
        user_id: user.id,
        hospital_id: selectedHospital,
        appointment_date: appointmentDate.toISOString(),
        blood_type: profile?.blood_type || "A+", // fallback if not set
        status: "scheduled",
        notes: "Scheduled via dashboard",
      });

      if (error) throw error;

      // Invalidate and refetch appointments to update the UI
      queryClient.invalidateQueries({ queryKey: ["appointments", user.id] });
      queryClient.invalidateQueries({
        queryKey: ["user-appointments-check", user.id],
      });

      // Reset form and close modal
      setSelectedHospital(null);
      setSelectedTimeWindow(null);
      onOpenChange(false);
      if (onScheduled) onScheduled();
    } catch (error) {
      console.error("Error scheduling appointment:", error);
    }
  };

  // Don't render modal content if user already has an appointment
  if (existingAppointments.length > 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Heart className="h-5 w-5 text-red-600 mr-2" />
              Appointment Limit Reached
            </DialogTitle>
            <DialogDescription>
              You already have an appointment scheduled. You can only have one
              appointment at a time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Heart className="h-5 w-5 text-red-600 mr-2" />
            Schedule Donation Appointment
          </DialogTitle>
          <DialogDescription>
            Choose a hospital and available time window for your donation
            appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Hospital Selection */}
          <div>
            <h3 className="text-lg font-medium mb-3">Select Hospital</h3>
            <div className="space-y-3">
              {hospitals.map((hospital) => (
                <Card
                  key={hospital.id}
                  className={`cursor-pointer transition-colors ${
                    selectedHospital === hospital.id
                      ? "border-red-600 bg-red-50"
                      : "hover:border-red-200"
                  }`}
                  onClick={() => setSelectedHospital(hospital.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {hospital.name}
                        </h4>
                        <div className="flex items-center mt-1 text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-1" />
                          {hospital.address}
                        </div>
                        {hospital.phone && (
                          <div className="text-sm text-gray-600 mt-1">
                            Phone: {hospital.phone}
                          </div>
                        )}
                      </div>
                      {selectedHospital === hospital.id && (
                        <Badge className="bg-red-600 text-white">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Time Window Selection */}
          {selectedHospital && (
            <div>
              <h3 className="text-lg font-medium mb-3">Select Time Window</h3>
              {timeWindows.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {timeWindows.map((window) => (
                    <Card
                      key={window.id}
                      className={`cursor-pointer transition-colors ${
                        selectedTimeWindow === window.id
                          ? "border-red-600 bg-red-50"
                          : "hover:border-red-200"
                      }`}
                      onClick={() => setSelectedTimeWindow(window.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">
                              {getDayName(window.day_of_week)}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatTime(window.start_time)} -{" "}
                              {formatTime(window.end_time)}
                            </div>
                          </div>
                          {selectedTimeWindow === window.id && (
                            <Badge className="bg-red-600 text-white">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No time windows available for this hospital</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleSchedule}
              disabled={!selectedHospital || !selectedTimeWindow}
            >
              Schedule Appointment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentModal;
