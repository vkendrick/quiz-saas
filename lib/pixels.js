'use client';

export function injetarPixels(integracoes = {}) {
  if (typeof document === 'undefined') return;

  if (integracoes.ga4 && !document.getElementById('ga4-script')) {
    const s = document.createElement('script');
    s.id = 'ga4-script'; s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${integracoes.ga4}`;
    document.head.appendChild(s);
    const inline = document.createElement('script');
    inline.innerHTML = `
      window.dataLayer=window.dataLayer||[];
      function gtag(){dataLayer.push(arguments);}
      window.gtag=gtag;
      gtag('js',new Date());
      gtag('config','${integracoes.ga4}',{send_page_view: !/[?&]preview=1/.test(location.search)});
    `;
    document.head.appendChild(inline);
  }

  if (integracoes.google_ads && !document.getElementById('gads-script')) {
    const s = document.createElement('script');
    s.id = 'gads-script'; s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${integracoes.google_ads}`;
    document.head.appendChild(s);
  }

  if (integracoes.gtm && !document.getElementById('gtm-script')) {
    const s = document.createElement('script');
    s.id = 'gtm-script';
    s.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${integracoes.gtm}');`;
    document.head.appendChild(s);
  }

  if (integracoes.meta_pixel && !window.fbq) {
    const inline = document.createElement('script');
    inline.innerHTML = `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${integracoes.meta_pixel}');
      if (!/[?&]preview=1/.test(location.search)) fbq('track', 'PageView');
    `;
    document.head.appendChild(inline);
  }

  if (integracoes.tiktok_pixel && !window.ttq) {
    const inline = document.createElement('script');
    inline.innerHTML = `
      !function (w, d, t) {w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
      ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
      ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
      for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
      ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
      ttq._o=ttq._o||{};ttq._o[e]=n||{};
      var o=document.createElement("script");o.type="text/javascript";o.async=!0;
      o.src=i+"?sdkid="+e+"&lib="+t;
      var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${integracoes.tiktok_pixel}');if(!/[?&]preview=1/.test(location.search))ttq.page();}(window, document, 'ttq');
    `;
    document.head.appendChild(inline);
  }

  if (integracoes.clarity && !window.clarity) {
    const inline = document.createElement('script');
    inline.innerHTML = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${integracoes.clarity}");
    `;
    document.head.appendChild(inline);
  }

  if (integracoes.custom_head && !document.getElementById('custom-head')) {
    const div = document.createElement('div');
    div.id = 'custom-head';
    div.innerHTML = integracoes.custom_head;
    Array.from(div.childNodes).forEach(n => document.head.appendChild(n));
  }
}

const emPreview = () => {
  try { return new URLSearchParams(window.location.search).has('preview'); } catch { return false; }
};

export function dispararEvento(nome, payload = {}) {
  if (typeof window === 'undefined') return;
  if (emPreview()) return; // teste no preview não polui Meta/GA
  try { window.gtag?.('event', nome, payload); } catch {}
  try { window.fbq?.('trackCustom', nome, payload); } catch {}
  try { window.ttq?.track(nome, payload); } catch {}
  try { window.clarity?.('event', nome); } catch {}
  try { window.dataLayer?.push({ event: nome, ...payload }); } catch {}
}
