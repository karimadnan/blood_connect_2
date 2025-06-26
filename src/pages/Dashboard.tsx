// Remove all content from the Dashboard page. This file is now deprecated as users are redirected to the profile page after login.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/profile", { replace: true });
  }, [navigate]);
  return null;
}
