export const copyTextToClipboard = async (text: string) => {
  if (!navigator.clipboard?.writeText) {
    throw new Error('当前设备不支持复制到剪贴板');
  }

  await navigator.clipboard.writeText(text);
};
