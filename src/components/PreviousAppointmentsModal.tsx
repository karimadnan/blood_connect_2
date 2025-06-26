import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, CheckCircle, X } from "lucide-react";

interface Appointment {
  id: string;
  appointment_date: string;
  blood_type: string;
  hospital_name: string;
  donation_status: string;
  units?: number;
}

interface PreviousAppointmentsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  appointments: Appointment[];
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PreviousAppointmentsModal: React.FC<PreviousAppointmentsModalProps> = ({
  isOpen,
  onOpenChange,
  appointments,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Previous Appointments</DialogTitle>
          <DialogDescription>
            Here is a list of your past appointments.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {appointments && appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          Donation at {appointment.hospital_name}
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-xs bg-red-100 text-red-700 border-red-300"
                        >
                          {appointment.blood_type}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDateTime(appointment.appointment_date)}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {appointment.hospital_name}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex items-center space-x-2 ${
                        appointment.donation_status === "cancelled"
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {appointment.donation_status === "cancelled" ? (
                        <X className="h-5 w-5" />
                      ) : (
                        <CheckCircle className="h-5 w-5" />
                      )}
                      <span
                        className={`font-semibold ${
                          appointment.donation_status === "cancelled"
                            ? "text-red-600"
                            : ""
                        }`}
                      >
                        {appointment.donation_status
                          .replace("_", " ")
                          .toUpperCase()}
                      </span>
                      {appointment.donation_status === "completed" &&
                        appointment.units && (
                          <span className="font-bold text-red-600 ml-2">
                            {appointment.units} units
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>You have no previous appointments.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreviousAppointmentsModal;
