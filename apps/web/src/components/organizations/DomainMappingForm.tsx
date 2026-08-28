import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus } from 'lucide-react';
import { domainMappingsApi } from '@/lib/domain-mappings-api';
import { toast } from 'sonner';

interface DomainMappingFormProps {
  organizationId: string;
  onSuccess: () => void;
}

export function DomainMappingForm({ organizationId, onSuccess }: DomainMappingFormProps) {
  const [domain, setDomain] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!domain) return;

    // Basic validation
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
    if (!domainRegex.test(domain)) {
      toast.error('Invalid domain format. Hostname only, e.g., events.company.com');
      return;
    }

    setIsSubmitting(true);
    try {
      await domainMappingsApi.create(organizationId, domain.toLowerCase().trim());
      toast.success('Domain mapping added successfully');
      setDomain('');
      onSuccess();
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to add domain mapping');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-grow">
          <Input
            type="text"
            placeholder="e.g. events.company.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={isSubmitting}
            className="w-full"
          />
          <p className="mt-2 text-xs text-slate-500">
            Enter the subdomain and domain you want to use for your calendar.
          </p>
        </div>
        <Button type="submit" disabled={isSubmitting || !domain} className="h-10">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add Domain
        </Button>
      </div>
    </form>
  );
}
