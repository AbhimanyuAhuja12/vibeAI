import { Card } from "@/components/ui/card";
import { Fragment, MessageRole, MessageType } from "@/generated/prisma";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ChevronRightIcon, Code2Icon } from "lucide-react";
import Image from "next/image";
import { Chevron } from "react-day-picker";

interface FragmentCardProps {
  fragment: Fragment;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
}
const FragmentCard = ({
  fragment,
  isActiveFragment,
  onFragmentClick,
}: FragmentCardProps) => {
  return (
    <button
      className={cn(
        "flex items-start gap-2 border p-3 rounded-lg bg-muted w-fit hover:bg-secondard transition-colors",
        isActiveFragment &&
          "bg-primary text-primary-foreground border-primary hover:bg-primary"
      )}
      onClick={() => onFragmentClick(fragment)}
    >
      <Code2Icon className="size-4 mt-0.5"/>
      <div className="flex flex-col flex-1">
        <span className="text-sm font-medium line-clamp-1">{fragment.title}</span>
        <span className="text-sm">Preview</span>
      </div>
    <div className="flex items-center justify-center mt-0.5">
      <ChevronRightIcon className="size-4"/>
    </div>
    </button>
  );
};
interface MessageCardProps {
  role: MessageRole;
  fragment: Fragment | null;
  content: string;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
  type: MessageType;
  createdAt: Date;
}
interface UserMessageProps {
  content: string;
}

const UserMessage = ({ content }: UserMessageProps) => {
  return (
    <div className="flex justify-end pb-4 pr-2 pl-10">
      <Card className="rounded-lg bg-muted p-3 shadow-none border-none max-w-[80% break-words">
        {content}
      </Card>
    </div>
  );
};

interface AssistantMessageProps {
  content: string;
  fragment: Fragment | null;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
  type: MessageType;
  createdAt: Date;
}

export const AssistantMessage = ({
  content,
  fragment,
  isActiveFragment,
  onFragmentClick,
  type,
  createdAt,
}: AssistantMessageProps) => {
  return (
    <div
      className={cn(
        "flex flex-col group px-2 pb-4:",
        isActiveFragment ? "bg-primary/10" : "bg-muted/10",
        type === "RESULT" ? "cursor-pointer hover:bg-primary/20" : "",
        type === "ERROR" ? "bg-red-700" : ""
      )}
    >
      <div className="flex items-center gap-2 pl-2 mb-2">
        <Image
          src="/logo.svg"
          alt="Vibe"
          width={18}
          height={18}
          className="shrink-0"
        />
        <span className="text-sm font-medium">Vibe</span>
        <span className="text-sm text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {format(createdAt, "HH:mm 'on'  MMM dd, yyyy")}
        </span>
      </div>
      <div className="pl-8.5 flex flex-col gap-y-4">
        <span>{content}</span>
        {fragment && type === "RESULT" && (
          <FragmentCard
            fragment={fragment}
            isActiveFragment={isActiveFragment}
            onFragmentClick={onFragmentClick}
          />
        )}
      </div>
    </div>
  );
};

export const MessageCard = ({
  role,
  content,
  fragment,
  isActiveFragment,
  onFragmentClick,
  type,
  createdAt,
}: MessageCardProps) => {
  if (role == "ASSISTANT") {
    return (
      <AssistantMessage
        content={content}
        fragment={fragment}
        isActiveFragment={isActiveFragment}
        onFragmentClick={onFragmentClick}
        type={type}
        createdAt={createdAt}
      />
    );
  }

  return <UserMessage content={content} />;
};
