'use client'

import '@/styles/theme.css'

const themeScript = `
(function() {
  try {
    var mode = localStorage.getItem('villains-theme') || 'light';
    var resolved = mode;
    if (mode === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.remove('light','dark');
    document.documentElement.classList.add(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  } catch(e) {
    document.documentElement.classList.add('light');
  }
})();
`

/** Portal layout — no AuthProvider, no sidebar, no topbar */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children
}
