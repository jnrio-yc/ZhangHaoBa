export const PROTECTION_INFO = {
  productName: '账号仓',
  developerId: '寂镜jnrio',
  developerSlug: 'jijing-jnrio',
  copyright: 'Copyright (c) 2026 寂镜jnrio. All rights reserved.',
  buildSignature: 'account-vault::jijing-jnrio::desktop-local-vault::2026',
} as const;

export function installProtectionGuards() {
  const guardedWindow = window as typeof window & {
    __ACCOUNT_VAULT_OWNER__?: typeof PROTECTION_INFO;
  };

  Object.defineProperty(guardedWindow, '__ACCOUNT_VAULT_OWNER__', {
    value: Object.freeze(PROTECTION_INFO),
    enumerable: false,
    configurable: false,
    writable: false,
  });

  document.documentElement.dataset.product = PROTECTION_INFO.productName;
  document.documentElement.dataset.owner = PROTECTION_INFO.developerSlug;

  const ownerMeta = document.createElement('meta');
  ownerMeta.name = 'application-owner';
  ownerMeta.content = `${PROTECTION_INFO.productName} / ${PROTECTION_INFO.developerId}`;
  document.head.appendChild(ownerMeta);

  const signatureMeta = document.createElement('meta');
  signatureMeta.name = 'build-signature';
  signatureMeta.content = PROTECTION_INFO.buildSignature;
  document.head.appendChild(signatureMeta);

  if (import.meta.env.PROD) {
    const blockDebugShortcut = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const debugCombo =
        key === 'f12' ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        ((event.ctrlKey || event.metaKey) && key === 'u');

      if (debugCombo) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('keydown', blockDebugShortcut, true);
    window.addEventListener('contextmenu', (event) => event.preventDefault(), true);

    console.info(
      `%c${PROTECTION_INFO.productName}`,
      'font-weight:700;color:#10213B',
      `is authored by ${PROTECTION_INFO.developerId}.`,
    );
  }
}
