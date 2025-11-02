import React from 'react';
import { trpc } from '@/lib/trpc';

const UserInfo: React.FC = () => {
  const { data: user, isLoading, error } = trpc.auth.me.useQuery();

  if (isLoading) {
    return <div>Loading user info...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <h2>User Info (from auth.me)</h2>
      <p>Email: {user.email}</p>
      <p>Name: {user.name}</p>
      <p>UID: {user.uid}</p>
    </div>
  );
};

export default UserInfo;
