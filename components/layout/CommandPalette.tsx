"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Users,
  Briefcase,
  FileText
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem onSelect={() => runCommand(() => router.push("/employees?action=new"))}>
              <User className="mr-2 h-4 w-4" />
              <span>Add New Employee</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/leave"))}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Approve Leaves</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/payroll"))}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Process Payroll</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Modules">
            <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
              <Briefcase className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
              <CommandShortcut>⌘D</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/employees"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Directory</span>
              <CommandShortcut>⌘E</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/reimbursements"))}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Reimbursements</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
