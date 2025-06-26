import React from "react";
import { Link } from "react-router-dom";
import { Heart, Users, Clock, Shield, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";

const Index = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, isAgent } = useRole();

  const handleSignOut = async () => {
    await signOut();
  };

  const getDashboardLink = () => {
    if (isAdmin) {
      return "/admin/dashboard";
    } else if (isAgent) {
      return "/agent/dashboard";
    }
    return "/profile";
  };

  const getDashboardLabel = () => {
    if (isAdmin) {
      return "Admin Dashboard";
    } else if (isAgent) {
      return "Agent Dashboard";
    }
    return "Profile";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-red-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-red-600 fill-current" />
              <span className="text-xl font-bold text-gray-900">
                BloodConnect
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/"
                className="text-gray-700 hover:text-red-600 transition-colors"
              >
                Home
              </Link>
              <Link
                to="/about"
                className="text-gray-700 hover:text-red-600 transition-colors"
              >
                About
              </Link>
              <Link
                to="/contact"
                className="text-gray-700 hover:text-red-600 transition-colors"
              >
                Contact
              </Link>

              {user ? (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/profile"
                    className="flex items-center text-gray-700 hover:text-red-600 transition-colors"
                  >
                    <User className="h-4 w-4 mr-1" />
                    {user.email}
                  </Link>
                  <Link to={getDashboardLink()}>
                    <Button
                      variant="outline"
                      className="border-red-600 text-red-600 hover:bg-red-50"
                    >
                      {getDashboardLabel()}
                    </Button>
                  </Link>
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-red-600 transition-colors"
                  >
                    Login
                  </Link>
                  <Link to="/signup">
                    <Button className="bg-red-600 hover:bg-red-700 text-white">
                      Donate Now
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Save Lives with
              <span className="text-red-600 block">Blood Donation</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Join our community of heroes who make a difference every day. Your
              donation can save up to three lives.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link to={getDashboardLink()}>
                  <Button
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
                  >
                    {getDashboardLabel()}
                  </Button>
                </Link>
              ) : (
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
                  >
                    Become a Donor
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="lg"
                className="border-red-600 text-red-600 hover:bg-red-50 px-8 py-3 text-lg"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">10,000+</h3>
              <p className="text-gray-600">Active Donors</p>
            </div>
            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">50,000+</h3>
              <p className="text-gray-600">Lives Saved</p>
            </div>
            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">24/7</h3>
              <p className="text-gray-600">Available</p>
            </div>
            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">100%</h3>
              <p className="text-gray-600">Safe Process</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-red-100 mb-8">
            Join thousands of donors who are already saving lives
          </p>
          {user ? (
            <Link to={getDashboardLink()}>
              <Button
                size="lg"
                className="bg-white text-red-600 hover:bg-gray-100 px-8 py-3 text-lg"
              >
                {getDashboardLabel()}
              </Button>
            </Link>
          ) : (
            <Link to="/signup">
              <Button
                size="lg"
                className="bg-white text-red-600 hover:bg-gray-100 px-8 py-3 text-lg"
              >
                Sign Up Today
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="h-6 w-6 text-red-500 fill-current" />
                <span className="text-lg font-bold">BloodConnect</span>
              </div>
              <p className="text-gray-400">
                Connecting donors with those in need to save lives every day.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link to="/" className="hover:text-white transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about"
                    className="hover:text-white transition-colors"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">For Donors</h4>
              <ul className="space-y-2 text-gray-400">
                {user ? (
                  <>
                    <li>
                      <Link
                        to={getDashboardLink()}
                        className="hover:text-white transition-colors"
                      >
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/profile"
                        className="hover:text-white transition-colors"
                      >
                        Profile
                      </Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link
                        to="/signup"
                        className="hover:text-white transition-colors"
                      >
                        Sign Up
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/login"
                        className="hover:text-white transition-colors"
                      >
                        Login
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
              <div className="text-gray-400 space-y-2">
                <p>Emergency: 911</p>
                <p>Info: (555) 123-4567</p>
                <p>Email: help@bloodconnect.org</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 BloodConnect. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
