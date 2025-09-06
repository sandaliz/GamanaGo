'use client';
import dynamic from 'next/dynamic';

const RealtimeMap = dynamic(() => import('../../components/RealtimeMap'), { ssr: false });

export default function RealtimeMapClient() {
  return <RealtimeMap />;
}
