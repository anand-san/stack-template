import { EMAIL_SENT_IMAGE } from '@/utils/constants/imagePaths';

interface EmailSentProps {
  email: string;
  onBack: () => void;
}

export default function EmailSent({ email, onBack }: EmailSentProps) {
  return (
    <div className="w-full max-w-md space-y-8 rounded-xl p-4 py-8 md:p-6 md:py-8 text-center">
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">
          We have sent you a login link!
        </h2>
        <p className="text-gray-500">
          Check your email address and follow the instructions
        </p>
        <div className="flex justify-center">
          <img src={EMAIL_SENT_IMAGE} alt="Email sent" className="h-36 w-30" />
        </div>
        <div className="mt-8">
          <p className="text-sm text-gray-500">
            We have sent an email to{' '}
            <span className="font-medium">{email}</span> to confirm the validity
            of your email address. After receiving the email follow the link
            provided to complete your login.
          </p>
          <button
            onClick={onBack}
            className="mt-4 text-sm text-blue-500 hover:underline"
          >
            Use a different email address
          </button>
        </div>
      </div>
    </div>
  );
}
