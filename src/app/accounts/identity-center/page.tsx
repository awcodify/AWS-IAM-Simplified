'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import PageLayout from '@/components/PageLayout';

export default function IdentityCenterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/accounts/management');
  }, [router]);

  return (
    <PageLayout>
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to Management Account page...</p>
        </div>
      </div>
    </PageLayout>
  );
}
