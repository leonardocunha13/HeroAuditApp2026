"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ImShare } from "react-icons/im";
import { toast } from "./ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { X } from "lucide-react";

type User = { email: string; name: string };

function FormLinkShare({ shareUrl }: { shareUrl: string }) {
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/list-users");
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    fetchUsers();
  }, []);

  if (!mounted) return null;

  const value = `${window.location.origin}${shareUrl.replace("/submit/", "/forms/")}`;

  const handleAddUser = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !selectedUsers.includes(trimmed)) {
      setSelectedUsers([...selectedUsers, trimmed]);
      setInputValue("");
    }
  };

  const handleRemoveUser = (email: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u !== email));
  };

  const LAMBDA_URL =
  "https://p3bobv2zxft32b7wxdse5ma33u0vduup.lambda-url.ap-southeast-2.on.aws/";

const handleShare = async () => {
  try {
    if (!selectedUsers.length) {
      toast({
        title: "Select at least one user",
        variant: "destructive",
      });
      return;
    }

    const res = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toEmails: selectedUsers, // array of emails
        subject: "Form Shared with You",
        body: `<p>Hello,</p>
               <p>Please find the link to access all of the reports: 
               <a href="${window.location.origin}${shareUrl.replace(
                 "/submit/",
                 "/forms/"
               )}">View Reports</a></p>
               <p>Best regards,<br/>Hero Engineering Team</p>`,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Failed to send email");
    }

    toast({
      title: "Link shared!",
      description: `Shared with: ${selectedUsers.join(", ")}`,
    });

    // Reset state
    setOpen(false);
    setSelectedUsers([]);
    setInputValue("");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email";

    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    });

    console.error("Send email error:", err);
  }
};


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-[140px] md:w-[200px] text-sm md:text-md mt-2 gap-2 ">
          <ImShare className="mr-2 h-4 w-4" />
          Share link
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[700px] bg-white dark:bg-neutral-900 text-black dark:text-white opacity-100 shadow-xl">
        <DialogHeader>
          <DialogTitle>Share this form</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Add people</Label>
            <div className="flex gap-2">
              <Input
                list="user-suggestions"
                placeholder="Enter email or name"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUser();
                  }
                }}
              />
              <Button onClick={handleAddUser} disabled={!inputValue.trim()}>
                Add
              </Button>
            </div>
            <datalist id="user-suggestions">
              {users.map((user) => (
                <option key={user.email} value={user.email}>
                  {user.name}
                </option>
              ))}
            </datalist>
          </div>

          {selectedUsers.length > 0 && (
            <div>
              <Label>Selected:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedUsers.map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-neutral-200 dark:bg-neutral-800 text-sm"
                  >
                    {email}
                    <button onClick={() => handleRemoveUser(email)}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Form link</Label>
            <div className="flex gap-2 mt-1">
              <Input value={value} readOnly />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(value);
                  toast({
                    title: "Copied!",
                    description: "Link copied to clipboard",
                  });
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleShare} disabled={selectedUsers.length === 0} className="w-[250px] flex center">
            Share
          </Button>
        </DialogFooter>
        <DialogTitle className="sr-only">
          Form Link share dialog
        </DialogTitle>
        <DialogDescription className="sr-only">
          This dialog contains the share link.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

export default FormLinkShare;
