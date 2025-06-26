import React from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Users,
  Calendar,
  TrendingUp,
  MapPin,
  Bell,
  Settings,
  LogOut,
  Droplets,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import HospitalManagement from "@/components/AgentManagement";

// Define types for blood inventory aggregation
interface BloodInventoryAggregated {
  current: number;
  needed: number;
  hospitals: number;
}

interface BloodInventoryResult {
  blood_type: string;
  current: number;
  needed: number;
  percentage: number;
}

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { role, isAdmin } = useRole();

  // Fetch statistics
  const { data: donorStats } = useQuery({
    queryKey: ["donor-stats"],
    queryFn: async () => {
      const { count: totalDonors } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: totalDonations } = await supabase
        .from("donations")
        .select("*", { count: "exact", head: true });

      // Get monthly donations (current month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthlyDonations } = await supabase
        .from("donations")
        .select("*", { count: "exact", head: true })
        .gte("donation_date", startOfMonth.toISOString());

      // Get active donors (donated in last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: activeDonorIds } = await supabase
        .from("donations")
        .select("user_id")
        .gte("donation_date", sixMonthsAgo.toISOString());

      const activeDonors = new Set(activeDonorIds?.map((d) => d.user_id) || [])
        .size;

      return {
        totalDonors: totalDonors || 0,
        activeDonors,
        totalDonations: totalDonations || 0,
        monthlyDonations: monthlyDonations || 0,
      };
    },
  });

  // Fetch blood inventory
  const { data: bloodInventory = [] } = useQuery<BloodInventoryResult[]>({
    queryKey: ["blood-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_inventory")
        .select(
          `
          *,
          hospitals (
            name
          )
        `
        )
        .order("blood_type");

      if (error) throw error;

      // Aggregate by blood type across all hospitals with proper typing
      const aggregated = data.reduce<Record<string, BloodInventoryAggregated>>(
        (acc, item) => {
          if (!acc[item.blood_type]) {
            acc[item.blood_type] = {
              current: 0,
              needed: 0,
              hospitals: 0,
            };
          }
          acc[item.blood_type].current += item.current_units;
          acc[item.blood_type].needed += item.maximum_capacity;
          acc[item.blood_type].hospitals += 1;
          return acc;
        },
        {}
      );

      return Object.entries(aggregated).map(
        ([bloodType, stats]): BloodInventoryResult => ({
          blood_type: bloodType,
          current: stats.current,
          needed: stats.needed,
          percentage: Math.round((stats.current / stats.needed) * 100),
        })
      );
    },
  });

  // Fetch upcoming appointments
  const { data: upcomingAppointments = [] } = useQuery({
    queryKey: ["upcoming-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_appointments")
        .select(
          `
          *,
          hospitals (
            name,
            address
          )
        `
        )
        .eq("status", "scheduled")
        .gte("appointment_date", new Date().toISOString())
        .order("appointment_date", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Fetch recent alerts (low inventory)
  const recentAlerts = bloodInventory
    .filter((item) => item.percentage < 60)
    .map((item) => ({
      type: item.percentage < 30 ? "urgent" : "low",
      message: `${item.blood_type} blood type ${
        item.percentage < 30 ? "critically low" : "below normal level"
      } (${item.percentage}%)`,
      time: "1 hour ago",
    }))
    .slice(0, 4);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-green-500";
      case "completed":
        return "bg-blue-500";
      case "cancelled":
        return "bg-red-500";
      case "no_show":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "urgent":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "low":
        return <TrendingUp className="h-4 w-4 text-yellow-600" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Bell className="h-4 w-4 text-blue-600" />;
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Admin Access Required
          </h1>
          <p className="text-gray-600 mb-4">
            You need admin privileges to access this dashboard
          </p>
          <Link to="/dashboard">
            <Button className="bg-red-600 hover:bg-red-700 text-white mr-4">
              Go to Dashboard
            </Button>
          </Link>
          <Link to="/login">
            <Button
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-red-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-red-600 fill-current" />
              <span className="text-xl font-bold text-gray-900">
                BloodConnect Admin
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Bell className="h-6 w-6 text-gray-600 hover:text-red-600 cursor-pointer" />
              <Settings className="h-6 w-6 text-gray-600 hover:text-red-600 cursor-pointer" />
              <div className="flex items-center space-x-2">
                <div className="bg-red-100 w-8 h-8 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-semibold text-sm">AD</span>
                </div>
                <span className="text-gray-700 font-medium">Admin</span>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage blood donations, drives, and donor information
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Users className="h-4 w-4 text-red-600 mr-2" />
                Total Donors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {donorStats?.totalDonors.toLocaleString() || 0}
              </div>
              <p className="text-xs text-green-600">↑ Growing community</p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Droplets className="h-4 w-4 text-red-600 mr-2" />
                Total Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {donorStats?.totalDonations.toLocaleString() || 0}
              </div>
              <p className="text-xs text-green-600">↑ Lives saved</p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Calendar className="h-4 w-4 text-red-600 mr-2" />
                Monthly Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {donorStats?.monthlyDonations.toLocaleString() || 0}
              </div>
              <p className="text-xs text-blue-600">This month</p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <TrendingUp className="h-4 w-4 text-red-600 mr-2" />
                Active Donors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {donorStats?.activeDonors.toLocaleString() || 0}
              </div>
              <p className="text-xs text-green-600">Last 6 months</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Blood Inventory */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Droplets className="h-5 w-5 text-red-600 mr-2" />
                  Blood Inventory Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {bloodInventory.map((item) => (
                    <div key={item.blood_type} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-red-600">
                          {item.blood_type}
                        </span>
                        <span className="text-sm text-gray-600">
                          {item.current}/{item.needed}
                        </span>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{item.percentage}%</span>
                        <span
                          className={
                            item.percentage < 30
                              ? "text-red-600"
                              : item.percentage < 60
                              ? "text-yellow-600"
                              : "text-green-600"
                          }
                        >
                          {item.percentage < 30
                            ? "Critical"
                            : item.percentage < 60
                            ? "Low"
                            : "Good"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* Hospital Management Section */}
            <HospitalManagement />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 text-red-600 mr-2" />
                  Blood Inventory Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {recentAlerts.map((alert, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50"
                      >
                        {getAlertIcon(alert.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            {alert.message}
                          </p>
                          <p className="text-xs text-gray-500">{alert.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      All blood types have adequate inventory
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start bg-red-600 hover:bg-red-700 text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Blood Drive
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Donors
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Droplets className="h-4 w-4 mr-2" />
                  Update Inventory
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Database</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-green-600">Online</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">API Services</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-green-600">Online</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Blood Inventory</span>
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full mr-2 ${
                        recentAlerts.some((a) => a.type === "urgent")
                          ? "bg-red-500"
                          : recentAlerts.length > 0
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                    ></div>
                    <span
                      className={`text-sm ${
                        recentAlerts.some((a) => a.type === "urgent")
                          ? "text-red-600"
                          : recentAlerts.length > 0
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {recentAlerts.some((a) => a.type === "urgent")
                        ? "Critical"
                        : recentAlerts.length > 0
                        ? "Warning"
                        : "Normal"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
