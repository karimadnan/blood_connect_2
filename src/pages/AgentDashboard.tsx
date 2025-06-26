import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  LogOut,
  Calendar,
  Users,
  Clock,
  MapPin,
  User,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import CompleteDonationModal from "@/components/CompleteDonationModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DonationDetailsModal from "@/components/DonationDetailsModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AppointmentData {
  id: string;
  appointment_date: string;
  status: string;
  blood_type: string;
  notes: string | null;
  hospital_id: string;
  hospital_name: string;
  donor_first_name: string;
  donor_last_name: string;
  donor_phone: string | null;
  user_id: string;
}

const HospitalDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentData | null>(null);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [selectedBloodType, setSelectedBloodType] = useState<string | null>(
    null
  );

  // Fetch agent's assigned hospitals
  const { data: assignedHospitals = [] } = useQuery({
    queryKey: ["agent-hospitals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("agent_hospital_assignments")
        .select(
          `
          hospital_id,
          hospitals (
            id,
            name,
            address,
            phone
          )
        `
        )
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch blood inventory for this hospital
  const hospitalId = assignedHospitals[0]?.hospital_id;
  const { data: bloodInventory = [] } = useQuery({
    queryKey: ["hospital-blood-inventory", hospitalId],
    queryFn: async () => {
      if (!hospitalId) return [];
      const { data, error } = await supabase
        .from("blood_inventory")
        .select("blood_type, current_units, maximum_capacity")
        .eq("hospital_id", hospitalId)
        .order("blood_type");
      if (error) throw error;
      return data;
    },
    enabled: !!hospitalId,
  });

  // Fetch appointments for assigned hospitals
  const { data: appointments = [] } = useQuery({
    queryKey: ["agent-appointments", user?.id],
    queryFn: async () => {
      if (!user?.id || assignedHospitals.length === 0) return [];

      const hospitalIds = assignedHospitals.map((h) => h.hospital_id);

      // Get appointments
      const { data: appointmentData, error: appointmentError } = await supabase
        .from("donation_appointments")
        .select(
          `
          id,
          appointment_date,
          status,
          blood_type,
          notes,
          hospital_id,
          user_id,
          hospitals (
            name
          )
        `
        )
        .in("hospital_id", hospitalIds)
        .or("status.neq.completed,status.is.null")
        .order("appointment_date", { ascending: true });

      if (appointmentError) throw appointmentError;

      if (!appointmentData || appointmentData.length === 0) return [];

      // Get user profiles for the donors
      const userIds = appointmentData.map((apt) => apt.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      return appointmentData.map((appointment) => {
        const profile = profiles?.find((p) => p.id === appointment.user_id);
        return {
          id: appointment.id,
          appointment_date: appointment.appointment_date,
          status: appointment.status,
          blood_type: appointment.blood_type,
          notes: appointment.notes,
          hospital_id: appointment.hospital_id,
          hospital_name: appointment.hospitals?.name || "Unknown Hospital",
          donor_first_name: profile?.first_name || "Unknown",
          donor_last_name: profile?.last_name || "Donor",
          donor_phone: profile?.phone || null,
          user_id: appointment.user_id,
        };
      }) as AppointmentData[];
    },
    enabled: !!user?.id && assignedHospitals.length > 0,
  });

  // Fetch hospital active status
  const {
    data: hospitalStatus,
    refetch: refetchHospitalStatus,
    isLoading: isStatusLoading,
  } = useQuery({
    queryKey: ["hospital-status", hospitalId],
    queryFn: async () => {
      if (!hospitalId) return null;
      const { data, error } = await supabase
        .from("hospitals")
        .select("is_active")
        .eq("id", hospitalId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!hospitalId,
  });

  // Local state for switch value
  const [localActive, setLocalActive] = useState<boolean | null>(null);
  React.useEffect(() => {
    if (hospitalStatus && typeof hospitalStatus.is_active === "boolean") {
      setLocalActive(hospitalStatus.is_active);
    }
  }, [hospitalStatus]);

  // Mutation to toggle hospital status
  const [isToggling, setIsToggling] = useState(false);
  const handleToggleStatus = async (checked: boolean) => {
    if (!hospitalId || hospitalStatus == null) return;
    setLocalActive(checked); // Optimistic update
    setIsToggling(true);
    const { error } = await supabase
      .from("hospitals")
      .update({ is_active: checked })
      .eq("id", hospitalId);
    setIsToggling(false);
    if (!error) {
      refetchHospitalStatus();
      toast({
        title: "Status Updated",
        description: `Hospital is now ${
          checked ? "active and accepting donations" : "not accepting donations"
        }.`,
      });
    } else {
      setLocalActive(hospitalStatus.is_active); // Revert on error
      toast({
        title: "Error",
        description: "Failed to update hospital status.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateDonationStatus = async (
    appointmentId: string,
    newStatus: string
  ) => {
    try {
      const { error } = await supabase
        .from("donation_appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["agent-appointments"] });

      toast({
        title: "Status Updated",
        description: "Donation status has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating donation status:", error);
      toast({
        title: "Error",
        description: "Failed to update donation status.",
        variant: "destructive",
      });
    }
  };

  const handleOpenCompleteModal = (appointment: AppointmentData) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "no_show":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

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

  const now = new Date();
  const todayAppointments = appointments.filter((apt) => {
    const today = new Date();
    const aptDate = new Date(apt.appointment_date);
    return (
      aptDate.getFullYear() === today.getFullYear() &&
      aptDate.getMonth() === today.getMonth() &&
      aptDate.getDate() === today.getDate()
    );
  });
  const upcomingTabAppointments = appointments.filter(
    (apt) => apt.status === "scheduled" && new Date(apt.appointment_date) > now
  );
  const otherTabAppointments = appointments.filter(
    (apt) =>
      apt.status !== "completed" &&
      (apt.status !== "scheduled" || new Date(apt.appointment_date) <= now)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-red-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-red-600 fill-current" />
              <span className="text-xl font-bold text-gray-900">
                BloodConnect Hospital
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-700">
                <User className="h-4 w-4 mr-1" />
                {user?.email}
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Hospital Dashboard
          </h1>
          <p className="text-gray-600">
            Manage appointments for your assigned hospitals
          </p>
        </div>

        {/* Assigned Hospitals */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Your Hospital Details
          </h2>
          {assignedHospitals.length > 0 ? (
            <Card className="border-red-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900">
                  {assignedHospitals[0].hospitals?.name || "Unknown Hospital"}
                </h3>
                <div className="flex items-center mt-1 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-1" />
                  {assignedHospitals[0].hospitals?.address || "No address"}
                </div>
                {assignedHospitals[0].hospitals?.phone && (
                  <div className="text-sm text-gray-600 mt-1">
                    Phone: {assignedHospitals[0].hospitals.phone}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-gray-600">No hospital assigned.</div>
          )}
        </div>

        {/* Blood Inventory for this Hospital */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            {/* Blood bag SVG icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6 text-red-600 mr-2"
            >
              <path d="M12 2C10.895 2 10 2.895 10 4V5.382C7.165 6.19 5 8.828 5 12V19C5 20.654 6.346 22 8 22H16C17.654 22 19 20.654 19 19V12C19 8.828 16.835 6.19 14 5.382V4C14 2.895 13.105 2 12 2ZM12 4C12.552 4 13 4.448 13 5V5.118C13 5.602 12.552 6 12 6C11.448 6 11 5.602 11 5.118V5C11 4.448 11.448 4 12 4ZM17 19C17 20.103 16.103 21 15 21H9C7.897 21 7 20.103 7 19V12C7 9.243 9.243 7 12 7C14.757 7 17 9.243 17 12V19ZM12 9C10.346 9 9 10.346 9 12C9 13.654 10.346 15 12 15C13.654 15 15 13.654 15 12C15 10.346 13.654 9 12 9Z" />
            </svg>
            Blood Inventory
          </h2>
          <Card className="border-red-200">
            <CardContent className="p-4">
              {bloodInventory.length === 0 ? (
                <div className="text-gray-600">
                  No blood inventory data available.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bloodInventory.map((item) => {
                    const percent = Math.min(
                      100,
                      Math.round(
                        (item.current_units / item.maximum_capacity) * 100
                      )
                    );
                    let fillColor = "#ef4444"; // red
                    if (percent > 70)
                      fillColor = "#22c55e"; // green
                    else if (percent >= 50) fillColor = "#f59e42"; // orange
                    return (
                      <div
                        key={item.blood_type}
                        className="border rounded p-4 flex flex-col items-center relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                        style={{ background: "#fff" }}
                        onClick={() => {
                          setSelectedBloodType(item.blood_type);
                          setDonationModalOpen(true);
                        }}
                      >
                        <div
                          className="absolute left-0 top-0 h-full z-0 transition-all duration-500"
                          style={{
                            width: `${percent}%`,
                            background: fillColor,
                            opacity: 0.5,
                          }}
                        />
                        <span className="font-bold text-lg text-red-600 z-10 relative">
                          {item.blood_type}
                        </span>
                        <span className="font-bold text-gray-700 mt-2 z-10 relative">
                          {item.current_units} / {item.maximum_capacity} units
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Statistics + Accepting Donations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Appointments
              </CardTitle>
              <Calendar className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {todayAppointments.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Upcoming Appointments
              </CardTitle>
              <Clock className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {upcomingTabAppointments.length}
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle>Accepting Donations</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              {isStatusLoading || localActive === null ? (
                <span className="text-gray-600">Loading status...</span>
              ) : (
                <>
                  <span
                    className={`font-semibold ${
                      localActive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {localActive ? "Active" : "Not Active"}
                  </span>
                  <Switch
                    checked={localActive}
                    onCheckedChange={handleToggleStatus}
                    disabled={isToggling}
                  />
                  {isToggling && (
                    <span className="text-gray-500 ml-2">Updating...</span>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="other">Closed Appointments</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming">
                {upcomingTabAppointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No upcoming appointments scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingTabAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                {appointment.donor_first_name}{" "}
                                {appointment.donor_last_name}
                              </h3>
                              <Badge variant="outline" className="text-xs">
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
                              {appointment.donor_phone && (
                                <div>Phone: {appointment.donor_phone}</div>
                              )}
                              {appointment.notes && (
                                <div>Notes: {appointment.notes}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <Badge
                              className={getStatusColor(appointment.status)}
                            >
                              {appointment.status
                                .replace("_", " ")
                                .toUpperCase()}
                            </Badge>
                            <Select
                              value={appointment.status}
                              onValueChange={(value) =>
                                handleUpdateDonationStatus(
                                  appointment.id,
                                  value
                                )
                              }
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="scheduled">
                                  Scheduled
                                </SelectItem>
                                <SelectItem value="no_show">No Show</SelectItem>
                                <SelectItem value="cancelled">
                                  Cancelled
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {appointment.status === "scheduled" && (
                              <Button
                                onClick={() =>
                                  handleOpenCompleteModal(appointment)
                                }
                                className="w-40"
                              >
                                Complete Donation
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="other">
                {otherTabAppointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No appointments with other statuses</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {otherTabAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                {appointment.donor_first_name}{" "}
                                {appointment.donor_last_name}
                              </h3>
                              <Badge variant="outline" className="text-xs">
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
                              {appointment.donor_phone && (
                                <div>Phone: {appointment.donor_phone}</div>
                              )}
                              {appointment.notes && (
                                <div>Notes: {appointment.notes}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <Badge
                              className={getStatusColor(appointment.status)}
                            >
                              {appointment.status
                                .replace("_", " ")
                                .toUpperCase()}
                            </Badge>
                            <Select
                              value={appointment.status}
                              onValueChange={(value) =>
                                handleUpdateDonationStatus(
                                  appointment.id,
                                  value
                                )
                              }
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="scheduled">
                                  Scheduled
                                </SelectItem>
                                <SelectItem value="no_show">No Show</SelectItem>
                                <SelectItem value="cancelled">
                                  Cancelled
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {appointment.status === "scheduled" && (
                              <Button
                                onClick={() =>
                                  handleOpenCompleteModal(appointment)
                                }
                                className="w-40"
                              >
                                Complete Donation
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <CompleteDonationModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        appointment={
          selectedAppointment
            ? {
                id: selectedAppointment.id,
                hospital_id: selectedAppointment.hospital_id,
                blood_type: selectedAppointment.blood_type,
                user_id: selectedAppointment.user_id,
              }
            : null
        }
      />
      {/* Blood Type Donations Modal */}
      {selectedBloodType && (
        <BloodTypeDonationsModal
          open={donationModalOpen}
          onOpenChange={(open: boolean) => {
            setDonationModalOpen(open);
            if (!open) setSelectedBloodType(null);
          }}
          bloodType={selectedBloodType}
          hospitalId={hospitalId}
        />
      )}
    </div>
  );
};

interface BloodTypeDonationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bloodType: string;
  hospitalId: string;
}
const BloodTypeDonationsModal: React.FC<BloodTypeDonationsModalProps> = ({
  open,
  onOpenChange,
  bloodType,
  hospitalId,
}) => {
  const { toast } = useToast();
  // 1. Fetch donations for this blood type and hospital
  const {
    data: donations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["donations", bloodType, hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("id, user_id, units, blood_type, donation_date, status")
        .eq("blood_type", bloodType)
        .eq("hospital_id", hospitalId)
        .order("donation_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!bloodType && !!hospitalId,
  });

  // 2. Fetch donor profiles for the user_ids in the donations
  const userIds = donations
    ? Array.from(new Set(donations.map((d: any) => d.user_id)))
    : [];
  const { data: profiles } = useQuery({
    queryKey: ["donor-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: open && userIds.length > 0,
  });

  // 3. Helper to get donor name
  function getDonorName(user_id: string) {
    const profile = profiles?.find((p: any) => p.id === user_id);
    return profile ? `${profile.first_name} ${profile.last_name}` : user_id;
  }

  const [showRequest, setShowRequest] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Helper: get all donor emails for this blood type
  const donorEmails = profiles?.map((p: any) => p.email).filter(Boolean) || [];

  // Handler: send request email
  async function handleSendRequest() {
    setIsSending(true);
    try {
      // Get the current user's access token
      const session = await supabase.auth.getSession();
      const accessToken = session?.data?.session?.access_token;
      const response = await fetch(
        "https://vinqjtyzximxwwgsyqsn.supabase.co/functions/v1/clever-service",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            emails: donorEmails,
            subject: "Blood Donation Request",
            message: requestMessage,
          }),
        }
      );
      if (!response.ok) throw new Error(await response.text());
      toast({
        title: "Request Sent!",
        description: "Donation request sent to donors.",
      });
      setShowRequest(false);
      setRequestMessage("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send donation request emails.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Donations for {bloodType}</DialogTitle>
          <DialogDescription>
            All donation entries for this blood type at this hospital.
          </DialogDescription>
        </DialogHeader>
        {/* Request Donations Button */}
        <div className="mb-4">
          {!showRequest ? (
            <Button
              onClick={() => setShowRequest(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Request Donations
            </Button>
          ) : (
            <div className="flex flex-col gap-2 mt-2">
              <textarea
                className="border rounded p-2 min-h-[80px]"
                placeholder="Enter your message to donors..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                disabled={isSending}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSendRequest}
                  disabled={isSending || !requestMessage}
                >
                  {isSending ? "Sending..." : "Send"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRequest(false)}
                  disabled={isSending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
        {/* Donations List */}
        {isLoading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">Error loading donations.</div>
        ) : !donations || donations.length === 0 ? (
          <div>No donations found for this blood type.</div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {donations.map((donation: any) => (
              <div
                key={donation.id}
                className="border rounded p-3 flex flex-col gap-1"
              >
                <div>
                  <strong>Donor:</strong> {getDonorName(donation.user_id)}
                </div>
                <div>
                  <strong>Date:</strong>{" "}
                  {donation.donation_date
                    ? new Date(donation.donation_date).toLocaleString()
                    : "-"}
                </div>
                <div>
                  <strong>Units:</strong>{" "}
                  <span className="text-red-600 font-bold">
                    {donation.units}
                  </span>
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  {donation.status === "completed" ? (
                    <span className="text-green-600 font-bold">completed</span>
                  ) : (
                    <span className="text-gray-600">{donation.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HospitalDashboard;
