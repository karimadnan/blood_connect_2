import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Building2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AgentAssignmentModal from "./AgentAssignmentModal";

interface AgentProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

interface AgentWithAssignments extends AgentProfile {
  assignments: Array<{
    id: string;
    hospital_id: string;
    is_active: boolean;
    created_at: string;
    hospital_name: string;
    hospital_address: string;
  }>;
}

interface AgentAssignmentsData {
  agentsWithAssignments: AgentWithAssignments[];
  missingProfileIds: string[];
}

const HospitalManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create missing profiles for agent users
  const createMissingProfilesMutation = useMutation({
    mutationFn: async (agentUserIds: string[]) => {
      console.log(
        "Creating missing profiles for agent user IDs:",
        agentUserIds
      );

      // Create basic profiles with placeholder data
      const missingProfiles = agentUserIds.map((userId, index) => ({
        id: userId,
        first_name: `Agent`,
        last_name: `User ${index + 1}`,
        phone: null,
        blood_type: null,
        date_of_birth: null,
        emergency_contact: null,
        emergency_phone: null,
      }));

      if (missingProfiles.length > 0) {
        console.log("Inserting missing profiles:", missingProfiles);
        const { error: insertError } = await supabase
          .from("profiles")
          .insert(missingProfiles);

        if (insertError) {
          console.error("Error inserting profiles:", insertError);
          throw insertError;
        }
      }

      return missingProfiles;
    },
    onSuccess: (createdProfiles) => {
      if (createdProfiles.length > 0) {
        toast({
          title: "Profiles Created",
          description: `Created ${createdProfiles.length} missing agent profiles with placeholder data. Agents can update their information later.`,
        });
        // Refresh all agent-related queries
        queryClient.invalidateQueries({ queryKey: ["agent-assignments"] });
        queryClient.invalidateQueries({ queryKey: ["unassigned-agents"] });
        queryClient.invalidateQueries({ queryKey: ["agents"] });
      }
    },
    onError: (error: any) => {
      console.error("Error creating profiles:", error);
      toast({
        title: "Error",
        description:
          "Failed to create missing agent profiles. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch all agents with their assignments
  const {
    data: agentAssignments = {
      agentsWithAssignments: [],
      missingProfileIds: [],
    },
    isLoading,
    refetch: refetchAssignments,
  } = useQuery<AgentAssignmentsData>({
    queryKey: ["agent-assignments"],
    queryFn: async () => {
      console.log("Fetching agent assignments...");

      // First get all agent user IDs
      const { data: agentRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "agent");

      console.log("Agent roles query result:", { agentRoles, rolesError });

      if (rolesError) throw rolesError;

      if (!agentRoles || agentRoles.length === 0) {
        console.log("No agent roles found");
        return { agentsWithAssignments: [], missingProfileIds: [] };
      }

      const agentUserIds = agentRoles.map((role) => role.user_id);
      console.log("Agent user IDs:", agentUserIds);

      // Get agent profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone")
        .in("id", agentUserIds);

      console.log("Agent profiles query result:", { profiles, profilesError });

      if (profilesError) throw profilesError;

      // Check for missing profiles
      const profileUserIds = (profiles || []).map((p) => p.id);
      const missingProfileIds = agentUserIds.filter(
        (id) => !profileUserIds.includes(id)
      );

      if (missingProfileIds.length > 0) {
        console.log(
          "Found agent user IDs without profiles:",
          missingProfileIds
        );
      }

      // Get agent assignments with hospital details
      const { data: assignments, error: assignmentsError } = await supabase
        .from("agent_hospital_assignments")
        .select(
          `
          id,
          user_id,
          hospital_id,
          is_active,
          created_at,
          hospitals (
            name,
            address
          )
        `
        )
        .in("user_id", agentUserIds)
        .eq("is_active", true);

      console.log("Assignments query result:", {
        assignments,
        assignmentsError,
      });

      if (assignmentsError) throw assignmentsError;

      // Combine the data
      const agentsWithAssignments: AgentWithAssignments[] = [];

      for (const profile of profiles || []) {
        const agentAssignments = (assignments || [])
          .filter((assignment) => assignment.user_id === profile.id)
          .map((assignment) => ({
            id: assignment.id,
            hospital_id: assignment.hospital_id,
            is_active: assignment.is_active,
            created_at: assignment.created_at,
            hospital_name: assignment.hospitals?.name || "Unknown Hospital",
            hospital_address: assignment.hospitals?.address || "No address",
          }));

        if (agentAssignments.length > 0) {
          agentsWithAssignments.push({
            user_id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone,
            assignments: agentAssignments,
          });
        }
      }

      console.log("Final agents with assignments:", agentsWithAssignments);

      return { agentsWithAssignments, missingProfileIds };
    },
  });

  // Fetch agents without assignments
  const { data: unassignedAgents = [], refetch: refetchUnassigned } = useQuery({
    queryKey: ["unassigned-agents"],
    queryFn: async () => {
      console.log("Fetching unassigned agents...");

      // Get all agent user IDs
      const { data: agentRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "agent");

      console.log("Unassigned agents - roles query:", {
        agentRoles,
        rolesError,
      });

      if (rolesError) throw rolesError;

      if (!agentRoles || agentRoles.length === 0) {
        console.log("No agent roles found for unassigned");
        return [];
      }

      const agentUserIds = agentRoles.map((role) => role.user_id);

      // Get agent profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone")
        .in("id", agentUserIds);

      console.log("Unassigned agents - profiles query:", {
        profiles,
        profilesError,
      });

      if (profilesError) throw profilesError;

      // Get agents with active assignments
      const { data: assignedAgents, error: assignedError } = await supabase
        .from("agent_hospital_assignments")
        .select("user_id")
        .eq("is_active", true);

      console.log("Unassigned agents - assigned query:", {
        assignedAgents,
        assignedError,
      });

      if (assignedError) throw assignedError;

      const assignedUserIds = new Set(
        (assignedAgents || []).map((a) => a.user_id)
      );

      const unassigned = (profiles || [])
        .filter((profile) => !assignedUserIds.has(profile.id))
        .map((profile) => ({
          user_id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
        })) as AgentProfile[];

      console.log("Final unassigned agents:", unassigned);
      return unassigned;
    },
  });

  const handleRefresh = () => {
    refetchAssignments();
    refetchUnassigned();
  };

  const handleCreateMissingProfiles = () => {
    if (agentAssignments.missingProfileIds.length > 0) {
      createMissingProfilesMutation.mutate(agentAssignments.missingProfileIds);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading agent assignments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 text-red-600 mr-2" />
              Hospital Management
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline" size="sm">
                Refresh
              </Button>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Hospital
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Missing Profiles Alert */}
            {agentAssignments.missingProfileIds.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Missing Agent Profiles Detected
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      {agentAssignments.missingProfileIds.length} agent user(s)
                      don't have complete profiles. This may prevent them from
                      being assigned to hospitals.
                    </p>
                    <Button
                      onClick={handleCreateMissingProfiles}
                      disabled={createMissingProfilesMutation.isPending}
                      className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white"
                      size="sm"
                    >
                      {createMissingProfilesMutation.isPending
                        ? "Creating..."
                        : "Create Missing Profiles"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Assigned Agents */}
            {agentAssignments.agentsWithAssignments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Assigned Hospitals (
                  {agentAssignments.agentsWithAssignments.length})
                </h3>
                <div className="grid gap-4">
                  {agentAssignments.agentsWithAssignments.map(
                    (assignment: AgentWithAssignments) => (
                      <div
                        key={assignment.user_id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {assignment.first_name} {assignment.last_name}
                            </h4>
                            {assignment.phone && (
                              <p className="text-sm text-gray-600">
                                Phone: {assignment.phone}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-600"
                          >
                            Assigned
                          </Badge>
                        </div>

                        <div className="mt-3 space-y-2">
                          {assignment.assignments.map((hospitalAssignment) => (
                            <div
                              key={hospitalAssignment.id}
                              className="bg-gray-50 rounded p-3"
                            >
                              <div className="font-medium text-gray-900">
                                {hospitalAssignment.hospital_name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {hospitalAssignment.hospital_address}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Assigned on:{" "}
                                {new Date(
                                  hospitalAssignment.created_at
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Unassigned Agents */}
            {unassignedAgents.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-yellow-600">
                  Unassigned Agents ({unassignedAgents.length})
                </h3>
                <div className="grid gap-4">
                  {unassignedAgents.map((agent) => (
                    <div
                      key={agent.user_id}
                      className="border border-yellow-200 rounded-lg p-4 bg-yellow-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {agent.first_name} {agent.last_name}
                          </h4>
                          {agent.phone && (
                            <p className="text-sm text-gray-600">
                              Phone: {agent.phone}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-yellow-600 border-yellow-600"
                        >
                          Unassigned
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agentAssignments.agentsWithAssignments.length === 0 &&
              unassignedAgents.length === 0 &&
              agentAssignments.missingProfileIds.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No agents found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    No agent users found in the system. Make sure users have
                    been assigned the 'agent' role and have completed their
                    profiles.
                  </p>
                  <Button onClick={handleRefresh} variant="outline">
                    Try Refreshing
                  </Button>
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      <AgentAssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default HospitalManagement;
