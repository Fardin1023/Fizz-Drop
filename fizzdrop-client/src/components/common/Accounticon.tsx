import React from 'react';
import { User } from 'lucide-react';

interface AccountIconProps {
  href?: string;
}

const AccountIcon: React.FC<AccountIconProps> = ({ href = '/account' }) => {
  return (
    <a
      href={href}
      className="p-2 rounded-xl text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-all duration-200 inline-flex items-center justify-center group active:scale-95"
      aria-label="User Account"
    >
      <User className="w-5 h-5 transition-transform group-hover:rotate-6 duration-150" />
    </a>
  );
};

export default AccountIcon;