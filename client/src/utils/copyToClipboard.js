const copyToClipboard = async (text) => {
  if (typeof window === 'undefined' || !text) {
    return false;
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (clipboardError) {
    console.warn('navigator.clipboard.writeText failed, falling back to execCommand', clipboardError);
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (fallbackError) {
    console.error('copyToClipboard fallback failed', fallbackError);
    return false;
  }
};

export default copyToClipboard;
