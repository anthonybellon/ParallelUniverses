import React from 'react';
import Image from 'next/image';
import { UserIcon as UserIconUI } from 'lucide-react';

interface UserIconProps {
  photoURL?: string | null;
}

const UserIcon: React.FC<UserIconProps> = ({ photoURL }) => {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-300 bg-gray-100">
      {photoURL ? (
        <Image
          src={photoURL}
          alt="User Avatar"
          width={40}
          height={40}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <UserIconUI className="h-6 w-6 text-gray-500" />
      )}
    </div>
  );
};

export default UserIcon;
