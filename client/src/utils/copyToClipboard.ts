function copyViaExecCommand(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    ok ? resolve() : reject(new Error('execCommand copy failed'));
  });
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => copyViaExecCommand(text));
  }
  return copyViaExecCommand(text);
}
