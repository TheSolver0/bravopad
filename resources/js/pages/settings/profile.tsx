import { useRef, useState } from 'react';
import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import { Camera } from 'lucide-react';

function getAvatarUrl(name: string, avatar?: string | null): string {
    if (avatar && avatar.trim() !== '') return avatar;
    const initials = name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=6366f1&color=ffffff&size=128&bold=true&format=svg`;
}

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage().props as any;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setPreviewUrl(URL.createObjectURL(file));
        const formData = new FormData();
        formData.append('avatar', file);
        setUploading(true);
        router.post('/settings/avatar', formData, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setUploading(false),
        });
    }

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profile information"
                    description="Update your name, email address and profile picture"
                />

                {/* ── Section avatar ── */}
                <div className="flex items-center gap-5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="relative shrink-0">
                        <img
                            src={previewUrl ?? getAvatarUrl(auth.user.name, auth.user.avatar)}
                            alt={auth.user.name}
                            className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md"
                            referrerPolicy="no-referrer"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="absolute -bottom-2 -right-2 w-7 h-7 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 rounded-full flex items-center justify-center text-white shadow-md transition-colors cursor-pointer"
                        >
                            {uploading ? (
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Camera size={14} />
                            )}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-gray-800">{auth.user.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Cliquez sur l'icône <Camera size={11} className="inline" /> pour changer votre photo
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">JPG, PNG, GIF ou WEBP · max 2 Mo</p>
                    </div>
                </div>

                <Form
                    {...ProfileController.update.form()}
                    options={{ preserveScroll: true }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Full name"
                                />
                                <InputError className="mt-2" message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="Email address"
                                />
                                <InputError className="mt-2" message={errors.email} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="birth_date">Date de naissance</Label>
                                    <Input
                                        id="birth_date"
                                        type="date"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.birth_date ?? ''}
                                        name="birth_date"
                                    />
                                    <InputError className="mt-2" message={errors.birth_date} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="hire_date">Date d'entrée dans l'entreprise</Label>
                                    <Input
                                        id="hire_date"
                                        type="date"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.hire_date ?? ''}
                                        name="hire_date"
                                    />
                                    <InputError className="mt-2" message={errors.hire_date} />
                                </div>
                            </div>

                            {mustVerifyEmail && auth.user.email_verified_at === null && (
                                <div>
                                    <p className="-mt-4 text-sm text-muted-foreground">
                                        Your email address is unverified.{' '}
                                        <Link
                                            href={send()}
                                            as="button"
                                            className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                        >
                                            Click here to resend the verification email.
                                        </Link>
                                    </p>
                                    {status === 'verification-link-sent' && (
                                        <div className="mt-2 text-sm font-medium text-green-600">
                                            A new verification link has been sent to your email address.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-4">
                                <Button disabled={processing} data-test="update-profile-button">
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [{ title: 'Profile settings', href: edit() }],
};
