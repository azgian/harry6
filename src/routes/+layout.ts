import { auth } from '$lib/firebase';
import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
// import type { User } from 'firebase/auth';

export interface LayoutData {
  user: {
    uid: string;
    email: string | null;
  } | null;
}

export const load: LayoutLoad<LayoutData> = async ({ url }) => {
  // 로그인이 필요한 경로들
  const protectedPaths = ['/market', '/exchange', '/office', '/adm'];
  
  // 현재 사용자 상태 확인
  const currentUser = auth.currentUser;

  // 로그인하지 않은 상태에서 보호된 경로 접근 시
  if (!currentUser && protectedPaths.some(path => url.pathname.startsWith(path))) {
    throw redirect(302, '/');
  }

  // 로그인한 상태에서 루트 페이지 접근 시
  if (currentUser && url.pathname === '/') {
    throw redirect(302, '/market');
  }

  return {
    user: currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email
    } : null
  };
};