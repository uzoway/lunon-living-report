/** Speaks a short status message through the page's polite live region. */
export function announce(message: string) {
  const region = document.getElementById('announcer');
  if (!region) return;
  region.textContent = '';
  // Setting the text a frame later makes a repeated message announce again.
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}
