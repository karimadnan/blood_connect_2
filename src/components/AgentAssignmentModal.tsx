import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface AgentAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AgentProfile {
  user_id: string;
  first_name: string;
  last_name: string;
}

const AgentAssignmentModal = ({
  isOpen,
  onClose,
}: AgentAssignmentModalProps) => {
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all agents with proper profile handling
  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      console.log("AgentAssignmentModal: Fetching agents...");

      // Get all agent user IDs
      const { data: agentRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "agent");

      console.log("AgentAssignmentModal: Agent roles query result:", {
        agentRoles,
        rolesError,
      });

      if (rolesError) throw rolesError;

      if (!agentRoles || agentRoles.length === 0) {
        console.log("AgentAssignmentModal: No agent roles found");
        return [];
      }

      const agentUserIds = agentRoles.map((role) => role.user_id);
      console.log("AgentAssignmentModal: Agent user IDs:", agentUserIds);

      // Get existing profiles for these agents
      const { data: existingProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", agentUserIds);

      console.log("AgentAssignmentModal: Existing profiles query result:", {
        existingProfiles,
        profilesError,
      });

      if (profilesError) {
        console.error(
          "AgentAssignmentModal: Profile query error:",
          profilesError
        );
        return [];
      }

      const existingProfileIds = new Set(
        (existingProfiles || []).map((p) => p.id)
      );
      const missingProfileIds = agentUserIds.filter(
        (id) => !existingProfileIds.has(id)
      );

      console.log(
        "AgentAssignmentModal: Missing profile IDs:",
        missingProfileIds
      );

      // Create missing profiles for agents
      if (missingProfileIds.length > 0) {
        console.log(
          "AgentAssignmentModal: Creating missing profiles for agents..."
        );
        const missingProfiles = missingProfileIds.map((id, index) => ({
          id,
          first_name: "Agent",
          last_name: `User ${index + 1}`,
          phone: null,
          blood_type: null,
          date_of_birth: null,
          emergency_contact: null,
          emergency_phone: null,
        }));

        const { error: insertError } = await supabase
          .from("profiles")
          .insert(missingProfiles);

        if (insertError) {
          console.error(
            "AgentAssignmentModal: Error creating missing profiles:",
            insertError
          );
          // Continue with existing profiles even if some couldn't be created
        } else {
          console.log(
            "AgentAssignmentModal: Successfully created missing profiles"
          );
        }

        // Fetch all profiles again after creation
        const { data: allProfiles, error: allProfilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", agentUserIds);

        if (allProfilesError) {
          console.error(
            "AgentAssignmentModal: Error fetching all profiles after creation:",
            allProfilesError
          );
          return (existingProfiles || []).map((profile) => ({
            user_id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
          })) as AgentProfile[];
        }

        const result = (allProfiles || []).map((profile) => ({
          user_id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
        })) as AgentProfile[];

        console.log(
          "AgentAssignmentModal: Final agents result after profile creation:",
          result
        );
        return result;
      }

      // If no missing profiles, return existing ones
      const result = (existingProfiles || []).map((profile) => ({
        user_id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
      })) as AgentProfile[];

      console.log("AgentAssignmentModal: Final agents result:", result);
      return result;
    },
    enabled: isOpen,
  });

  // Fetch all assigned agent user_ids
  const { data: assignedAgentIds = [] } = useQuery({
    queryKey: ["assigned-agent-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_hospital_assignments")
        .select("user_id")
        .eq("is_active", true);
      if (error) throw error;
      return (data || []).map((row) => row.user_id);
    },
    enabled: isOpen,
  });

  // Filter agents to only those not already assigned
  const unassignedAgents = agents.filter(
    (agent) => !assignedAgentIds.includes(agent.user_id)
  );

  // Fetch all hospitals
  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospitals")
        .select("id, name, address")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Mutation for assigning agent to hospital
  const assignAgentMutation = useMutation({
    mutationFn: async ({
      agentId,
      hospitalId,
    }: {
      agentId: string;
      hospitalId: string;
    }) => {
      // Check if the agent is already assigned to any hospital
      const { data: existingAssignment } = await supabase
        .from("agent_hospital_assignments")
        .select("id")
        .eq("user_id", agentId)
        .eq("is_active", true)
        .maybeSingle();

      if (existingAssignment) {
        throw new Error("This user is already assigned to a hospital.");
      }

      // Create new assignment
      const { error } = await supabase
        .from("agent_hospital_assignments")
        .insert({
          user_id: agentId,
          hospital_id: hospitalId,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Agent has been assigned to the hospital successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["agent-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-agents"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign agent to hospital.",
        variant: "destructive",
      });
    },
  });

  const handleAssign = () => {
    if (!selectedAgent || !selectedHospital) {
      toast({
        title: "Error",
        description: "Please select both an agent and a hospital.",
        variant: "destructive",
      });
      return;
    }

    assignAgentMutation.mutate({
      agentId: selectedAgent,
      hospitalId: selectedHospital,
    });
  };

  const handleClose = () => {
    setSelectedAgent("");
    setSelectedHospital("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Hospital to User</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {unassignedAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg
                width="100"
                height="100"
                viewBox="0 0 100 100"
                fill="none"
                className="mb-4"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="20"
                  y="35"
                  width="60"
                  height="45"
                  rx="6"
                  fill="#fff"
                  stroke="#d1d5db"
                  strokeWidth="3"
                />
                <rect x="45" y="60" width="10" height="20" fill="#d1d5db" />
                <rect x="28" y="45" width="8" height="8" fill="#d1d5db" />
                <rect x="64" y="45" width="8" height="8" fill="#d1d5db" />
                <rect x="28" y="58" width="8" height="8" fill="#d1d5db" />
                <rect x="64" y="58" width="8" height="8" fill="#d1d5db" />
                <rect x="46.5" y="25" width="7" height="18" fill="#ef4444" />
                <rect x="41" y="32" width="18" height="7" fill="#ef4444" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2 text-center">
                There are no hospital accounts unassigned.
              </h3>
              <p className="text-gray-500 text-center">
                All users are already assigned to a hospital or there are no
                hospital accounts available.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select User</label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedAgents.map((agent) => (
                      <SelectItem key={agent.user_id} value={agent.user_id}>
                        {agent.first_name} {agent.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Hospital</label>
                <Select
                  value={selectedHospital}
                  onValueChange={setSelectedHospital}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitals.map((hospital) => (
                      <SelectItem key={hospital.id} value={hospital.id}>
                        {hospital.name} - {hospital.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {unassignedAgents.length > 0 && (
          <DialogFooter>
            <Button
              onClick={handleAssign}
              disabled={assignAgentMutation.isPending || agents.length === 0}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {assignAgentMutation.isPending
                ? "Assigning..."
                : "Assign Hospital"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AgentAssignmentModal;
