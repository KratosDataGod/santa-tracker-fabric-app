import { KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/auth.context';

const GIVE_UP_AFTER_MS = 30_000;
/**
 * A discreet sign-in for the people who run the app. Signing in switches from
 * the public view to the Fabric-backed one, where the season can be loaded.
 */
export function CrewSignIn() {
  const { canSignIn, signIn, isSigningIn, signInError } = useAuth();
  const [stalled, setStalled] = useState(false);

  // A blocked or abandoned sign-in window never reports back, so stop waiting.
  useEffect(() => {
    if (!isSigningIn) return;
    const timer = window.setTimeout(() => setStalled(true), GIVE_UP_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [isSigningIn]);

  if (!canSignIn) return null;
  const waiting = isSigningIn && !stalled;
  return (
    <div className="flex flex-col items-center gap-100">
      <button
        type="button"
        className="plaque inline-flex h-9 items-center gap-200 !rounded-full px-400 text-200 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60"
        disabled={waiting}
        onClick={() => {
          setStalled(false);
          void signIn();
        }}
      >
        <KeyRound aria-hidden className="h-3.5 w-3.5 text-gold" />
        {waiting ? 'Signing in…' : 'Crew sign-in'}
      </button>
      {stalled && isSigningIn && (
        <p role="status" className="text-200 text-snow">
          Sign-in didn&apos;t finish. Check for a blocked pop-up window, then try again.
        </p>
      )}
      {signInError && (
        <p role="alert" className="text-200 text-snow">
          {signInError.message}
        </p>
      )}
    </div>
  );
}
