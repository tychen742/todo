import { LegalDocument } from '../features/legal/LegalDocument';
import { termsOfServiceMarkdown } from '../features/legal/legalContent.generated';

export default function TermsScreen() {
  return <LegalDocument markdown={termsOfServiceMarkdown} />;
}
