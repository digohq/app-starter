import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2, Rocket, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';

export const metadata: Metadata = {
  title: 'Get started · App Starter',
  description: 'Create an account, set up an organization, and invite your team.',
};

/**
 * Public onboarding page for visitors who have not signed up yet.
 *
 * Boilerplate on purpose: it is the first screen worth rewriting for a real
 * product, so it says what the starter actually does rather than standing in
 * for a marketing page that does not exist yet.
 */
const STEPS = [
  {
    icon: UserPlus,
    title: 'Create your account',
    description:
      'Sign up with an email and password, a one-time code, or Google. Verification email included.',
  },
  {
    icon: Building2,
    title: 'Set up an organization',
    description:
      'An organization is the tenant. Everything you build is scoped to one, and you can belong to several.',
  },
  {
    icon: Users,
    title: 'Invite your team',
    description:
      'Send invite links and assign each member a role — owner, admin, or member — from the members screen.',
  },
] as const;

const GetStartedPage = () => (
  <div className="mx-auto max-w-4xl px-4 py-12">
    <PageHeader
      title={
        <>
          <Rocket className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
          Get started
        </>
      }
      description="Three steps from a fresh account to a working workspace."
    />

    <ol className="grid gap-4 sm:grid-cols-3">
      {STEPS.map((step, index) => (
        <li key={step.title}>
          <Card className="h-full">
            <CardHeader className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <step.icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <CardTitle className="text-lg">
                <span className="text-muted-foreground">{index + 1}. </span>
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{step.description}</CardDescription>
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>

    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Ready when you are</CardTitle>
        <CardDescription>
          Creating an account takes a moment and nothing is charged — billing is not part of this
          starter.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/login?tab=signup">
            Create your account
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">I already have an account</Link>
        </Button>
      </CardContent>
    </Card>
  </div>
);

export default GetStartedPage;
