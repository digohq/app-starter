import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

export default function CookiesPage() {
  return (
    <PageContainer>
      <PageHeader title="Cookie Policy" description="Last updated: May 4, 2026" />
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <p>
          This policy explains how App Starter uses cookies and similar technologies to recognize
          you when you visit our website.
        </p>
        <h2>What are cookies?</h2>
        <p>
          Cookies are small data files that are placed on your computer or mobile device when you
          visit a website.
        </p>
        <h2>Why do we use cookies?</h2>
        <p>
          We use first-party and third-party cookies for several reasons. Some cookies are required
          for technical reasons in order for our website to operate. Other cookies enable us to
          track and target the interests of our users to enhance the experience on our platform.
        </p>
        <h2>Types of cookies we use</h2>
        <ul>
          <li>
            <strong>Essential Cookies:</strong> Required for authentication, security, and basic
            functionality.
          </li>
          <li>
            <strong>Analytics Cookies:</strong> Help us understand how you use our platform.
          </li>
        </ul>
        <h2>How can I control cookies?</h2>
        <p>
          You can manage your cookie preferences at any time by clicking on "Cookie Settings" in our
          footer.
        </p>
      </div>
    </PageContainer>
  );
}
