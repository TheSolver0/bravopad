import { Link } from '@inertiajs/react';

interface UserLinkProps {
  userId: number;
  children: React.ReactNode;
  className?: string;
}

export function UserLink({ userId, children, className }: UserLinkProps) {
  return (
    <Link
      href={`/users/${userId}`}
      className={`hover:underline cursor-pointer ${className ?? ''}`}
    >
      {children}
    </Link>
  );
}
