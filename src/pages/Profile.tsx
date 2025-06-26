import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Heart,
  User,
  Droplet,
  Calendar,
  Phone,
  Mail,
  MapPin,
  LogOut,
  ChevronDown,
  Medal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppointmentModal from "@/components/AppointmentModal";
import PreviousAppointmentsModal from "@/components/PreviousAppointmentsModal";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  blood_type: string;
  date_of_birth: string;
  emergency_contact: string;
  emergency_phone: string;
}

interface DonationStats {
  totalDonations: number;
  totalAmount: number;
  lastDonationDate: string | null;
  nextEligibleDate: string | null;
}

// Improved MedalBadge SVG component
const MedalBadge = ({ color, label }) => (
  <span className="flex flex-col items-center justify-center">
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      {/* Scalloped edge */}
      {[...Array(20)].map((_, i) => {
        const angle = (i / 20) * 2 * Math.PI;
        const x = 40 + Math.cos(angle) * 34;
        const y = 40 + Math.sin(angle) * 34;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="4"
            fill={color}
            stroke="#bfa14a"
            strokeWidth="1"
          />
        );
      })}
      {/* Main medal circle */}
      <circle
        cx="40"
        cy="40"
        r="28"
        fill={color}
        stroke="#bfa14a"
        strokeWidth="3"
      />
      {/* Red ribbons */}
      <polygon points="28,60 40,78 52,60" fill="#D32F2F" />
      <polygon points="34,60 40,72 46,60" fill="#B71C1C" />
    </svg>
    <span className="text-base font-bold mt-2">{label}</span>
  </span>
);

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [donationStats, setDonationStats] = useState<DonationStats>({
    totalDonations: 0,
    totalAmount: 0,
    lastDonationDate: null,
    nextEligibleDate: null,
  });
  const [loading, setLoading] = useState(true);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [previousAppointments, setPreviousAppointments] = useState([]);
  const [upcomingAppointment, setUpcomingAppointment] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetchProfile();
    fetchDonationStats();
    fetchPreviousAppointments();
    fetchUpcomingAppointment();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } else {
      setProfile(data);
    }
  };

  const fetchDonationStats = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("donations")
      .select("donation_date, units, status")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("donation_date", { ascending: false });

    if (error) {
      console.error("Error fetching donations:", error);
    } else {
      const totalDonations = data.length;
      const totalAmountInUnits = data.reduce(
        (sum, donation) => sum + (donation.units || 0),
        0
      );
      const totalAmountInMl = totalAmountInUnits * 500;
      const lastDonationDate = data.length > 0 ? data[0].donation_date : null;

      // Calculate next eligible date (8 weeks after last donation)
      let nextEligibleDate = null;
      if (lastDonationDate) {
        const lastDate = new Date(lastDonationDate);
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 56); // 8 weeks = 56 days
        nextEligibleDate = nextDate.toISOString().split("T")[0];
      }

      setDonationStats({
        totalDonations,
        totalAmount: totalAmountInMl,
        lastDonationDate,
        nextEligibleDate,
      });
    }

    setLoading(false);
  };

  const fetchPreviousAppointments = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("donation_appointments")
      .select(`id, appointment_date, blood_type, status, hospitals ( name )`)
      .eq("user_id", user.id)
      .in("status", ["completed", "cancelled"])
      .order("appointment_date", { ascending: false });
    if (!error && data) {
      setPreviousAppointments(
        data.map((apt) => ({
          ...apt,
          hospital_name: apt.hospitals?.name || "Unknown Hospital",
          donation_status: apt.status,
        }))
      );
    }
  };

  const fetchUpcomingAppointment = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("donation_appointments")
      .select(`id, appointment_date, blood_type, status, hospitals ( name )`)
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .gt("appointment_date", new Date().toISOString())
      .order("appointment_date", { ascending: true })
      .limit(1)
      .single();
    if (!error && data) {
      setUpcomingAppointment({
        ...data,
        hospital_name: data.hospitals?.name || "Unknown Hospital",
      });
    } else {
      setUpcomingAppointment(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  };

  const getUserDisplayName = () => {
    if (profile && profile.first_name) {
      return `${profile.first_name}${
        profile.last_name ? ` ${profile.last_name}` : ""
      }`;
    }
    return user?.email || "User";
  };

  // Calculate eligibility (same as dashboard)
  const isEligible =
    !donationStats.lastDonationDate ||
    (donationStats.nextEligibleDate &&
      new Date() >= new Date(donationStats.nextEligibleDate));

  // Add a function to get the badge info
  const getDonorBadge = (totalDonations: number) => {
    if (totalDonations >= 10) {
      return {
        label: "Gold Donor",
        color: "bg-yellow-400 text-yellow-900 border-yellow-500",
      };
    } else if (totalDonations >= 5) {
      return {
        label: "Silver Donor",
        color: "bg-gray-300 text-gray-800 border-gray-400",
      };
    } else {
      return {
        label: "Bronze Donor",
        color: "bg-orange-300 text-orange-900 border-orange-400",
      };
    }
  };
  const donorBadge = getDonorBadge(donationStats.totalDonations);

  const handleCancelAppointment = async () => {
    if (!upcomingAppointment) return;
    setIsCancelling(true);
    const { error } = await supabase
      .from("donation_appointments")
      .update({ status: "cancelled" })
      .eq("id", upcomingAppointment.id);
    setIsCancelling(false);
    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Appointment Cancelled",
        description: "Your upcoming appointment has been cancelled.",
      });
      fetchUpcomingAppointment();
      fetchPreviousAppointments();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-12 w-12 text-red-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-red-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-red-600 fill-current" />
              <span className="text-xl font-bold text-gray-900">
                BloodConnect
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                Welcome, {getUserDisplayName()}
              </span>
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
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Profile
          </h1>
          <p className="text-gray-600">
            Manage your donation information and view your impact
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 text-red-600 mr-2" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Full Name
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">
                            {profile.first_name} {profile.last_name}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Email
                        </label>
                        <p className="text-lg">{user?.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Phone
                        </label>
                        <p className="text-lg flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {profile.phone}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Age
                        </label>
                        <p className="text-lg">
                          {calculateAge(profile.date_of_birth)} years old
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Blood Type
                        </label>
                        <p className="text-2xl font-bold text-red-600 flex items-center">
                          <Droplet className="h-6 w-6 mr-2" />
                          {profile.blood_type}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Date of Birth
                        </label>
                        <p className="text-lg flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {new Date(profile.date_of_birth).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {profile.emergency_contact && (
                      <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold mb-2">
                          Emergency Contact
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Contact Name
                            </label>
                            <p className="text-lg">
                              {profile.emergency_contact}
                            </p>
                          </div>
                          {profile.emergency_phone && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">
                                Contact Phone
                              </label>
                              <p className="text-lg flex items-center">
                                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                {profile.emergency_phone}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {upcomingAppointment && (
              <Card className="mb-8 border-orange-500">
                <CardHeader>
                  <CardTitle className="flex items-center text-orange-700">
                    <Calendar className="h-5 w-5 text-orange-500 mr-2" />
                    Upcoming Appointment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-gray-600">Date: </span>
                      <span className="text-lg font-semibold">
                        {new Date(
                          upcomingAppointment.appointment_date
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">
                        Blood Type:{" "}
                      </span>
                      <span className="text-lg font-semibold text-red-600">
                        {upcomingAppointment.blood_type}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">
                        Hospital:{" "}
                      </span>
                      <span className="text-lg font-semibold">
                        {upcomingAppointment.hospital_name}
                      </span>
                    </div>
                    <Button
                      className="mt-4 bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={handleCancelAppointment}
                      disabled={isCancelling}
                    >
                      {isCancelling ? "Cancelling..." : "Cancel Appointment"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  🏆 Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-6">
                  {/* Total donations at the top */}
                  <div className="mb-6 text-4xl font-extrabold text-red-600">
                    {donationStats.totalDonations} Donations
                  </div>
                  {/* Stepper for badges */}
                  <div className="flex flex-col gap-0 w-full max-w-xs items-center">
                    {/* Bronze */}
                    <div className="flex flex-col items-center w-full">
                      <div
                        className={`flex items-center justify-center w-64 h-40 rounded-lg text-lg font-bold border shadow-md mb-1 ${
                          donationStats.totalDonations < 5
                            ? ""
                            : "ring-2 ring-orange-500"
                        } bg-orange-300 text-orange-900 border-orange-400 ${
                          donationStats.totalDonations < 1 ? "opacity-30" : ""
                        }`}
                      >
                        {" "}
                        <MedalBadge color="#ea580c" label="Bronze" />{" "}
                      </div>
                      <div className="text-sm text-center w-full">
                        0-4 donations
                        {donationStats.totalDonations < 5 && (
                          <div className="text-xs text-gray-500">
                            {5 - donationStats.totalDonations} to Silver
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Arrow */}
                    <ChevronDown className="my-6 text-gray-400" size={48} />
                    {/* Silver */}
                    <div className="flex flex-col items-center w-full">
                      <div
                        className={`flex items-center justify-center w-64 h-40 rounded-lg text-lg font-bold border shadow-md mb-1 bg-gray-300 text-gray-800 border-gray-400 ${
                          donationStats.totalDonations >= 5 &&
                          donationStats.totalDonations < 10
                            ? "ring-2 ring-gray-500"
                            : ""
                        } ${
                          donationStats.totalDonations < 5 ? "opacity-30" : ""
                        }`}
                      >
                        {" "}
                        <MedalBadge color="#b0b0b0" label="Silver" />{" "}
                      </div>
                      <div className="text-sm text-center w-full">
                        5-9 donations
                        {donationStats.totalDonations >= 5 &&
                          donationStats.totalDonations < 10 && (
                            <div className="text-xs text-gray-500">
                              {10 - donationStats.totalDonations} to Gold
                            </div>
                          )}
                      </div>
                    </div>
                    {/* Arrow */}
                    <ChevronDown className="my-6 text-gray-400" size={48} />
                    {/* Gold */}
                    <div className="flex flex-col items-center w-full">
                      <div
                        className={`flex items-center justify-center w-64 h-40 rounded-lg text-lg font-bold border shadow-md mb-1 bg-yellow-400 text-yellow-900 border-yellow-500 ${
                          donationStats.totalDonations >= 10
                            ? "ring-2 ring-yellow-500"
                            : ""
                        } ${
                          donationStats.totalDonations < 10 ? "opacity-30" : ""
                        }`}
                      >
                        {" "}
                        <MedalBadge color="#FFD700" label="Gold" />{" "}
                      </div>
                      <div className="text-sm text-center w-full">
                        10+ donations
                      </div>
                    </div>
                  </div>
                  <p className="mt-6 text-gray-600 text-sm">
                    Based on your total donations
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Donation Statistics */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Droplet className="h-5 w-5 text-red-600 mr-2" />
                  Donation Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-1">
                    {donationStats.totalDonations}
                  </div>
                  <div className="text-sm text-gray-500">Total Donations</div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-1">
                    {donationStats.totalAmount}ml
                  </div>
                  <div className="text-sm text-gray-500">
                    Total Blood Donated
                  </div>
                </div>

                {donationStats.lastDonationDate && (
                  <div className="text-center">
                    <div className="text-lg font-semibold mb-1">
                      {new Date(
                        donationStats.lastDonationDate
                      ).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">Last Donation</div>
                  </div>
                )}

                {donationStats.nextEligibleDate && (
                  <div className="text-center">
                    <div className="text-lg font-semibold mb-1">
                      {new Date(
                        donationStats.nextEligibleDate
                      ).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      Next Eligible Date
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {Math.floor(donationStats.totalDonations * 3)} Lives
                  </div>
                  <p className="text-sm text-gray-600">
                    Potentially saved through your donations
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    *Each donation can save up to 3 lives
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setIsAppointmentModalOpen(true)}
                disabled={!isEligible}
              >
                Schedule New Donation
              </Button>
              <Button
                variant="outline"
                className="w-full border-red-600 text-red-600 hover:bg-red-50"
                onClick={() => setIsHistoryModalOpen(true)}
              >
                View Donation History
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isAppointmentModalOpen && (
        <AppointmentModal
          open={isAppointmentModalOpen}
          onOpenChange={setIsAppointmentModalOpen}
          onScheduled={fetchUpcomingAppointment}
        />
      )}

      <PreviousAppointmentsModal
        isOpen={isHistoryModalOpen}
        onOpenChange={setIsHistoryModalOpen}
        appointments={previousAppointments}
      />
    </div>
  );
};

export default Profile;
