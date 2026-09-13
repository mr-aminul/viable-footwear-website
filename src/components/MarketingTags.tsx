import Script from 'next/script'
import type { PublicMarketingConfig } from '@/lib/integrations/marketing-settings'

export function MarketingTags({ config }: { config: PublicMarketingConfig }) {
  const gtmId = config.gtm.containerId
  const pixelId = config.meta.pixelId

  return (
    <>
      {config.gtm.enabled && gtmId ? (
        <>
          <Script id="gtm-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
          `}</Script>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtmId)}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
              title="Google Tag Manager"
            />
          </noscript>
        </>
      ) : null}

      {config.meta.injectDirect && pixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', ${JSON.stringify(pixelId)});
          fbq('track', 'PageView');
        `}</Script>
      ) : null}
    </>
  )
}
