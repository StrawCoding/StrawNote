import { AppUpdatePrompt } from '@affine/core/mobile/app-update';
import { App as CapacitorApp } from '@capacitor/app';
import { useEffect, useState } from 'react';

/**
 * Reads Capacitor native versionName and mounts the shared update prompt.
 */
export function AndroidAppUpdatePrompt() {
  const [nativeVersion, setNativeVersion] = useState<string | undefined>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    CapacitorApp.getInfo()
      .then(info => {
        if (cancelled) return;
        setNativeVersion(info.version);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return <AppUpdatePrompt nativeVersion={nativeVersion} enabled />;
}
