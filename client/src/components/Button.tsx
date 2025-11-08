import type { ReactNode } from "react";

type ButtonProps = {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
};

export default function Button({
  icon,
  children,
  onClick,
  className = "",
  disabled = false,
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`bg-gray-800 text-white rounded-full px-4 py-3 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ${className}`}
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}

