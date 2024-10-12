import React from 'react';
import { Settings, LogOut } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import UserIcon from '@components/atoms/UserIcon';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@components/ui/dropdown-menu';

interface UserDropdownProps {
  photoURL?: string | null;
  displayName: string | null;
  email: string | null;
  handleAuthRedirect: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({
  photoURL,
  displayName,
  email,
}) => {
  const router = useRouter();
  const auth = getAuth();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex cursor-pointer items-center space-x-2">
          <UserIcon photoURL={photoURL} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-full">
        <DropdownMenuItem>
          <div className="text-gray-700">{displayName}</div>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <div className="text-gray-700">{email}</div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="mr-2 h-5 w-5" /> User Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-5 w-5" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
