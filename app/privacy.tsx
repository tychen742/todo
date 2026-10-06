import { LegalDocument } from '../features/legal/LegalDocument';
import { privacyPolicyMarkdown } from '../features/legal/legalContent.generated';

export default function PrivacyScreen() {
  return <LegalDocument markdown={privacyPolicyMarkdown} />;
}
