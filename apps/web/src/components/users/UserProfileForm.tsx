import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Loader2, Save } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { TimezonePicker } from '@/components/ui/timezone-picker';
import { UpdateUserProfileRequest, UserProfileResponse } from '@/lib/users-api';
import { richTextField } from '@/lib/schemas/rich-text-field';
import { FULL_BIO_MAX_LENGTH } from '@app-starter/shared';

const userProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(100, 'Username must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Username can only contain lowercase letters, numbers, and hyphens'),
  bio: richTextField(FULL_BIO_MAX_LENGTH, 'Bio'),
  timezone: z.string().max(100).optional().or(z.literal('')),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;

interface UserProfileFormProps {
  user: UserProfileResponse;
  onUpdate: (data: UpdateUserProfileRequest) => Promise<void>;
  isSaving: boolean;
}

/** Maximum avatar upload, matched to the API's multipart limit. */
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function UserProfileForm({ user, onUpdate, isSaving }: UserProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatarUrl);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const form = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema) as any,
    defaultValues: {
      name: user.name || '',
      username: user.username || '',
      bio: user.bio || '',
      timezone: user.timezone || '',
    },
  });

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Image must be 5 MB or smaller');
      return;
    }

    setAvatarError(null);
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const onSubmit = async (data: UserProfileFormData) => {
    await onUpdate({
      name: data.name,
      username: data.username,
      bio: data.bio || undefined,
      timezone: data.timezone || undefined,
      avatarFile,
    });
    setAvatarFile(undefined);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)}>
        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>
              This is what other people see on your public profile page.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <button
                type="button"
                className="relative rounded-full"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload a new avatar"
              >
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={previewUrl || undefined}
                    alt={user.name || 'Avatar'}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 rounded-full bg-background border p-1.5">
                  <Camera className="h-4 w-4" />
                </span>
              </button>

              <div className="text-sm text-muted-foreground">
                <p>Click the avatar to upload a new photo.</p>
                <p>PNG or JPG, up to 5 MB.</p>
                {avatarError && <p className="text-destructive mt-1">{avatarError}</p>}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <FormField
              control={form.control as any}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Ada Lovelace" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="ada" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your public profile lives at /users/{field.value || 'username'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="A short introduction…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <TimezonePicker value={field.value || ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save changes
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
