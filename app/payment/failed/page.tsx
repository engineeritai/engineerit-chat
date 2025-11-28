export default function PaymentFailedPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold">
          Payment not completed
        </h1>
        <p className="text-sm text-gray-600">
          Your payment was cancelled or could not be processed.
        </p>
        <p className="text-sm text-gray-600">
          You can try again or choose another payment method.
        </p>
        <div className="mt-4 space-x-2">
          <a
            href="/subscription"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Back to subscriptions
          </a>
        </div>
      </div>
    </div>
  );
}
