import React, { useState } from 'react';
import { DomainMappingResponse, domainMappingsApi } from '@/lib/domain-mappings-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  Save,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { DnsConfigurationInstructions } from './DnsConfigurationInstructions';

interface DomainMappingListProps {
  organizationId: string;
  mappings: DomainMappingResponse[];
  onRefresh: () => void;
}

export function DomainMappingList({ organizationId, mappings, onRefresh }: DomainMappingListProps) {
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingBrandingId, setEditingBrandingId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [faviconUrl, setFaviconUrl] = useState<string>('');
  const [logoHeight, setLogoHeight] = useState<string>('');
  const [isUpdatingBranding, setIsUpdatingBranding] = useState(false);

  const handleVerify = async (mappingId: string) => {
    setVerifyingId(mappingId);
    try {
      const result = await domainMappingsApi.verify(organizationId, mappingId);
      if (result.verificationStatus === 'VERIFIED') {
        toast.success('Domain verified successfully!');
      } else {
        toast.error('Verification failed. Please check your DNS records.');
      }
      onRefresh();
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Verification failed');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this domain mapping?')) return;

    setDeletingId(mappingId);
    try {
      await domainMappingsApi.delete(organizationId, mappingId);
      toast.success('Domain mapping deleted');
      onRefresh();
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to delete domain mapping');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartEditBranding = (mapping: DomainMappingResponse) => {
    setEditingBrandingId(mapping.id);
    setLogoUrl(mapping.customLogoUrl || '');
    setFaviconUrl(mapping.customFaviconUrl || '');
    setLogoHeight(mapping.logoHeight ? mapping.logoHeight.toString() : '');
  };

  const handleSaveBranding = async (mappingId: string) => {
    setIsUpdatingBranding(true);
    try {
      await domainMappingsApi.update(organizationId, mappingId, {
        customLogoUrl: logoUrl.trim() || null,
        customFaviconUrl: faviconUrl.trim() || null,
        logoHeight: logoHeight ? parseInt(logoHeight, 10) : null,
      });
      toast.success('Branding settings updated');
      setEditingBrandingId(null);
      onRefresh();
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to update branding settings');
    } finally {
      setIsUpdatingBranding(false);
    }
  };

  const handleRemoveBranding = async (mappingId: string) => {
    if (!confirm('Are you sure you want to remove all custom branding?')) return;

    setIsUpdatingBranding(true);
    try {
      await domainMappingsApi.update(organizationId, mappingId, {
        customLogoUrl: null,
        customFaviconUrl: null,
        logoHeight: null,
      });
      toast.success('Branding removed');
      setEditingBrandingId(null);
      onRefresh();
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to remove branding');
    } finally {
      setIsUpdatingBranding(false);
    }
  };

  if (mappings.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
        <p className="text-slate-500">No custom domains added yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mappings.map((mapping) => (
        <div
          key={mapping.id}
          className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950 shadow-sm"
        >
          <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-grow">
                <h3 className="font-semibold text-lg">{mapping.domain}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(mapping.verificationStatus)}
                  <span className="text-xs text-slate-500">
                    Added on {new Date(mapping.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {mapping.verificationStatus === 'VERIFIED' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-slate-500 hover:text-indigo-600"
                  onClick={() => handleStartEditBranding(mapping)}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Branding
                </Button>
              )}

              {mapping.verificationStatus !== 'VERIFIED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerify(mapping.id)}
                  disabled={verifyingId === mapping.id}
                >
                  {verifyingId === mapping.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Verify
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="text-slate-500 hover:text-indigo-600"
                onClick={() => setExpandedId(expandedId === mapping.id ? null : mapping.id)}
              >
                {expandedId === mapping.id ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Hide Setup
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Setup Instructions
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="text-slate-500 hover:text-red-600"
                onClick={() => handleDelete(mapping.id)}
                disabled={deletingId === mapping.id}
              >
                {deletingId === mapping.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {editingBrandingId === mapping.id && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-4 sm:p-6 bg-indigo-50/30 dark:bg-indigo-950/10">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                    <ImageIcon className="h-4 w-4" />
                    Custom Branding Settings
                  </h4>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-400 hover:text-slate-600"
                    onClick={() => setEditingBrandingId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Customize the look and feel of pages served via your custom domain.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
                        Logo URL (PNG, JPG, or SVG)
                      </label>
                      <Input
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://yourcompany.com/logo.png"
                        className="bg-white dark:bg-slate-950"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Recommended: Horizontal orientation, transparent background.
                      </p>
                    </div>

                    {logoUrl && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                          Logo Preview
                        </p>
                        <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center min-h-[80px] relative overflow-hidden">
                          <img
                            src={logoUrl}
                            alt="Custom Logo Preview"
                            className="max-h-12 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://via.placeholder.com/200x60?text=Invalid+Logo+URL';
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
                        Logo Height (px)
                      </label>
                      <Input
                        type="number"
                        value={logoHeight}
                        onChange={(e) => setLogoHeight(e.target.value)}
                        placeholder="e.g. 40"
                        className="bg-white dark:bg-slate-950"
                        min="16"
                        max="100"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Optional. Custom height for the logo (recommended: 30-60 pixels).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
                        Favicon URL (ICO, PNG, or SVG)
                      </label>
                      <Input
                        value={faviconUrl}
                        onChange={(e) => setFaviconUrl(e.target.value)}
                        placeholder="https://yourcompany.com/favicon.ico"
                        className="bg-white dark:bg-slate-950"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Recommended: Square 32x32px or 64x64px.
                      </p>
                    </div>

                    {faviconUrl && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                          Favicon Preview
                        </p>
                        <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center min-h-[80px] relative overflow-hidden">
                          <div className="flex flex-col items-center gap-2">
                            <img
                              src={faviconUrl}
                              alt="Custom Favicon Preview"
                              className="w-8 h-8 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://via.placeholder.com/32x32?text=!';
                              }}
                            />
                            <span className="text-[10px] text-slate-400 font-mono">
                              32x32 preview
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  {(mapping.customLogoUrl || mapping.customFaviconUrl) && (
                    <Button
                      variant="outline"
                      onClick={() => handleRemoveBranding(mapping.id)}
                      disabled={isUpdatingBranding}
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      Remove All Branding
                    </Button>
                  )}
                  <Button
                    onClick={() => handleSaveBranding(mapping.id)}
                    disabled={isUpdatingBranding}
                    className="bg-indigo-600 hover:bg-indigo-700 min-w-[100px]"
                  >
                    {isUpdatingBranding ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {expandedId === mapping.id && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50">
              <DnsConfigurationInstructions
                domain={mapping.domain}
                verificationToken={mapping.verificationToken}
              />

              {mapping.errorMessage && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-400">
                      Last verification error
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-500 mt-1">
                      {mapping.errorMessage}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          Verified
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400">
          <AlertCircle className="h-3 w-3" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
  }
}
