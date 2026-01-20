import { createSignal, createRoot, onMount, onCleanup } from 'solid-js';

// Global singleton store for PWA state
const createPWAStore = () => {
  const [deferredPrompt, setDeferredPrompt] = createSignal<any>(null);
  const [showPrompt, setShowPrompt] = createSignal(false);
  const [isStandalone, setIsStandalone] = createSignal(false);
  const [isIOS, setIsIOS] = createSignal(false);

  const handleBeforeinstallprompt = (e) => {
    e.preventDefault();
    setDeferredPrompt(e);
    // Only auto-show if not already installed
    if (!isStandalone()) {
      setShowPrompt(true);
    }
  };

  const handleAppinstalled = () => {
    setDeferredPrompt(null);
    setShowPrompt(false);
    setIsStandalone(true);
  };

  onMount(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Detect standalone mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    setIsStandalone(isStandaloneMode);

    // If not installed and on iOS, show prompt after delay
    if (!isStandaloneMode && isIosDevice) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeinstallprompt);
    window.addEventListener('appinstalled', handleAppinstalled);
  });

  onCleanup(() => {
    window.removeEventListener(
      'beforeinstallprompt',
      handleBeforeinstallprompt,
    );
    window.removeEventListener('appinstalled', handleAppinstalled);
  });

  const install = async () => {
    const prompt = deferredPrompt();
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    }
  };

  const openPrompt = () => setShowPrompt(true);
  const closePrompt = () => setShowPrompt(false);

  return {
    deferredPrompt,
    showPrompt,
    isStandalone,
    isIOS,
    install,
    openPrompt,
    closePrompt,
  };
};

export const pwaStore = createRoot(createPWAStore);
