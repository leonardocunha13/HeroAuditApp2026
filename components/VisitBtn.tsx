"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "./ui/button";
import { View, Heading, Text, Alert, Flex, TextField } from "@aws-amplify/ui-react";
import { GetProjectsFromShareURL, runForm } from "../actions/form";
import { useRouter } from "next/navigation";
import { fetchAuthSession } from "aws-amplify/auth";
import { useTheme } from "next-themes";
import { toast } from "./ui/use-toast";
import { ConfirmDialog } from "./ConfirmDialog";

function VisitBtn({ shareUrl }: { shareUrl: string }) {
  const [mounted, setMounted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error] = useState<string | null>(null);
  const [success] = useState<string | null>(null);
  const [docNumber, setDocNumber] = useState("");
  const [equipmentTag, setEquipTag] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [userGroup, setUserGroup] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const { theme } = useTheme();
  const [showConfirm, setShowConfirm] = useState(false);
  const [retryRun, setRetryRun] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!isDialogOpen || !shareUrl) return;

    async function fetchProjects() {
      try {
        const { projectList } = await GetProjectsFromShareURL(shareUrl);

        const sortedProjects = projectList
          .filter((proj) => proj.projectCode !== null)
          .sort((a, b) => (b.projectCode as string).localeCompare(a.projectCode as string))
          .map((proj) => ({
            id: proj.projectCode as string,
            name: `${proj.name} (${proj.projectCode})`,
          }));

        setProjects(sortedProjects);
      } catch (err) {
        console.error("Erro ao buscar projetos:", err);
        setProjects([]);
      }
    }

    fetchProjects();
  }, [isDialogOpen, shareUrl]);


  useEffect(() => {
    const run = async () => {
      if (retryRun) {
        const retry = await runForm(shareUrl, equipmentTag, docNumber, selectedProjectId, true);
        if (retry.success && retry.createdTagID && retry.createdFormTagID) {
          toast({
            title: "New revision created",
            description: "Same doc number found. A new revision was generated.",
          });
          localStorage.setItem("tagId", retry.createdTagID);
          localStorage.setItem("formtagId", retry.createdFormTagID);
          router.push(`${window.location.origin}${shareUrl}`);
        } else {
          toast({ title: "Failed to create form revision", variant: "destructive" });
        }
        setRetryRun(false);
      }
    };

    run();
  }, [retryRun, shareUrl, equipmentTag, docNumber, selectedProjectId, router]);


  useEffect(() => {
    const fetchUserGroup = async () => {
      try {
        const session = await fetchAuthSession();
        const rawGroups = session.tokens?.accessToken.payload["cognito:groups"];
        if (Array.isArray(rawGroups) && typeof rawGroups[0] === "string") {
          setUserGroup(rawGroups[0]);
        } else {
          setUserGroup(null);
        }
      } catch (error) {
        console.error("Error fetching user group:", error);
        setUserGroup(null);
      }
    };
    fetchUserGroup();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setDocNumber(""); // reset state
    setEquipTag("");  // reset state
  };

  if (!mounted) {
    return null; // avoiding window not defined error
  }

  const handleRunForm = async () => {
    try {
      if (!selectedProjectId) {
        toast({
          title: "Please select a project",
          variant: "destructive",
        });
        return;
      }

      if (!docNumber.trim()) {
        toast({
          title: "Document number is required",
          variant: "destructive",
        });
        return;
      }

      if (!equipmentTag.trim()) {
        toast({
          title: "Equipment tag is required",
          variant: "destructive",
        });
        return;
      }
      setLoading(true);
      //console.log("Running form with params:", { shareUrl, equipmentTag, docNumber, selectedProjectId });
      const { success, createdTagID, revisionBumped, createdFormTagID } = await runForm(
        shareUrl,
        equipmentTag,
        docNumber,
        selectedProjectId,
        false // try first without forcing
      );
      //console.log("Returned param form runForm:", { success, createdTagID, revisionBumped, createdFormTagID });

      if (!success && revisionBumped) {
        setShowConfirm(true); // wait for user to confirm
        return;
      }

      if (success && createdTagID && createdFormTagID) {
        localStorage.setItem("tagId", createdTagID);
        localStorage.setItem("formtagId", createdFormTagID);
        router.push(`${window.location.origin}${shareUrl}`);
        return;
      }

      toast({
        title: "Check the document number and equipment tag.",
        variant: "destructive",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to update form",
        variant: "destructive",
      });
    } finally {
      setLoading(false); // stop loading
    }
  };

  return (
    <>
      <ConfirmDialog
        open={showConfirm}
        title="This document number is already being used. Create a new revision?"
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          setRetryRun(true);
        }}
      />
      {userGroup !== "viewer" && (
        <Button
          className="w-[140px] md:w-[200px] text-sm md:text-md font-medium"
          onClick={() => setIsDialogOpen(true)}
          title="Update the form for a specific equipment TAG"
        >
          Update Form
        </Button>

      )}
      {isDialogOpen && (
        <View
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          backgroundColor="rgba(0,0,0,0.5)"
          display="flex"
          style={{ alignItems: "center", justifyContent: "center", zIndex: 50 }}
        >
          <View
            ref={dialogRef}
            padding="2rem"
            borderRadius="medium"
            width="90%"
            maxWidth="600px"
            boxShadow="0 4px 12px rgba(0,0,0,0.2)"
            className="bg-white text-black dark:bg-neutral-900 dark:text-white"
          >
            <Flex
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              marginBottom="1rem"
            >
              <Heading className="text-foreground mb-1" level={3}>Update Details</Heading>
              <Button className="link-button" onClick={handleDialogClose}>
                ✕
              </Button>
            </Flex>

            <Text className="mb-1 text-foreground" marginBottom="1rem">Select the project, inform the document number and equipment tag to update the form.</Text>

            {error && (
              <Alert variation="error" isDismissible>
                {error}
              </Alert>
            )}
            {success && (
              <Alert variation="success" isDismissible>
                {success}
              </Alert>
            )}
            <label className="block mb-1 text-md font-medium">
              Select the project:
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className={`
                w-full p-2 rounded border 
                ${theme === "dark" ? "bg-gray-800 text-white border-gray-600" : "bg-white text-black border-gray-300"}
                max-h-48 overflow-y-auto
              `}
            >
              <option value="">Select the project</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}

            </select>
            <label className="pt-1 block text-md font-medium">
              Document Number:
            </label>
            <TextField
              label=""
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="Enter the document number"
              row={4}
              className="pt-1 block text-md font-medium"
              inputStyles={{
                color: theme === "dark" ? "white" : "black",
                backgroundColor: theme === "dark" ? "#1f2937" : "white",
              }}
            />
            <label className="pt-1 block text-md font-medium">
              Equipment Tag:
            </label>
            <TextField
              label=""
              value={equipmentTag}
              onChange={(e) => setEquipTag(e.target.value)}
              placeholder="Enter Equipment Tag"
              row={4}
              className="pt-1 block text-md font-medium"
              inputStyles={{
                color: theme === "dark" ? "white" : "black",
                backgroundColor: theme === "dark" ? "#1f2937" : "white",
              }}
            />

            <Flex justifyContent="flex-end" marginTop="1rem">
              <Button
                className="w-[200px]"
                onClick={handleRunForm}
                disabled={loading} // disables the button while loading
              >
                {loading ? "Generating..." : "Update"}  {/* toggle text */}
              </Button>
            </Flex>
          </View>
        </View>
      )}
    </>
  );
}

export default VisitBtn;
