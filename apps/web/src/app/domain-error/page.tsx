import React from 'react';
import Link from 'next/link';

export default async function DomainErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; reason?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const domain = resolvedSearchParams.domain || 'This domain';
  const reason = resolvedSearchParams.reason;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-600 mb-4">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Domain Not Active</h1>
          <p className="text-gray-600">
            {reason === 'not_found'
              ? `The domain "${domain}" is not currently associated with any organization on App Starter.`
              : `We couldn't verify the configuration for "${domain}".`}
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            If you are the administrator of this domain, please check your App Starter dashboard
            settings and DNS configuration.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Go to App Starter Dashboard
            </Link>
            <Link
              href="mailto:support@example.com"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
